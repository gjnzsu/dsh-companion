# DSH Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and package a browser-only DSH Web companion that visualizes the selected session's activity and context pressure as a friendly Living Data Orb with on-demand usage details.

**Architecture:** The npm bundle contributes an empty host plugin and a DSH client entry registered in the root-scoped `shell.overlay` slot. The overlay reads the current `SessionSummary` through the framework-supplied `useSessions` hook, passes a small structural input through a pure derivation function, and keeps only transient presentation state in React; browser preferences persist position and collapsed state. A shared synthetic scenario catalog drives component tests, a credential-free gallery, and deterministic Playwright screenshots, while a final smoke test mounts the packed plugin in the official DSH Web fixture.

**Tech Stack:** TypeScript 5.9+, React 18, DeepSeek Harness `0.1.0-rc.5` client APIs, tsdown, Vitest, Testing Library, Vite, Playwright, pnpm 11, Node `^22.19.0 || >=24.0.0`.

## Global Constraints

- Package, repository, bundle id, and npm name are `dsh-companion`; initial version is `0.1.0`; license is MIT.
- Target `@deepseek-ai/*` version `0.1.0-rc.5` exactly; later Harness release candidates are outside the compatibility promise.
- DSH Web is the only runtime surface; register exactly one entry in `shell.overlay` with `id: 'dsh-companion'`.
- The plugin is observational: no host service, new session event, log scan, polling, telemetry, prompt inspection, tool-output inspection, credential access, provider-account access, or model request mutation.
- The currently selected session is the only session observed. `pendingInteraction` takes precedence over `running`.
- Context pressure uses `projectedTokens / contextWindow`; attention starts at 70%, warning starts at 85%, display caps at 100%, and missing or invalid data remains unknown.
- Billed input equals uncached input plus cache reads plus cache writes; cache hit is cache reads divided by billed input, rounded to an integer and omitted when billed input is zero.
- Missing projection values are omitted, never represented as fabricated zeros.
- Product copy is English for `0.1.0`; state is also communicated by expression and accessible text, never color alone.
- Respect `prefers-reduced-motion`; no flashing animation.
- Use TDD for every behavior task and commit after every independently reviewable deliverable.
- Treat [Product Design](../../product/product-design.md), [Visual Design](../../product/visual-design.md), and [Architecture](../../architecture.md) as the public normative references; update the owning document when implementation changes an approved product, visual, or architectural rule.

## Confirmed Execution Amendments

- Task 1 creates and tests a minimal `src/client/index.ts` that registers a placeholder in `shell.overlay`. This makes `lib/client.js`, packed installation, and the highest-risk DSH integration seam provable before product UI work. Task 6 replaces the placeholder with the selected-session adapter and real `Companion`.
- The gallery drives the real `Companion` through its public interactions to reach pinned state. It must not add a production prop or other test-only API for controlling `pinned`.
- The release boundary is a verified installable tarball and release-ready repository. This plan does not publish to npm or create a GitHub remote.

---

## Planned File Map

| Path | Responsibility |
| --- | --- |
| `package.json` | npm bundle metadata, DSH client declaration, scripts, runtime/dev dependencies, packed-file allowlist |
| `cordis.patch.yml` | Insert the no-op host row that activates the package and discovers its client half |
| `tsconfig.json` | Strict source and declaration compilation |
| `tsdown.config.ts` | Build the host ESM entry and DSH closure-factory client artifact; inline the companion stylesheet as text |
| `vitest.config.ts` | jsdom component/unit test configuration |
| `playwright.visual.config.ts` | Deterministic gallery screenshot server and browser settings |
| `playwright.smoke.config.ts` | Packed-plugin DSH Web smoke server and browser settings |
| `src/index.ts` | Empty host `apply()` required by the bundle row |
| `src/client/types.ts` | Structural projection input and `CompanionViewModel` types |
| `src/client/derive-state.ts` | Pure activity, pressure, and usage derivation |
| `src/client/preferences.ts` | Validated local position/collapsed-state persistence and viewport clamping |
| `src/client/styles.ts` | Mount and dispose the bundled CSS text exactly once per plugin fiber |
| `src/client/companion.css` | Orb, state, popover, collapsed tab, drag, themes, and reduced-motion presentation |
| `src/client/DataOrb.tsx` | Accessible friendly orb button with state-specific face and particles |
| `src/client/UsagePopover.tsx` | Available-only context and usage rows |
| `src/client/Companion.tsx` | Hover/pin, celebration timer, dragging, collapse/restore, outside click, Escape, session-switch cleanup |
| `src/client/index.ts` | `shell.overlay` registration and `useSessions` adapter |
| `tests/derive-state.test.ts` | Table-driven product-rule tests |
| `tests/preferences.test.ts` | Storage validation/fallback and coordinate clamping tests |
| `tests/data-orb.test.tsx` | Accessible state rendering tests |
| `tests/companion.test.tsx` | End-user interaction and transition tests |
| `tests/client-apply.test.tsx` | Slot lifecycle and selected-session integration contract |
| `gallery/scenarios.ts` | Shared typed Synthetic State Matrix |
| `gallery/main.tsx` | Credential-free real-component visual gallery |
| `gallery/index.html` | Vite gallery entry document |
| `gallery/gallery.css` | Gallery-only grid, theme, and fixture framing |
| `gallery/vite.config.ts` | Fixed-port local gallery server |
| `tests/visual/companion.visual.spec.ts` | Gallery screenshot matrix |
| `tests/smoke/dsh-web.smoke.spec.ts` | Packed-plugin smoke against official DSH Web `?fixture` mode |
| `scripts/verify-pack.mjs` | Assert packed bundle contents and import the built host entry |
| `README.md` | Installation, usage, privacy, compatibility, development, and limitation documentation |
| `LICENSE` | MIT license text |

