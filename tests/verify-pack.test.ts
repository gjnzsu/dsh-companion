import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { runtimeCommand } from '../scripts/prepare-dsh-smoke.mjs'

test('routes the Windows pack fallback through the argv-safe shim resolver', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dsh-companion-&-pack-command-'))
  const entry = join(fixtureRoot, 'pnpm.cjs')
  const destination = join(fixtureRoot, 'output & evidence')
  mkdirSync(destination)
  writeFileSync(entry, '')
  writeFileSync(join(fixtureRoot, 'pnpm.cmd'), [
    '@ECHO off',
    'SET dp0=%~dp0',
    '"node" "%dp0%\\pnpm.cjs" %*',
  ].join('\n'))

  try {
    expect(existsSync(destination)).toBe(true)
    expect(runtimeCommand(
      ['pnpm', 'pack', '--pack-destination', destination],
      { PATH: fixtureRoot },
      'C:\\Node Runtime\\node.exe',
      'win32',
    )).toEqual({
      command: 'C:\\Node Runtime\\node.exe',
      args: [entry, 'pack', '--pack-destination', destination],
      shell: false,
    })

    const verifier = readFileSync('scripts/verify-pack.mjs', 'utf8')
    expect(verifier).toContain("runtimeCommand(['pnpm', 'pack'")
    expect(verifier).not.toContain('shell: pnpmEntry === undefined')
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})
