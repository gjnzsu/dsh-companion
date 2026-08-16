import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dsh?: { client?: { inject?: unknown } }
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  devDependencies?: Record<string, string>
}

test('leaves host and host-injected modules out of install-time dependencies', () => {
  expect(manifest.dsh?.client?.inject).toEqual([
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-client-ui-layout',
  ])

  const installDependencies = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  }
  expect(Object.keys(installDependencies).filter(name => name.startsWith('@deepseek-ai/'))).toEqual([])
})

test('keeps the published client declarations independent of unpublished DSH packages', () => {
  const source = readFileSync('src/client/index.ts', 'utf8')
  expect(source).not.toContain("from '@deepseek-ai/")
  expect(source).toContain("from './dsh-contract.ts'")
})