---

## User Story Coverage

The approved backlog is [DSH Companion MVP User Stories](../../product/2026-08-16-mvp-user-stories.md). Tasks are engineering execution units; stories remain the user-value and acceptance units.

| Story | Outcome | Implemented and proved by |
| --- | --- | --- |
| US-01 | See a companion in DSH Web | Tasks 1 and 6 |
| US-02 | Understand agent activity | Tasks 2, 4, and 5 |
| US-03 | See context pressure | Tasks 2 and 4 |
| US-04 | Follow the current session | Tasks 5 and 6 |
| US-05 | Inspect usage details | Tasks 2 and 4 |
| US-06 | Pin and dismiss details | Task 5 |
| US-07 | Place, collapse, and restore | Tasks 3 and 5 |
| US-08 | Use an accessible calm companion | Tasks 4, 5, and 8 |
| US-09 | Exercise rules without a model key | Tasks 2–7 |
| US-10 | Review every visual state | Tasks 7 and 8 |
| US-11 | Install a complete npm bundle | Tasks 1, 6, and 9 |
| US-12 | Prove the packed plugin in real DSH Web | Task 9 |
| US-13 | Understand installation, privacy, and limits | Task 9 |

Each task review must name the stories whose acceptance criteria it advances. Final MVP verification closes stories only after every mapped criterion has direct evidence.

---

### Task 1: Establish the installable client-only bundle

**Files:**
- Create: `package.json`
- Create: `cordis.patch.yml`
- Create: `tsconfig.json`
- Create: `tsdown.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `src/client/css.d.ts`
- Create: `src/client/styles.ts`
- Create: `src/client/companion.css`
- Create: `src/client/index.ts`
- Create: `tests/client-bootstrap.test.tsx`
- Create: `scripts/verify-pack.mjs`
- Create: `LICENSE`
- Create: `.gitignore`

**Interfaces:**
- Produces: host export `apply(): void`, client artifact `lib/client.js`, declaration tree `lib/types`, bundle patch `cordis.patch.yml`.
- Produces: `mountCompanionStyles(document: Document): () => void` for Task 6.
- Produces: a temporary, lifecycle-safe `shell.overlay` placeholder registration that Task 6 replaces with the production entry.

- [ ] **Step 1: Write the failing package and client-bootstrap verification**

Create `scripts/verify-pack.mjs` with exact required entries and host import behavior:

```js
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const json = execFileSync('pnpm', ['pack', '--json', '--pack-destination', mkdtempSync(join(tmpdir(), 'dsh-companion-pack-'))], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
})
const [{ filename, files }] = JSON.parse(json)
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
```

Add `tests/client-bootstrap.test.tsx`. Against a minimal fake client context, assert that `apply()` registers exactly one entry in `shell.overlay` with id `dsh-companion`, renders the visible text `DSH Companion`, and disposes the registration and shared style cleanly. This is the RED proof for the earliest real DSH integration seam; Task 6 replaces these placeholder assertions with selected-session behavior.

- [ ] **Step 2: Run the verifier to prove the package does not exist yet**

Run: `pnpm vitest run tests/client-bootstrap.test.tsx && node scripts/verify-pack.mjs`

Expected: FAIL because the client entry, package metadata, build artifacts, or all three are absent.

- [ ] **Step 3: Add the exact package and build configuration**

Create `package.json` with these fields and versions:

```json
{
  "name": "dsh-companion",
  "version": "0.1.0",
  "description": "A friendly status and context-pressure companion for DeepSeek Harness Web",
  "type": "module",
  "main": "lib/index.js",
  "types": "lib/types/index.d.ts",
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
    "./package.json": "./package.json"
  },
  "files": ["lib/**/*.js", "lib/**/*.js.map", "lib/**/*.d.ts", "cordis.patch.yml", "LICENSE", "README.md"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "inject": ["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-client-ui-layout"],
      "platform": "web"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json && tsdown",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:visual": "playwright test --config playwright.visual.config.ts",
    "test:smoke": "playwright test --config playwright.smoke.config.ts",
    "gallery": "vite --config gallery/vite.config.ts",
    "pack:check": "pnpm build && node scripts/verify-pack.mjs",
    "prepare": "pnpm build"
  },
  "engines": { "node": "^22.19.0 || >=24.0.0" },
  "peerDependencies": { "react": "^18.2.0" },
  "devDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-client-runtime": "0.1.0-rc.5",
    "@deepseek-ai/dsh-client-ui-layout": "0.1.0-rc.5",
    "@deepseek-ai/dsh-client-ui-slots": "0.1.0-rc.5",
    "@deepseek-ai/dsh-session-projection": "0.1.0-rc.5",
    "@deepseek-ai/dsh-session-stats": "0.1.0-rc.5",
    "@deepseek-ai/dsh-token-meter": "0.1.0-rc.5",
    "@playwright/test": "^1.55.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/node": "^22.18.0",
    "@types/react": "~18.3.1",
    "@types/react-dom": "~18.3.1",
    "jsdom": "^26.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tsdown": "^0.22.2",
    "typescript": "^5.9.2",
    "vite": "^7.1.0",
    "vitest": "^4.1.0"
  },
  "license": "MIT"
}
```

Create `cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-companion
      name: dsh-companion
