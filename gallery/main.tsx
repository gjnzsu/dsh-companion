import { createRoot } from 'react-dom/client'
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import companionCssText from '../src/client/companion.css?raw'
import { Companion } from '../src/client/Companion.tsx'
import type { Viewport } from '../src/client/preferences.ts'
import galleryCssText from './gallery.css?raw'
import { SYNTHETIC_SCENARIOS, type SyntheticScenario } from './scenarios.ts'

type GalleryTheme = 'light' | 'dark'
type GalleryMotion = 'normal' | 'reduced'
type GalleryOpen = 'closed' | 'pinned'
type GalleryPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const PREFERENCES_KEY = 'dsh-companion:preferences:v1'

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>()

  get length(): number { return this.#values.size }
  clear(): void { this.#values.clear() }
  getItem(key: string): string | null { return this.#values.get(key) ?? null }
  key(index: number): string | null { return Array.from(this.#values.keys())[index] ?? null }
  removeItem(key: string): void { this.#values.delete(key) }
  setItem(key: string, value: string): void { this.#values.set(key, value) }
}

function enumParam<T extends string>(name: string, values: readonly T[], fallback: T): T {
  const value = new URLSearchParams(window.location.search).get(name)
  return value !== null && (values as readonly string[]).includes(value) ? value as T : fallback
}

function positionFor(viewport: Viewport, placement: GalleryPlacement): { x: number; y: number } {
  const x = placement.endsWith('left') ? 24 : viewport.width - 112
  const y = placement.startsWith('top') ? 24 : viewport.height - 112
  return { x, y }
}

function memoryStorage(viewport: Viewport, placement: GalleryPlacement): Storage {
  const storage = new MemoryStorage()
  storage.setItem(PREFERENCES_KEY, JSON.stringify({
    ...positionFor(viewport, placement),
    collapsed: false,
    edge: placement.endsWith('left') ? 'left' : 'right',
  }))
  return storage
}

interface FixtureProps {
  scenario: SyntheticScenario
  viewport: Viewport
  placement: GalleryPlacement
  open: GalleryOpen
  motion: GalleryMotion
  onReady: (id: string) => void
  geometry?: boolean
}

function ScenarioFixture({ scenario, viewport, placement, open, motion, onReady, geometry = false }: FixtureProps): ReactElement {
  const fixtureRef = useRef<HTMLElement>(null)
  const storage = useMemo(() => memoryStorage(viewport, placement), [placement, viewport])
  const [model, setModel] = useState(() => scenario.transitionFrom ?? scenario.model)

  useEffect(() => {
    if (scenario.transitionFrom !== undefined) setModel(scenario.model)
  }, [scenario])

  useEffect(() => {
    const fixture = fixtureRef.current
    const orb = fixture?.querySelector<HTMLButtonElement>('.dsh-companion-orb')
    if (fixture === null || orb === undefined || orb === null) return

    const completeWhenReady = (): void => {
      const expectsCelebration = scenario.transitionFrom !== undefined && motion === 'normal'
      const interactionReady = open === 'closed'
        || (orb.getAttribute('aria-expanded') === 'true' && fixture.querySelector('[role="status"]') !== null)
      if (interactionReady
        && orb.getAttribute('data-activity') === scenario.model.activity
        && orb.getAttribute('data-celebrating') === String(expectsCelebration)) {
        observer.disconnect()
        onReady(scenario.id)
      }
    }
    const observer = new MutationObserver(completeWhenReady)
    observer.observe(fixture, { attributes: true, childList: true, subtree: true })
    if (open === 'pinned') orb.click()
    completeWhenReady()
    return () => observer.disconnect()
  }, [motion, onReady, open, scenario])

  return (
    <section
      className={geometry ? 'gallery-geometry-fixture' : 'gallery-card'}
      data-scenario-id={scenario.id}
      ref={fixtureRef}
    >
      {geometry ? null : <h2>{scenario.title}</h2>}
      <div className="gallery-stage">
        <Companion model={model} sessionId={scenario.sessionId} storage={storage} viewport={() => viewport} />
      </div>
    </section>
  )
}

function Gallery(): ReactElement {
  const theme = enumParam('theme', ['light', 'dark'] as const, 'light')
  const motion = enumParam('motion', ['normal', 'reduced'] as const, 'normal')
  const open = enumParam('open', ['closed', 'pinned'] as const, 'closed')
  const placementValue = new URLSearchParams(window.location.search).get('geometry')
  const geometry = (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const)
    .find(value => value === placementValue)
  const viewport = useMemo<Viewport>(() => geometry === undefined
    ? { width: window.innerWidth <= 600 ? 324 : 262, height: 298 }
    : { width: window.innerWidth, height: window.innerHeight }, [geometry])
  const scenarios = geometry === undefined
    ? SYNTHETIC_SCENARIOS
    : [SYNTHETIC_SCENARIOS.find(scenario => scenario.id === 'working-42')!]
  const [readyIds, setReadyIds] = useState<ReadonlySet<string>>(() => new Set())
  const markReady = useMemo(() => (id: string): void => {
    setReadyIds(current => current.has(id) ? current : new Set(current).add(id))
  }, [])
  const ready = readyIds.size === scenarios.length

  useEffect(() => {
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return (
    <main
      className={`gallery-root gallery-theme-${theme} gallery-motion-${motion}${geometry === undefined ? '' : ' gallery-geometry'}`}
      data-gallery-ready={ready ? 'true' : 'false'}
      data-motion={motion}
      data-open={open}
      data-theme={theme}
      id="gallery"
    >
      {geometry === undefined
        ? (
            <>
              <header className="gallery-header">
                <p className="gallery-kicker">DSH Companion</p>
                <h1>Synthetic State Matrix</h1>
                <p>Production components · {theme} theme · {motion} motion · details {open}</p>
              </header>
              <div className="gallery-grid">
                {scenarios.map(scenario => (
                  <ScenarioFixture
                    key={scenario.id}
                    motion={motion}
                    onReady={markReady}
                    open={open}
                    placement="bottom-right"
                    scenario={scenario}
                    viewport={viewport}
                  />
                ))}
              </div>
            </>
          )
        : (
            <ScenarioFixture
              geometry
              motion={motion}
              onReady={markReady}
              open="pinned"
              placement={geometry}
              scenario={scenarios[0]!}
              viewport={viewport}
            />
          )}
    </main>
  )
}

const style = document.createElement('style')
style.dataset.galleryStyle = 'true'
style.textContent = `${companionCssText}\n${galleryCssText}`
document.head.append(style)

const root = document.getElementById('root')
if (root === null) throw new Error('Gallery root is missing')
createRoot(root).render(<Gallery />)
