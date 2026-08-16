import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from 'vitest'
import {
  assertCompanionDump,
  childEnvironment,
  cleanupSmokeRun,
  commandPrefix,
  dshProcessOptions,
  observeChildFailure,
  packedTarballPath,
  requestRecordedSmokeCleanup,
  runtimeCommand,
  terminateOwnedProcess,
} from '../scripts/prepare-dsh-smoke.mjs'

test('captures asynchronous DSH failures as soon as the child is spawned', async () => {
  const spawnFailure = new EventEmitter()
  const spawnError = new Error('spawn ENOENT')
  const failedSpawn = observeChildFailure(spawnFailure)
  spawnFailure.emit('error', spawnError)
  await expect(failedSpawn).rejects.toBe(spawnError)

  const signalledChild = new EventEmitter()
  const signalledExit = observeChildFailure(signalledChild)
  signalledChild.emit('exit', null, 'SIGTERM')
  await expect(signalledExit).rejects.toThrow('signal SIGTERM')
})

test('selects the supported installed and source-checkout DSH command prefixes', () => {
  expect(commandPrefix({})).toEqual(['dsh'])
  expect(commandPrefix(
    { DSH_REPO: 'C:\\SourceCode\\deepseek-harness' },
    'C:\\Node Runtime\\node.exe',
    () => 'C:\\SourceCode\\deepseek-harness\\node_modules\\tsx\\dist\\esm\\index.mjs',
  )).toEqual([
    'C:\\Node Runtime\\node.exe',
    '--import',
    'C:\\SourceCode\\deepseek-harness\\node_modules\\tsx\\dist\\esm\\index.mjs',
    'C:\\SourceCode\\deepseek-harness\\apps\\cli\\src\\bin.ts',
  ])
})

test('builds a child environment without reading or forwarding credential-shaped variables', () => {
  const source = new Proxy({
    PATH: 'fixture-path',
    DSH_REPO: 'C:\\SourceCode\\deepseek-harness',
    DeepSeek_Api_Key: 'must-not-be-read',
    OPENAI_API_KEY: 'must-not-be-read',
    client_secret: 'must-not-be-read',
    Gh_ToKeN: 'must-not-be-read',
    database_PASSWORD: 'must-not-be-read',
  }, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /KEY|SECRET|TOKEN|PASSWORD/i.test(property)) {
        throw new Error(`credential variable ${property} was read`)
      }
      return Reflect.get(target, property, receiver)
    },
  })

  expect(childEnvironment(source, 'C:\\owned-smoke-home')).toEqual({
    PATH: 'fixture-path',
    DSH_REPO: 'C:\\SourceCode\\deepseek-harness',
    DSH_HOME: 'C:\\owned-smoke-home',
  })
})

