import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync,
} from 'node:fs'
import { connect } from 'node:net'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HOST = '127.0.0.1'
const PORT = 4174
const URL = `http://${HOST}:${PORT}`
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Select the installed or source-checkout DSH command prefix. */
export function commandPrefix(
  environment,
  nodeExecutable = process.execPath,
  resolveTsxLoader = repository => createRequire(join(repository, 'package.json')).resolve('tsx/esm'),
) {
  if (environment.DSH_REPO === undefined) return ['dsh']
  const repository = resolve(environment.DSH_REPO)
  return [
    nodeExecutable,
    '--import',
    resolveTsxLoader(repository),
    join(repository, 'apps', 'cli', 'src', 'bin.ts'),
  ]
}

/** Copy non-credential child variables without reading credential-shaped values. */
export function childEnvironment(source, dshHome) {
  const environment = {}
  for (const key of Object.keys(source)) {
    const normalizedKey = key.toUpperCase()
    if (/KEY|SECRET|TOKEN|PASSWORD/.test(normalizedKey) || normalizedKey === 'NO_COLOR'
      || normalizedKey === 'DSH_COMPANION_SMOKE_CONTROL') continue
    const value = source[key]
    if (value !== undefined) environment[key] = value
  }
  environment.DSH_HOME = dshHome
  return environment
}

/** Build the environment and working directory shared by DSH CLI invocations. */
export function dshProcessOptions(source, dshHome) {
  return { cwd: resolve(dshHome), env: childEnvironment(source, dshHome) }
}

function writeSmokeState(statePath, state) {
  mkdirSync(dirname(statePath), { recursive: true })
  const pendingPath = `${statePath}.pending`
  writeFileSync(pendingPath, `${JSON.stringify(state)}\n`, 'utf8')
  renameSync(pendingPath, statePath)
}

function clearSmokeState(statePath, dshHome) {
  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, 'utf8'))
    if (state?.dshHome !== dshHome || state?.controlPath !== statePath) return
  }
  rmSync(statePath, { force: true })
  rmSync(`${statePath}.pending`, { force: true })
  rmSync(`${statePath}.stop`, { force: true })
}

function recordedSmokeState(statePath, tempRoot) {
  const value = JSON.parse(readFileSync(statePath, 'utf8'))
  const dshHome = typeof value?.dshHome === 'string' ? resolve(value.dshHome) : undefined
  const ownsHome = dshHome !== undefined
    && dirname(dshHome) === resolve(tempRoot)
    && basename(dshHome).startsWith('dsh-companion-smoke-')
  if (value?.controlPath !== resolve(statePath) || !ownsHome) {
    throw new Error('cleanup state does not name the current owned smoke home')
  }
  return { dshHome }
}

async function removeOwnedSmokeHome(dshHome) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      rmSync(dshHome, { recursive: true, force: true })
      return
    } catch (error) {
      if (!['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error?.code) || attempt === 19) throw error
      await delay(100)
    }
  }
}

