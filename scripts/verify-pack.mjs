import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runtimeCommand } from './prepare-dsh-smoke.mjs'

const packDirectory = mkdtempSync(join(tmpdir(), 'dsh-companion-pack-'))
const runtime = runtimeCommand(['pnpm', 'pack', '--json', '--pack-destination', packDirectory], process.env)
let json
try {
  json = execFileSync(runtime.command, runtime.args, {
    encoding: 'utf8',
    shell: runtime.shell,
    windowsHide: true,
  })
} finally {
  // The file list is returned in stdout; no verifier artifact needs to survive.
  rmSync(packDirectory, { recursive: true, force: true })
}
const start = Math.max(json.lastIndexOf('\n{'), json.lastIndexOf('\n[')) + 1
const packed = JSON.parse(json.slice(start))
const [{ filename, files }] = Array.isArray(packed) ? packed : [packed]
const names = new Set(files.map(file => file.path))
for (const required of ['package.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js', 'lib/types/index.d.ts', 'lib/types/client/index.d.ts', 'LICENSE', 'README.md']) {
  if (!names.has(required)) throw new Error(`packed file missing: ${required}`)
}
for (const name of names) {
  if (/^lib\/types\/.*\.js$/.test(name)) throw new Error(`packed type directory contains runtime JavaScript: ${name}`)
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') throw new Error('dsh.bundle.patch is incorrect')
if (manifest.dsh?.client?.platform !== 'web') throw new Error('dsh.client.platform is incorrect')
const host = await import(new URL('../lib/index.js', import.meta.url))
if (typeof host.apply !== 'function') throw new Error('built host apply export missing')
host.apply()
console.log(`verified ${filename}`)