test('keeps a source checkout dotenv outside the DSH CLI working directory', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dsh-companion-cwd-test-'))
  const repository = join(fixtureRoot, 'harness-source')
  const dshHome = join(fixtureRoot, 'isolated-home')
  mkdirSync(repository)
  mkdirSync(dshHome)
  writeFileSync(join(repository, '.env'), 'OPENAI_API_KEY=file-layer-secret\n')

  try {
    const options = dshProcessOptions({ DSH_REPO: repository, OPENAI_API_KEY: 'ambient-secret' }, dshHome)
    expect(options.cwd).toBe(dshHome)
    expect(options.env).not.toHaveProperty('OPENAI_API_KEY')
    expect(existsSync(join(repository, '.env'))).toBe(true)
    expect(existsSync(join(options.cwd, '.env'))).toBe(false)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('requests and observes cleanup only for the current owned smoke home', async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dsh-companion-cleanup-test-'))
  const dshHome = mkdtempSync(join(fixtureRoot, 'dsh-companion-smoke-'))
  const statePath = join(fixtureRoot, 'state.json')
  writeFileSync(statePath, JSON.stringify({ controlPath: statePath, dshHome }))

  try {
    const cleanup = requestRecordedSmokeCleanup({ statePath, tempRoot: fixtureRoot })
    await expect.poll(() => existsSync(`${statePath}.stop`)).toBe(true)
    rmSync(dshHome, { recursive: true, force: true })
    rmSync(statePath, { force: true })
    await expect(cleanup).resolves.toBe(true)
    expect(existsSync(dshHome)).toBe(false)
    expect(existsSync(statePath)).toBe(false)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('refuses cleanup metadata whose home is outside the owned temp root', async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dsh-companion-cleanup-test-'))
  const statePath = join(fixtureRoot, 'state.json')
  writeFileSync(statePath, JSON.stringify({
    controlPath: statePath,
    dshHome: join(tmpdir(), 'not-an-owned-smoke-home'),
  }))

  try {
    await expect(requestRecordedSmokeCleanup({ statePath, tempRoot: fixtureRoot }))
      .rejects.toThrow('cleanup state does not name the current owned smoke home')
    expect(existsSync(statePath)).toBe(true)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('runs pnpm through its JavaScript entry without a Windows shell when available', () => {
  expect(runtimeCommand(['pnpm', '--dir', 'C:\\dsh', 'dsh'], {
    npm_execpath: 'C:\\pnpm\\pnpm.cjs',
  }, 'C:\\node\\node.exe')).toEqual({
    command: 'C:\\node\\node.exe',
    args: ['C:\\pnpm\\pnpm.cjs', '--dir', 'C:\\dsh', 'dsh'],
    shell: false,
  })
})

test('resolves an installed Windows command shim without interpreting metacharacters', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dsh-companion-command-test-'))
  const entry = join(fixtureRoot, 'node_modules', 'dsh', 'bin.mjs')
  mkdirSync(join(fixtureRoot, 'node_modules', 'dsh'), { recursive: true })
  writeFileSync(entry, '')
  writeFileSync(join(fixtureRoot, 'dsh.cmd'), [
    '@ECHO off',
    'SET dp0=%~dp0',
    '"node" "%dp0%\\node_modules\\dsh\\bin.mjs" %*',
  ].join('\n'))

  try {
    expect(runtimeCommand(
      ['dsh', 'plugin', 'add', 'C:\\Temp\\plugin & untouched.tgz'],
      { PATH: fixtureRoot },
      'C:\\Node Runtime\\node.exe',
      'win32',
    )).toEqual({
      command: 'C:\\Node Runtime\\node.exe',
      args: [entry, 'plugin', 'add', 'C:\\Temp\\plugin & untouched.tgz'],
      shell: false,
    })
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test.each([
  ['failed escalation', [1, 5]],
  ['stale process after successful commands', [0, 0]],
] as const)('fails closed when Windows teardown cannot prove quiescence after %s', async (_case, statuses) => {
  const child = Object.assign(new EventEmitter(), {
    exitCode: null,
    signalCode: null,
    pid: 4_242,
  })
  const taskkillArgs: string[][] = []
  let attempt = 0

  await expect(terminateOwnedProcess(child, {
    platform: 'win32',
    runTaskkill(args: string[]) {
      taskkillArgs.push(args)
      return { status: statuses[attempt++] }
    },
    wait: async () => false,
  })).rejects.toThrow(/could not prove DSH Web process tree 4242 reached quiescence/)
  expect(taskkillArgs).toEqual([
    ['/PID', '4242', '/T'],
    ['/PID', '4242', '/T', '/F'],
  ])
})

test('does not accept a root exit when Windows tree termination failed', async () => {
  const child = Object.assign(new EventEmitter(), {
    exitCode: null,
    signalCode: null,
    pid: 4_243,
  })

  await expect(terminateOwnedProcess(child, {
    platform: 'win32',
    runTaskkill: () => ({ status: 1 }),
    wait: async () => true,
  })).rejects.toThrow(/could not prove DSH Web process tree 4243 reached quiescence/)
})

test('retains the owned home and control state when teardown is not quiescent', async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dsh-companion-retained-cleanup-test-'))
  const dshHome = join(fixtureRoot, 'dsh-companion-smoke-retained')
  const statePath = join(fixtureRoot, 'control.json')
  mkdirSync(dshHome)
  writeFileSync(statePath, JSON.stringify({ controlPath: statePath, dshHome }))

  try {
    await expect(cleanupSmokeRun({ app: {}, dshHome, statePath }, {
      terminate: async () => { throw new Error('process tree is still live') },
    })).rejects.toThrow('process tree is still live')
    expect(existsSync(dshHome)).toBe(true)
    expect(existsSync(statePath)).toBe(true)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('requires the installed companion row in the composed Web profile', () => {
  expect(() => assertCompanionDump('- id: dsh-companion\n  name: dsh-companion\n')).not.toThrow()
  expect(() => assertCompanionDump('- id: dsh-companion\n  name: something-else\n'))
    .toThrow('dumped Web profile does not contain the dsh-companion row')
})

test('accepts pnpm pack JSON only when it identifies one tarball inside the owned directory', () => {
  const destination = resolve(tmpdir(), 'smoke-home')
  const tarball = join(destination, 'dsh-companion-0.1.0.tgz')
  const output = 'prepare output\n' + JSON.stringify({ filename: tarball })
  expect(packedTarballPath(output, destination)).toBe(tarball)
  expect(() => packedTarballPath(JSON.stringify({ filename: resolve(tmpdir(), 'elsewhere', 'other.tgz') }), destination))
    .toThrow('pnpm pack returned a tarball outside the smoke directory')
})