/** Ask the current preparer to stop, then wait for its owned cleanup. */
export async function requestRecordedSmokeCleanup({
  statePath,
  tempRoot = tmpdir(),
  timeoutMilliseconds = 15_000,
} = {}) {
  if (typeof statePath !== 'string') throw new Error('smoke cleanup requires its unique control path')
  if (!existsSync(statePath)) return false
  const state = recordedSmokeState(statePath, tempRoot)
  const stopPath = `${statePath}.stop`
  try {
    writeFileSync(stopPath, 'stop\n', { encoding: 'utf8', flag: 'wx' })
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
  const deadline = Date.now() + timeoutMilliseconds
  while (Date.now() < deadline) {
    if (!existsSync(statePath) && !existsSync(state.dshHome)) return true
    await delay(50)
  }
  throw new Error(`smoke preparer did not clean ${state.dshHome} within ${timeoutMilliseconds}ms`)
}

function environmentValue(environment, name) {
  const key = Object.keys(environment).find(candidate => candidate.toUpperCase() === name)
  return key === undefined ? undefined : environment[key]
}

function resolveWindowsCommand(command, args, environment, nodeExecutable) {
  const pathValue = environmentValue(environment, 'PATH')
  const directories = isAbsolute(command)
    ? [dirname(command)]
    : typeof pathValue === 'string' ? pathValue.split(';').filter(Boolean) : []
  const commandName = isAbsolute(command) ? basename(command) : command
  const candidates = /\.(?:cmd|exe)$/i.test(commandName)
    ? directories.map(directory => join(directory, commandName))
    : directories.flatMap(directory => [join(directory, `${commandName}.exe`), join(directory, `${commandName}.cmd`)])

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    if (/\.exe$/i.test(candidate)) return { command: candidate, args, shell: false }
    const contents = readFileSync(candidate, 'utf8')
    const match = contents.match(/["']?(?:%dp0%|%~dp0)[\\/]([^"\r\n]+?\.(?:cjs|mjs|js))["']?\s+%\*/i)
    if (match?.[1] === undefined) {
      throw new Error(`cannot safely resolve the JavaScript entry from Windows command shim ${candidate}`)
    }
    const entry = resolve(dirname(candidate), ...match[1].split(/[\\/]+/))
    if (!existsSync(entry)) throw new Error(`Windows command shim entry does not exist: ${entry}`)
    const localNode = join(dirname(candidate), 'node.exe')
    return {
      command: existsSync(localNode) ? localNode : nodeExecutable,
      args: [entry, ...args],
      shell: false,
    }
  }
  throw new Error(`cannot safely resolve Windows command ${JSON.stringify(command)} from PATH`)
}

/** Resolve a logical command without routing argument arrays through a shell. */
export function runtimeCommand(prefix, environment, nodeExecutable = process.execPath, platform = process.platform) {
  const [command, ...args] = prefix
  if (command === undefined) throw new Error('cannot run an empty command prefix')
  if (command === 'pnpm' && typeof environment.npm_execpath === 'string') {
    return {
      command: nodeExecutable,
      args: [environment.npm_execpath, ...args],
      shell: false,
    }
  }
  if (platform === 'win32') return resolveWindowsCommand(command, args, environment, nodeExecutable)
  return { command, args, shell: false }
}

/** Require the packed bundle's row in the effective Web profile. */
export function assertCompanionDump(dump) {
  const hasId = /^\s*-?\s*id:\s*dsh-companion\s*$/mu.test(dump)
  const hasName = /^\s*name:\s*dsh-companion\s*$/mu.test(dump)
  if (!hasId || !hasName) throw new Error('dumped Web profile does not contain the dsh-companion row')
}

/** Resolve one pnpm-pack result and keep it inside the owned smoke directory. */
export function packedTarballPath(output, destination) {
  const start = Math.max(output.lastIndexOf('\n{'), output.lastIndexOf('\n[')) + 1
  const parsed = JSON.parse(output.slice(start))
  const results = Array.isArray(parsed) ? parsed : [parsed]
  if (results.length !== 1 || typeof results[0]?.filename !== 'string') {
    throw new Error('pnpm pack did not return exactly one tarball')
  }
  const tarball = isAbsolute(results[0].filename)
    ? resolve(results[0].filename)
    : resolve(destination, results[0].filename)
  const withinDestination = relative(resolve(destination), tarball)
  if (withinDestination === '..' || withinDestination.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
    || isAbsolute(withinDestination)) {
    throw new Error('pnpm pack returned a tarball outside the smoke directory')
  }
  return tarball
}

function run(command, args, options) {
  const runtime = runtimeCommand([command, ...args], options.env)
  const result = spawnSync(runtime.command, runtime.args, {
    ...options,
    encoding: 'utf8',
    shell: runtime.shell,
    windowsHide: true,
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} exited ${result.status ?? 'without a status'}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'))
  }
  return result.stdout
}

function runDsh(prefix, args, options) {
  const [command, ...prefixArgs] = prefix
  return run(command, [...prefixArgs, ...args], options)
}

function spawnDsh(prefix, args, options) {
  const runtime = runtimeCommand([...prefix, ...args], options.env)
  return spawn(runtime.command, runtime.args, {
    ...options,
    detached: process.platform !== 'win32',
    shell: runtime.shell,
    windowsHide: true,
  })
}

function delay(milliseconds) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))
}

/** Capture a spawned DSH child's asynchronous failure before any other await. */
export function observeChildFailure(child) {
  return new Promise((_, rejectFailure) => {
    const onError = error => {
      child.removeListener('exit', onExit)
      rejectFailure(error)
    }
    const onExit = (code, signal) => {
      child.removeListener('error', onError)
      const reason = signal === null
        ? `code ${code ?? 'unknown'}`
        : `signal ${signal}`
      rejectFailure(new Error(`DSH Web exited unexpectedly (${reason})`))
    }
    child.once('error', onError)
    child.once('exit', onExit)
  })
}

function createShutdownRequest(stopPath) {
  let requested = false
  let resolveRequest
  const promise = new Promise(resolveShutdown => { resolveRequest = resolveShutdown })
  const request = () => {
    if (requested) return
    requested = true
    resolveRequest()
  }
  process.once('SIGINT', request)
  process.once('SIGTERM', request)
  const timer = setInterval(() => {
    if (existsSync(stopPath)) request()
  }, 50)
  return {
    get requested() { return requested },
    promise,
    dispose() {
      clearInterval(timer)
      process.removeListener('SIGINT', request)
      process.removeListener('SIGTERM', request)
    },
  }
}

async function acceptsConnection() {
  return await new Promise(resolveConnection => {
    const socket = connect({ host: HOST, port: PORT })
    const finish = accepted => {
      socket.removeAllListeners()
      socket.destroy()
      resolveConnection(accepted)
    }
    socket.setTimeout(500, () => finish(false))
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
  })
}

async function waitForServer(child, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      const reason = child.signalCode === null
        ? `code ${child.exitCode}`
        : `signal ${child.signalCode}`
      throw new Error(`DSH Web exited before accepting connections (${reason})`)
    }
    if (await acceptsConnection()) return
    await delay(100)
  }
  throw new Error(`DSH Web did not accept connections at ${URL} within ${timeoutMilliseconds}ms`)
}

