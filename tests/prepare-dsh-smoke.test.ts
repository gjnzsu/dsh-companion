import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from 'vitest'
import {
  assertCompanionDump,
  childEnvironment,
  commandPrefix,
  observeChildFailure,
  packedTarballPath,
  requestRecordedSmokeCleanup,
  runtimeCommand,
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
  expect(commandPrefix({ DSH_REPO: 'C:\\SourceCode\\deepseek-harness' })).toEqual([
    'pnpm',
    '--dir',
    'C:\\SourceCode\\deepseek-harness',
    'dsh',
  ])
})

test('builds a child environment without reading or forwarding the API key', () => {
  const source = new Proxy({ PATH: 'fixture-path', DeepSeek_Api_Key: 'must-not-be-read' }, {
    get(target, property, receiver) {
      if (typeof property === 'string' && property.toUpperCase() === 'DEEPSEEK_API_KEY') {
        throw new Error('API key was read')
      }
      return Reflect.get(target, property, receiver)
    },
  })

  expect(childEnvironment(source, 'C:\\owned-smoke-home')).toEqual({
    PATH: 'fixture-path',
    DSH_HOME: 'C:\\owned-smoke-home',
  })
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