```

Create strict `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "src",
    "outDir": "lib/types"
  },
  "include": ["src"]
}
```

Create `src/index.ts`:

```ts
/** Host half of the browser-only DSH Companion plugin. */
export function apply(): void {}
```

Create the minimal `src/client/index.ts` using the public `inject = ['slots'] as const` contract. Its `apply()` installs the shared stylesheet and registers one temporary component in `shell.overlay` with metadata `{ name: 'shell.overlay', id: 'dsh-companion', order: 100, label: 'DSH Companion' }`. The temporary component renders only `DSH Companion`; it is intentionally replaced in Task 6.

Create `.gitignore` containing `node_modules/`, `lib/`, `coverage/`, `playwright-report/`, `test-results/`, and `gallery/.vite/`. Add the standard MIT license text naming the current year and repository owner as `DSH Companion contributors`.

- [ ] **Step 4: Add the self-contained DSH client build wrapper**

Create `tsdown.config.ts` as two configs. The host config emits `lib/index.js`. The client config emits CJS `lib/client.js`, keeps `react` and `react/jsx-runtime` external, bundles all other value imports, and wraps the artifact for DSH's module table:

```ts
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
    dts: false,
    clean: false,
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
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
```

This keeps the package independent of Harness's monorepo-only `clientBundle` preset while still shipping one closure-factory client file. Node's `dirname` and `resolve` keep the raw-CSS resolver valid on Windows and POSIX.

Create `src/client/css.d.ts`:

```ts
declare module '*.css?raw' {
  const cssText: string
  export default cssText
}
```

Create `src/client/styles.ts`:

```ts
import cssText from './companion.css?raw'

const STYLE_ATTR = 'data-dsh-companion-style'
const styles = new WeakMap<Document, { element: HTMLStyleElement; users: number }>()

export function mountCompanionStyles(document: Document): () => void {
  const existing = styles.get(document)
  if (existing !== undefined) {
    existing.users += 1
    return () => release(document, existing)
  }
  const element = document.createElement('style')
  element.setAttribute(STYLE_ATTR, '')
  element.textContent = cssText
  document.head.append(element)
  const record = { element, users: 1 }
  styles.set(document, record)
  return () => release(document, record)
}

