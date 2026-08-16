import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const RAW_SUFFIX = '.css?raw'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    logLevel: 'silent',
    outExtensions: () => ({ js: '.js' }),
    dts: false,
    clean: false,
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    logLevel: 'silent',
    dts: false,
    sourcemap: true,
    clean: false,
    external: ['react', 'react/jsx-runtime'],
    noExternal: id => id === 'react' || id === 'react/jsx-runtime' ? undefined : true,
    plugins: [{
      name: 'dsh-companion-css-raw',
      resolveId(source, importer) {
        if (!source.endsWith(RAW_SUFFIX) || importer === undefined) return null
        return resolve(dirname(importer), source.slice(0, -4)) + '?dsh-companion-raw'
      },
      async load(id) {
        if (!id.endsWith('?dsh-companion-raw')) return null
        const css = await readFile(id.slice(0, -'?dsh-companion-raw'.length), 'utf8')
        return `export default ${JSON.stringify(css)}`
      },
    }],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-companion", factory: (require) => {',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
