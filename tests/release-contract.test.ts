import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version?: string
  repository?: { type?: string, url?: string }
  homepage?: string
  bugs?: { url?: string }
  keywords?: string[]
  files?: string[]
  publishConfig?: { access?: string, registry?: string }
  dsh?: { client?: { inject?: unknown } }
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  devDependencies?: Record<string, string>
}
const chineseReadme = readFileSync('README.md', 'utf8')
const englishReadme = readFileSync('README.en.md', 'utf8')

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

test('describes output as accumulated provider-reported usage', () => {
  expect(englishReadme).toContain('| Output | The accumulated provider-reported output-token count |')
  expect(englishReadme).not.toContain('projected output-token count')
  expect(chineseReadme).toContain('供应商已报告并累计的 output token 数')
})

test('provides Chinese-first and English README entry points', () => {
  expect(chineseReadme).toContain('[English](./README.en.md) | 简体中文')
  expect(englishReadme).toContain('English | [简体中文](./README.md)')
  expect(chineseReadme).toContain('docs/assets/dsh-companion-state-matrix.png')
  expect(englishReadme).toContain('docs/assets/dsh-companion-state-matrix.png')
})

test('documents the published registry installation for the patch release', () => {
  expect(manifest.version).toBe('0.1.1')
  expect(chineseReadme).toContain('dsh plugin --profile web add dsh-companion')
  expect(englishReadme).toContain('dsh plugin --profile web add dsh-companion')
  expect(chineseReadme).not.toContain('尚未发布到 npm')
  expect(englishReadme).not.toContain('not published to npm yet')
})

test('publishes with discoverable public package metadata', () => {
  expect(manifest.repository).toEqual({
    type: 'git',
    url: 'git+https://github.com/gjnzsu/dsh-companion.git',
  })
  expect(manifest.homepage).toBe('https://github.com/gjnzsu/dsh-companion#readme')
  expect(manifest.bugs?.url).toBe('https://github.com/gjnzsu/dsh-companion/issues')
  expect(manifest.keywords).toEqual(expect.arrayContaining(['deepseek-harness', 'dsh-plugin']))
  expect(manifest.files).toContain('README.en.md')
  expect(manifest.publishConfig?.access).toBe('public')
  expect(manifest.publishConfig?.registry).toBe('https://registry.npmjs.org/')
})