function release(document: Document, record: { element: HTMLStyleElement; users: number }): void {
  record.users -= 1
  if (record.users !== 0) return
  record.element.remove()
  styles.delete(document)
}
```

Start `src/client/companion.css` with the click-through root and explicit interactive descendants:

```css
.dsh-companion-root { position: fixed; inset: 0; z-index: 60; pointer-events: none; }
.dsh-companion-anchor { position: absolute; pointer-events: auto; touch-action: none; }
.dsh-companion-orb, .dsh-companion-tab, .dsh-companion-popover { pointer-events: auto; }
@media (prefers-reduced-motion: reduce) {
  .dsh-companion-root *, .dsh-companion-root *::before, .dsh-companion-root *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    server: { deps: { inline: [/@deepseek-ai\//] } },
  },
})
```

- [ ] **Step 5: Install, build, and verify the packed surface**

Run: `pnpm install && pnpm pack:check`

Expected: dependencies install, TypeScript and tsdown complete, and verifier prints `verified dsh-companion-0.1.0.tgz` without missing-file errors.

- [ ] **Step 6: Commit the foundation**

```bash
git add package.json pnpm-lock.yaml cordis.patch.yml tsconfig.json tsdown.config.ts vitest.config.ts src/index.ts src/client/css.d.ts src/client/styles.ts src/client/companion.css scripts/verify-pack.mjs LICENSE .gitignore
git commit -m "build: scaffold installable DSH companion"
```

---

### Task 2: Derive activity, pressure, and usage from session projections

**Files:**
- Create: `src/client/types.ts`
- Create: `src/client/derive-state.ts`
- Create: `tests/derive-state.test.ts`

**Interfaces:**
- Produces: `deriveCompanionState(input: CompanionInput | undefined): CompanionViewModel`.
- Produces: `CompanionInput`, `TokenUsageInput`, `ContextPressureInput`, `SessionStatsInput`, `CompanionViewModel`.
- Consumed by: Tasks 4, 5, 6, and 7.

- [ ] **Step 1: Define the structural input and view-model test table**

Create `tests/derive-state.test.ts` with a `base()` helper and table cases for no session, idle, running, pending interaction, and pending-plus-running. Add exact pressure cases for `69.99`, `70`, `84.99`, `85`, and `120` percent. Assert that 120 remains `contextPercent: 120` in the model. Add usage assertions for:

```ts
expect(deriveCompanionState(base({
  tokenUsage: { uncachedInputTokens: 10, cacheReadTokens: 80, cacheWriteTokens: 10, outputTokens: 25 },
  sessionStats: { steps: 4 },
}))).toMatchObject({ billedInputTokens: 100, outputTokens: 25, cacheHitPercent: 80, steps: 4 })
```

Add cases proving zero billed input omits `cacheHitPercent`, absent projections omit all numeric fields, zero/negative/non-finite context windows produce `pressure: 'unknown'`, and invalid optional numeric values are omitted.

- [ ] **Step 2: Run the derivation test and confirm the missing-module failure**

Run: `pnpm vitest run tests/derive-state.test.ts`

Expected: FAIL because `src/client/derive-state.ts` does not exist.

- [ ] **Step 3: Add exact structural types**

Create `src/client/types.ts`:

```ts
export interface TokenUsageInput {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}
export interface ContextPressureInput { projectedTokens?: number; contextWindow?: number }
export interface SessionStatsInput { steps: number }
export interface CompanionInput {
  sessionId: string
  running: boolean
  pendingInteraction?: 'approval' | 'plan-review' | 'question'
  tokenUsage?: TokenUsageInput
  contextPressure?: ContextPressureInput
  sessionStats?: SessionStatsInput
}
export type CompanionActivity = 'sleeping' | 'idle' | 'working' | 'waiting'
export type CompanionPressure = 'unknown' | 'normal' | 'attention' | 'warning'
export interface CompanionViewModel {
  activity: CompanionActivity
  pressure: CompanionPressure
  contextPercent?: number
  contextTokens?: number
  contextWindow?: number
  billedInputTokens?: number
  outputTokens?: number
  cacheHitPercent?: number
  steps?: number
}
```

- [ ] **Step 4: Implement pure derivation with guarded numbers**

Create `src/client/derive-state.ts` with private `finiteNonnegative()` and `finitePositive()` guards. `deriveCompanionState(undefined)` returns only `{ activity: 'sleeping', pressure: 'unknown' }`. Otherwise activity is waiting when `pendingInteraction` exists, working when `running`, and idle otherwise. Derive context only when both values pass their guards; classify `<70`, `<85`, and `>=85`. Derive token totals only when every bucket is valid, and derive steps only when it is a nonnegative integer.

Use this implementation structure so optional properties are truly absent:

```ts
import type { CompanionInput, CompanionViewModel } from './types.ts'

const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
const validCapacity = (value: unknown): value is number => validCount(value) && value > 0

export function deriveCompanionState(input: CompanionInput | undefined): CompanionViewModel {
  if (input === undefined) return { activity: 'sleeping', pressure: 'unknown' }
  const activity = input.pendingInteraction !== undefined ? 'waiting' : input.running ? 'working' : 'idle'
  const projected = input.contextPressure?.projectedTokens
  const capacity = input.contextPressure?.contextWindow
  const contextKnown = validCount(projected) && validCapacity(capacity)
  const contextPercent = contextKnown ? projected / capacity * 100 : undefined
  const usage = input.tokenUsage
  const usageKnown = usage !== undefined
    && validCount(usage.uncachedInputTokens) && validCount(usage.outputTokens)
    && validCount(usage.cacheReadTokens) && validCount(usage.cacheWriteTokens)
  const billedInputTokens = usageKnown
    ? usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
    : undefined
  const steps = Number.isSafeInteger(input.sessionStats?.steps) && (input.sessionStats?.steps ?? -1) >= 0
    ? input.sessionStats?.steps
    : undefined
  return {
    activity,
    pressure: contextPercent === undefined ? 'unknown' : contextPercent < 70 ? 'normal' : contextPercent < 85 ? 'attention' : 'warning',
    ...(contextPercent === undefined ? {} : { contextPercent, contextTokens: projected, contextWindow: capacity }),
    ...(billedInputTokens === undefined ? {} : {
      billedInputTokens,
      outputTokens: usage.outputTokens,
      ...(billedInputTokens === 0 ? {} : { cacheHitPercent: Math.round(usage.cacheReadTokens / billedInputTokens * 100) }),
    }),
    ...(steps === undefined ? {} : { steps }),
  }
}
```

- [ ] **Step 5: Run focused and type tests**

Run: `pnpm vitest run tests/derive-state.test.ts && pnpm typecheck`

Expected: all derivation tests pass and TypeScript exits zero.

- [ ] **Step 6: Commit the product rules**

```bash
git add src/client/types.ts src/client/derive-state.ts tests/derive-state.test.ts
git commit -m "feat: derive companion state from session projections"
```

---

### Task 3: Persist and clamp companion preferences

**Files:**
- Create: `src/client/preferences.ts`
- Create: `tests/preferences.test.ts`

**Interfaces:**
- Produces: `CompanionPreferences { x: number; y: number; collapsed: boolean }`.
- Produces: `loadPreferences(storage, viewport): CompanionPreferences`, `savePreferences(storage, value): void`, and `clampPosition(position, viewport): Position`.
- Consumed by: Task 5.

- [ ] **Step 1: Write storage and viewport failure cases**

Test default `{ x: width - 112, y: height - 112, collapsed: false }`, valid JSON restore, malformed JSON fallback, wrong field types fallback, offscreen coordinate clamping, viewport smaller than the 88px orb, and a `Storage` fake whose `getItem` and `setItem` throw. Assert save failures do not throw.

- [ ] **Step 2: Run the preference test and confirm failure**

Run: `pnpm vitest run tests/preferences.test.ts`

Expected: FAIL because `src/client/preferences.ts` does not exist.

- [ ] **Step 3: Implement a narrow validated storage adapter**

Use key `dsh-companion:preferences:v1`, orb extent `88`, edge gap `24`, and `Number.isFinite` validation. Clamp `x` and `y` to `[24, max(24, viewportDimension - 112)]`. Wrap only the individual `getItem` and `setItem` calls in `try/catch`; fallback preferences remain in component memory after a storage failure.

Define these exact public types and functions:

```ts
export interface Position { x: number; y: number }
export interface Viewport { width: number; height: number }
export interface CompanionPreferences extends Position { collapsed: boolean }

export function clampPosition(position: Position, viewport: Viewport): Position
export function loadPreferences(storage: Pick<Storage, 'getItem'> | undefined, viewport: Viewport): CompanionPreferences
export function savePreferences(storage: Pick<Storage, 'setItem'> | undefined, preferences: CompanionPreferences): void
```

`loadPreferences` calls `clampPosition` after JSON validation; its fallback uses `{ x: viewport.width - 112, y: viewport.height - 112, collapsed: false }` before clamping. `savePreferences` serializes exactly `{ x, y, collapsed }` under the versioned key.

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run tests/preferences.test.ts`

Expected: all preference tests pass.

- [ ] **Step 5: Commit persistence behavior**

```bash
git add src/client/preferences.ts tests/preferences.test.ts
git commit -m "feat: persist companion placement safely"
```

---

### Task 4: Render the friendly orb and usage popover

**Files:**
- Create: `src/client/DataOrb.tsx`
- Create: `src/client/UsagePopover.tsx`
- Create: `tests/data-orb.test.tsx`
- Modify: `src/client/companion.css`

**Interfaces:**
- Produces: `DataOrbProps { model; celebrating; expanded; onCollapse }` plus native button props used by Task 5.
- Produces: `UsagePopover({ model }): ReactElement`.
- Consumes: `CompanionViewModel` from Task 2.

- [ ] **Step 1: Write accessible state and available-only metric tests**

Render each durable state and assert one native button with names `DSH Companion: sleeping`, `DSH Companion: idle, context 74 percent`, `DSH Companion: working, context 92 percent`, and `DSH Companion: waiting, context unknown`. Assert `aria-expanded` tracks the prop, visible text labels the state, and face elements differ by state. Render a full popover and assert rows in order: `Context`, `Billed input`, `Output`, `Cache hit`, `Steps`. Render an unknown model and assert none of those metric rows exists.

- [ ] **Step 2: Run the component test and confirm failure**

Run: `pnpm vitest run tests/data-orb.test.tsx`

Expected: FAIL because both components are absent.

- [ ] **Step 3: Build the semantic components**

`DataOrb` must render a `<button type="button">`, a visually rendered status label, two eye spans, one mouth span, and three decorative particle spans with `aria-hidden="true"`. Put `data-activity`, `data-pressure`, and `data-celebrating` on the button so CSS controls the expression without tests asserting class names. Add a separate `Collapse companion` button with a plain callback and stop its pointer event from starting a drag.

`UsagePopover` must use `role="status"`, format token values with `Intl.NumberFormat('en-US')`, render context as `${min(100, round(contextPercent))}% · ${contextTokens} / ${contextWindow}`, and omit each row whose value is undefined.

- [ ] **Step 4: Complete the visual vocabulary in CSS**

Add an 88px circular orb with semantic aliases backed by DSH theme custom properties and safe fallbacks, face geometry, state text, state-specific eye/mouth shapes, working particles, amber waiting cue, attention ring, warning ring, two-second celebration burst, popover panel, focus-visible outline, and edge tab. Keep literal fallback colors only inside custom-property declarations such as `--companion-accent: var(--dsw-alias-accent, #4f8cff)`. Ensure warning does not flash and reduced-motion rules keep expressions and text intact.

- [ ] **Step 5: Run component and type tests**

Run: `pnpm vitest run tests/data-orb.test.tsx && pnpm typecheck`

Expected: all tests pass and no JSX/type errors remain.

- [ ] **Step 6: Commit the presentational surface**

```bash
git add src/client/DataOrb.tsx src/client/UsagePopover.tsx src/client/companion.css tests/data-orb.test.tsx
git commit -m "feat: render the living data orb"
```

---

### Task 5: Add interaction, celebration, drag, and collapse behavior

**Files:**
- Create: `src/client/Companion.tsx`
- Create: `tests/companion.test.tsx`
- Modify: `src/client/DataOrb.tsx`
- Modify: `src/client/companion.css`

**Interfaces:**
- Produces: `CompanionProps { sessionId?: string; model: CompanionViewModel; storage?: Storage; viewport?: () => Viewport }`.
- Produces: `Companion(props): ReactElement` for Task 6 and the gallery.
- Consumes: Tasks 2–4.

- [ ] **Step 1: Write end-user interaction tests with fake timers**

Cover hover open/leave close, focus open/blur close, click pin/unpin, Escape close, outside pointer close, popover interaction not closing itself, session id change clearing pin, working-to-idle celebration lasting exactly 2000ms, no celebration on first idle mount, session switch cancelling celebration, pointer drag updating position, resize clamping, storage save, collapse to a `Show DSH Companion` edge tab, tab restore, and unmount clearing timers/listeners. Stub `matchMedia('(prefers-reduced-motion: reduce)')` true and assert celebration state does not activate.

- [ ] **Step 2: Run the interaction test and confirm failure**

Run: `pnpm vitest run tests/companion.test.tsx`

Expected: FAIL because `Companion.tsx` does not exist.

- [ ] **Step 3: Implement the controller state machine**

Use local state for `hovered`, `focusedWithin`, `pinned`, `celebrating`, and preferences. Derive `open = pinned || hovered || focusedWithin`. Keep previous `{ sessionId, activity }` in a ref; on the same session's `working` to `idle` edge, start one 2000ms timer unless reduced motion is active. On session id change, clear timer, celebration, and pin. Install document outside-pointer and keydown listeners only while pinned/open respectively, and remove them in effect cleanup.

For dragging, capture the pointer id on the anchor, retain the pointer-to-anchor offset, update clamped coordinates on `pointermove`, and persist on `pointerup`. Ignore movement under four CSS pixels so click-to-pin still works. Clamp again on `resize`. Use the nearest horizontal viewport edge to place the collapsed tab and keep its button accessible.

- [ ] **Step 4: Run the interaction suite**

Run: `pnpm vitest run tests/companion.test.tsx`

Expected: all interaction and cleanup tests pass without timer warnings.

- [ ] **Step 5: Run all unit/component tests**

Run: `pnpm test && pnpm typecheck`

Expected: every current Vitest file passes and TypeScript exits zero.

- [ ] **Step 6: Commit interaction behavior**

```bash
git add src/client/Companion.tsx src/client/DataOrb.tsx src/client/companion.css tests/companion.test.tsx
git commit -m "feat: add companion interactions and transitions"
```

---

### Task 6: Register in `shell.overlay` and adapt the selected session

**Files:**
- Create: `src/client/index.ts`
- Create: `tests/client-apply.test.tsx`
- Modify: `src/client/styles.ts`

**Interfaces:**
- Produces public client exports `inject: readonly ['slots']` and `apply(ctx: ClientContext): void`.
- Consumes framework `PropsRuntime<'shell.overlay'>`, `SessionSummary.projectionValues`, Tasks 1, 2, and 5.

- [ ] **Step 1: Write lifecycle and selected-session contract tests**

Mock a client context whose `slots.inject` executes its callback and whose `slots.register` records metadata/component and returns a disposer. Assert metadata exactly equals `{ name: 'shell.overlay', id: 'dsh-companion', order: 100, label: 'DSH Companion' }`, the host receives one entry, and disposal removes both registration and style. Apply twice in separate fibers, assert one shared style tag, dispose the first fiber and assert the style remains, then dispose the second and assert it is removed.

Render the recorded component with a selector-hook fake over `SessionListState`. Drive current from undefined to `alpha` to `beta`; assert sleeping, alpha working/normal, and beta waiting/warning. Give alpha projection keys not used by the companion and assert they are ignored.

- [ ] **Step 2: Run the client integration test and confirm failure**

Run: `pnpm vitest run tests/client-apply.test.tsx`

Expected: FAIL because the client entry does not exist.

- [ ] **Step 3: Add the exact DSH client adapter**

In `src/client/index.ts`, use only type imports from DSH packages and type-only augmentation imports from `@deepseek-ai/dsh-client-ui-layout/client`, `@deepseek-ai/dsh-token-meter/client`, and `@deepseek-ai/dsh-session-stats/client`. Export `inject = ['slots'] as const`.

Define `selectCurrentInput(state: SessionListState): CompanionInput | undefined` by reading `state.current`, `state.byId[current]`, and only `projectionValues.tokenUsage`, `.contextPressure`, and `.sessionStats`. Use a field-by-field equality function with the second `useSessions` argument so identical numeric/status values retain the selection.

Define the root entry as:

```tsx
function CompanionEntry({ useSessions }: PropsRuntime<'shell.overlay'>) {
  const input = useSessions(selectCurrentInput, equalCompanionInput)
  return <Companion sessionId={input?.sessionId} model={deriveCompanionState(input)} />
}
```

Register styles through `ctx.effect(() => mountCompanionStyles(document), 'dsh-companion: styles')`, then use `ctx.slots.inject('shell.overlay', () => ctx.slots.register(metadata, CompanionEntry))`. Do not import a DSH runtime value, create a service, inspect a session log, or poll.

- [ ] **Step 4: Run integration, build, and pack checks**

Run: `pnpm vitest run tests/client-apply.test.tsx && pnpm build && pnpm pack:check`

Expected: lifecycle tests pass, `lib/client.js` contains the `window.__ModuleLoader__.load` wrapper, and the packed-file verifier passes.

- [ ] **Step 5: Commit DSH integration**

```bash
git add src/client/index.ts src/client/styles.ts tests/client-apply.test.tsx
git commit -m "feat: mount companion in the DSH overlay"
```

---

### Task 7: Create the Synthetic State Matrix and visual gallery

**Files:**
- Create: `gallery/scenarios.ts`
- Create: `gallery/main.tsx`
- Create: `gallery/index.html`
- Create: `gallery/gallery.css`
- Create: `gallery/vite.config.ts`
- Create: `tests/scenarios.test.ts`

**Interfaces:**
- Produces: `SYNTHETIC_SCENARIOS: readonly SyntheticScenario[]` with stable ids and view models.
- Consumed by: Task 8.

- [ ] **Step 1: Write matrix completeness tests**

Assert exact scenario ids `no-session`, `idle-unknown`, `working-42`, `waiting-65`, `attention-74`, `warning-92`, and `celebration`. Assert all four durable activities, all four pressure values, and one `celebrating: true` fixture are represented. Assert ids are unique and every fixture is JSON-serializable.

- [ ] **Step 2: Run the matrix test and confirm failure**

Run: `pnpm vitest run tests/scenarios.test.ts`

Expected: FAIL because `gallery/scenarios.ts` is absent.

- [ ] **Step 3: Add typed deterministic scenarios**

Define `SyntheticScenario { id; title; model; sessionId?; celebrating?; pinned? }` and use `deriveCompanionState` for the six projection-driven scenarios. Use a working-derived 42% model with `celebrating: true` only for the celebration fixture so the gallery can freeze the flourish without timers. Include full token rows in 42%, 74%, and 92% scenarios and absent usage in idle-unknown.

- [ ] **Step 4: Build the credential-free gallery**

`gallery/main.tsx` must import the real production components and stylesheet text, append one gallery-owned `<style>`, read query params `theme=light|dark`, `motion=normal|reduced`, and `open=closed|pinned`, then render every scenario in a labeled card. Pass a memory-only `Storage` implementation and fixed viewport to each `Companion`. When `open=pinned`, a gallery-only wrapper activates the rendered orb through its real click interaction and marks the gallery ready only after every fixture is open; do not add a production control prop for pinned state. For deterministic celebration, render `DataOrb` directly with `celebrating` from the fixture. Put `data-gallery-ready="true"` on the root after render.

Create a gallery grid that works at 1280×900 and 390×844. In reduced mode, add a root class that applies the same animation suppression as the media query. `gallery/vite.config.ts` must use root `gallery`, host `127.0.0.1`, strict port `4173`, and server port `4173`.

- [ ] **Step 5: Run tests and manually inspect the gallery**

Run: `pnpm vitest run tests/scenarios.test.ts`

Run in a second terminal: `pnpm gallery`

Open: `http://127.0.0.1:4173/?theme=dark&motion=normal&open=pinned`

Expected: seven labeled fixtures render with the real orb/popover, no API key or DSH server request appears, and the page reports `data-gallery-ready="true"`.

- [ ] **Step 6: Commit synthetic fixtures and gallery**

```bash
git add gallery tests/scenarios.test.ts
git commit -m "test: add synthetic companion gallery"
```

---

### Task 8: Add deterministic Playwright visual regression

**Files:**
- Create: `playwright.visual.config.ts`
- Create: `tests/visual/companion.visual.spec.ts`
- Create: `tests/visual/companion.visual.spec.ts-snapshots/` through Playwright update

**Interfaces:**
- Consumes: Task 7 gallery on `http://127.0.0.1:4173`.
- Produces: visual evidence for light/dark, desktop/compact, normal/reduced motion, closed/pinned states.

- [ ] **Step 1: Write the screenshot matrix**

Create `playwright.visual.config.ts` with `testDir: './tests/visual'`, Chromium, `webServer.command: 'pnpm gallery'`, `webServer.url: 'http://127.0.0.1:4173'`, `reuseExistingServer: !process.env.CI`, base URL `http://127.0.0.1:4173`, one retry in CI, and screenshot-only output under `test-results/visual`. In the spec, enumerate these six snapshots:

```ts
const cases = [
  ['desktop-light-closed', 1280, 900, 'light', 'normal', 'closed'],
  ['desktop-light-pinned', 1280, 900, 'light', 'normal', 'pinned'],
  ['desktop-dark-closed', 1280, 900, 'dark', 'normal', 'closed'],
  ['desktop-dark-pinned', 1280, 900, 'dark', 'normal', 'pinned'],
  ['compact-dark-pinned', 390, 844, 'dark', 'normal', 'pinned'],
  ['compact-light-reduced', 390, 844, 'light', 'reduced', 'closed'],
] as const
```

For each, set viewport, emulate reduced motion where requested, navigate with query params, wait for `[data-gallery-ready="true"]`, and snapshot only the gallery root with `expect(locator).toHaveScreenshot(`${name}.png`)`.

- [ ] **Step 2: Run without baselines to confirm failure**

Run: `pnpm test:visual`

Expected: FAIL with missing screenshot baselines while writing actual images to test results.

- [ ] **Step 3: Generate and review baselines**

Run: `pnpm playwright test --config playwright.visual.config.ts --update-snapshots`

Expected: six baseline PNG files are created. Inspect every image for clipped popovers, unreadable labels, overlapping fixtures, missing faces, and theme contrast before accepting them.

- [ ] **Step 4: Prove deterministic replay**

Run: `pnpm test:visual`

Expected: all six screenshot comparisons pass without pixel differences.

- [ ] **Step 5: Commit visual coverage**

```bash
git add playwright.visual.config.ts tests/visual
git commit -m "test: add companion visual regression matrix"
```

---

### Task 9: Prove real DSH Web integration and document release behavior

**Files:**
- Create: `tests/smoke/dsh-web.smoke.spec.ts`
- Create: `scripts/prepare-dsh-smoke.mjs`
- Create: `README.md`
- Create: `playwright.smoke.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: built and packed `dsh-companion`, an installed `dsh` executable or `DSH_REPO` source checkout, official Web `?fixture` mode.
- Produces: one keyless smoke path proving package installation, overlay mount, running state, and session switching.

- [ ] **Step 1: Write the smoke environment preparer**

Create `scripts/prepare-dsh-smoke.mjs` to make a fresh temp `DSH_HOME`, run `pnpm pack --pack-destination <temp>`, select command prefix `['pnpm', '--dir', process.env.DSH_REPO, 'dsh']` when `DSH_REPO` is set or `['dsh']` otherwise, and run the following two argument lists with `DSH_HOME` set to the temp directory and `DEEPSEEK_API_KEY` removed from the child environment:

```js
['plugin', '--profile', 'web', 'add', tarball]
['--profile', 'web', '--dump-config']
```

Require the dump to contain both `id: dsh-companion` and `name: dsh-companion`. Then spawn the long-running app with `['--profile', 'web', '--port', '4174']`, pipe its output, and keep the preparer alive until SIGINT/SIGTERM; on either signal, terminate the app child and remove only the temp smoke directory it created. Print one JSON line containing `{ pid, url: 'http://127.0.0.1:4174', dshHome }` after the HTTP port accepts a connection. Never read or forward an API key.

- [ ] **Step 2: Write the real assembled-browser assertions**

Create `playwright.smoke.config.ts` with `testDir: './tests/smoke'`, Chromium, base URL `http://127.0.0.1:4174`, `webServer.command: 'node scripts/prepare-dsh-smoke.mjs'`, `webServer.url: 'http://127.0.0.1:4174'`, `reuseExistingServer: false`, and a 120-second startup timeout. In `tests/smoke/dsh-web.smoke.spec.ts`, open `/?fixture`, wait for the button named `/DSH Companion: working/`, assert one companion root and no full-screen pointer interception by clicking an existing sidebar session, select the fixture's `fx-beta` session, assert the companion changes to idle, then select `fx-alpha` and assert it returns to working. Assert no console error contains `dsh-companion`.

- [ ] **Step 3: Run the smoke first and capture the integration failure**

Run from this machine:

```powershell
pnpm --dir C:\SourceCode\deepseek-harness build
$env:DSH_REPO='C:\SourceCode\deepseek-harness'
pnpm test:smoke
```

Expected before the preparer/config is complete: FAIL at server startup or companion lookup. Keep the failure output as the red test evidence, then finish only the missing process/config wiring described in Steps 1–2.

- [ ] **Step 4: Run the completed real smoke**

Run:

```powershell
$env:DSH_REPO='C:\SourceCode\deepseek-harness'
pnpm test:smoke
```

Expected: one Chromium smoke passes against the official client fixture with the packed plugin installed in a fresh web profile.

- [ ] **Step 5: Write user and contributor documentation**

Create `README.md` with these concrete sections:

- Install: `dsh plugin --profile web add dsh-companion`, restart `dsh web`, and uninstall command.
- What the orb means: sleeping, idle, working, waiting, celebration; 70% attention and 85% warning.
- Usage: hover/focus, click pin, Escape/outside close, drag, collapse to edge tab, restore.
- Metrics: projected context, billed input definition, output, cache-hit definition, steps, and missing-data omission.
- Privacy: client-only observation of projections; no telemetry, content, credentials, provider accounts, or remote service.
- Compatibility: explicitly `DeepSeek Harness 0.1.0-rc.5`; later candidates may require an update.
- Development: Node/pnpm versions and commands `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm gallery`, `pnpm test:visual`, `pnpm pack:check`, and the `DSH_REPO` smoke command.
- Limitations: DSH Web only, selected session only, no streaming estimates, pricing, history, growth mechanics, multi-pet support, or cloud sync.

- [ ] **Step 6: Run the release gate**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm test:visual
pnpm pack:check
$env:DSH_REPO='C:\SourceCode\deepseek-harness'; pnpm test:smoke
git diff --check
git status --short
```

Expected: unit/component tests pass, typecheck and build exit zero, six visual comparisons pass, the packed artifact verifies, one real DSH Web smoke passes, diff check is empty, and status lists only the intended README/smoke/config changes before commit.

- [ ] **Step 7: Commit the release-ready MVP**

```bash
git add README.md package.json pnpm-lock.yaml playwright.smoke.config.ts scripts/prepare-dsh-smoke.mjs tests/smoke/dsh-web.smoke.spec.ts
git commit -m "docs: complete DSH companion MVP release"
```

---

## Completion Evidence

Before calling version `0.1.0` complete, record the exact successful commands and confirm:

1. `git log --oneline` shows one reviewable commit for each task.
2. `git status --short` is empty.
3. The pack verifier proves the bundle, host entry, client artifact, types, patch, license, and README ship.
4. Synthetic tests cover durable states, transition state, pressure edges, missing data, preferences, interactions, and lifecycle disposal.
5. Six gallery screenshots cover themes, viewports, motion preference, and popover state.
6. The packed plugin mounts once in official DSH Web fixture mode and follows the selected session.
7. No test or runtime code requires an API key, prompt content, tool output, telemetry endpoint, or provider credentials.
