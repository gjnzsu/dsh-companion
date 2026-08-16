import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const json = execFileSync('pnpm', ['pack', '--json', '--pack-destination', mkdtempSync(join(tmpdir(), 'dsh-companion-pack-'))], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
})
const start = Math.max(json.lastIndexOf('\n{'), json.lastIndexOf('\n[')) + 1
const packed = JSON.parse(json.slice(start))
const [{ filename, files }] = Array.isArray(packed) ? packed : [packed]
const names = new Set(files.map(file => file.path))
for (const required of ['package.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js', 'lib/types/index.d.ts', 'lib/types/client/index.d.ts', 'LICENSE']) {
  if (!names.has(required)) throw new Error(`packed file missing: ${required}`)
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') throw new Error('dsh.bundle.patch is incorrect')
if (manifest.dsh?.client?.platform !== 'web') throw new Error('dsh.client.platform is incorrect')
const host = await import(new URL('../lib/index.js', import.meta.url))
if (typeof host.apply !== 'function') throw new Error('built host apply export missing')
host.apply()
console.log(`verified ${filename}`)