async function waitForExit(child, timeoutMilliseconds) {
  if (child.exitCode !== null || child.signalCode !== null) return true
  return await Promise.race([
    new Promise(resolveExit => child.once('exit', () => resolveExit(true))),
    delay(timeoutMilliseconds).then(() => false),
  ])
}

/** Stop the owned DSH process tree using native argv operations. */
export async function terminateOwnedProcess(child, {
  platform = process.platform,
  runTaskkill = args => spawnSync('taskkill', args, { stdio: 'ignore', windowsHide: true }),
  killProcessGroup = (pid, signal) => process.kill(-pid, signal),
  wait = waitForExit,
} = {}) {
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) return
  if (child.pid === undefined) throw new Error('could not prove the spawned DSH Web process reached quiescence because it has no process id')
  const attempts = []
  let windowsTreeTerminationSucceeded = false
  const taskkill = args => {
    const label = `taskkill ${args.join(' ')}`
    try {
      const result = runTaskkill(args)
      if (result?.error !== undefined) return { description: `${label} failed: ${result.error.message}`, succeeded: false }
      return { description: `${label} exited ${result?.status ?? 'without a status'}`, succeeded: result?.status === 0 }
    } catch (error) {
      return { description: `${label} threw ${error instanceof Error ? error.message : String(error)}`, succeeded: false }
    }
  }
  const runWindowsTermination = args => {
    const result = taskkill(args)
    attempts.push(result.description)
    windowsTreeTerminationSucceeded ||= result.succeeded
  }
  const failQuiescence = () => {
    const detail = attempts.length === 0 ? 'native process-group termination did not produce an exit event' : attempts.join('; ')
    return new Error(`could not prove DSH Web process tree ${child.pid} reached quiescence: ${detail}`)
  }
  if (platform === 'win32') {
    runWindowsTermination(['/PID', String(child.pid), '/T'])
  } else {
    try {
      killProcessGroup(child.pid, 'SIGTERM')
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error
    }
  }
  if (await wait(child, 7_000)) {
    if (platform !== 'win32' || windowsTreeTerminationSucceeded) return
    throw failQuiescence()
  }
  if (platform === 'win32') {
    runWindowsTermination(['/PID', String(child.pid), '/T', '/F'])
  } else {
    try {
      killProcessGroup(child.pid, 'SIGKILL')
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error
    }
  }
  if (await wait(child, 2_000) && (platform !== 'win32' || windowsTreeTerminationSucceeded)) return
  throw failQuiescence()
}

/** Remove smoke resources only after the owned server has stopped. */
export async function cleanupSmokeRun({ app, dshHome, statePath }, {
  terminate = terminateOwnedProcess,
  removeHome = removeOwnedSmokeHome,
  clearState = clearSmokeState,
} = {}) {
  await terminate(app)
  await removeHome(dshHome)
  clearState(statePath, dshHome)
}

async function main() {
  const dshHome = mkdtempSync(join(tmpdir(), 'dsh-companion-smoke-'))
  const configuredControl = environmentValue(process.env, 'DSH_COMPANION_SMOKE_CONTROL')
  const statePath = typeof configuredControl === 'string'
    ? resolve(configuredControl)
    : join(tmpdir(), `dsh-companion-smoke-control-${randomUUID()}.json`)
  const dshOptions = dshProcessOptions(process.env, dshHome)
  const environment = dshOptions.env
  const prefix = commandPrefix(process.env)
  let app
  writeSmokeState(statePath, { controlPath: statePath, dshHome })
  const shutdown = createShutdownRequest(`${statePath}.stop`)
  try {
    const packOutput = run('pnpm', ['pack', '--json', '--pack-destination', dshHome], {
      cwd: projectRoot,
      env: environment,
    })
    await delay(0)
    if (shutdown.requested) return
    const tarball = packedTarballPath(packOutput, dshHome)
    runDsh(prefix, ['plugin', '--profile', 'web', 'add', tarball], {
      ...dshOptions,
    })
    await delay(0)
    if (shutdown.requested) return
    const dump = runDsh(prefix, ['--profile', 'web', '--dump-config'], {
      ...dshOptions,
    })
    assertCompanionDump(dump)
    await delay(0)
    if (shutdown.requested) return

    app = spawnDsh(prefix, ['--profile', 'web', '--port', String(PORT)], {
      ...dshOptions,
      stdio: 'inherit',
    })
    const appFailure = observeChildFailure(app)
    const ready = await Promise.race([
      waitForServer(app, 120_000).then(() => true),
      shutdown.promise.then(() => false),
      appFailure,
    ])
    if (!ready) return
    process.stdout.write(`${JSON.stringify({ pid: app.pid, url: URL, dshHome })}\n`)

    await Promise.race([
      shutdown.promise,
      appFailure,
    ])
  } finally {
    shutdown.dispose()
    await cleanupSmokeRun({ app, dshHome, statePath })
  }
}

const invokedPath = process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href
if (invokedPath === import.meta.url) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
