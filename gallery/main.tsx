import { createRoot } from 'react-dom/client'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import companionCssText from '../src/client/companion.css?raw'
import { Companion } from '../src/client/Companion.tsx'
import { DataOrb } from '../src/client/DataOrb.tsx'
import type { Viewport } from '../src/client/preferences.ts'
import { UsagePopover } from '../src/client/UsagePopover.tsx'
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

function popoverStyle(viewport: Viewport, position: { x: number; y: number }): CSSProperties {
  const width = Math.min(248, viewport.width - 32)
  const preferredLeft = position.x + 44 < viewport.width / 2
    ? position.x + 98
    : position.x - 10 - width
  const left = Math.min(Math.max(preferredLeft, 16), viewport.width - 16 - width)
  const spaceAbove = Math.max(0, position.y - 26)
  const spaceBelow = Math.max(0, viewport.height - position.y - 114)
  const below = spaceBelow >= spaceAbove
  return {
    left: `${left - position.x}px`,
    width: `${width}px`,
    maxHeight: `${below ? spaceBelow : spaceAbove}px`,
    ...(below ? { top: '98px' } : { bottom: '98px' }),
  }
}

interface FixtureProps {
  scenario: SyntheticScenario
  viewport: Viewport
  placement: GalleryPlacement
  open: GalleryOpen
  onReady: (id: string) => void
  geometry?: boolean
}

function ScenarioFixture({ scenario, viewport, placement, open, onReady, geometry = false }: FixtureProps): ReactElement {
  const fixtureRef = useRef<HTMLElement>(null)
  const storage = useMemo(() => memoryStorage(viewport, placement), [placement, viewport])
  const [celebrationExpanded, setCelebrationExpanded] = useState(false)
  const directPosition = positionFor(viewport, placement)

  useEffect(() => {
    const fixture = fixtureRef.current
    const orb = fixture?.querySelector<HTMLButtonElement>('.dsh-companion-orb')
    if (fixture === null || orb === undefined || orb === null) return

    if (open === 'closed') {
      onReady(scenario.id)
      return
    }

    const completeWhenExpanded = (): void => {
      if (orb.getAttribute('aria-expanded') === 'true' && fixture.querySelector('[role="status"]') !== null) {
        observer.disconnect()
        onReady(scenario.id)
      }
    }
    const observer = new MutationObserver(completeWhenExpanded)
    observer.observe(fixture, { attributes: true, childList: true, subtree: true })
    orb.click()
    completeWhenExpanded()
    return () => observer.disconnect()
  }, [onReady, open, scenario.id])

  const content = scenario.celebrating
    ? (
        <div
          className="dsh-companion-root gallery-direct-root"
          style={{ '--gallery-orb-x': `${directPosition.x}px`, '--gallery-orb-y': `${directPosition.y}px` } as CSSProperties}
        >
          <div className="dsh-companion-anchor gallery-direct-anchor">
            <DataOrb
              celebrating
              expanded={celebrationExpanded}
              model={scenario.model}
              onClick={() => setCelebrationExpanded(current => !current)}
              onCollapse={() => {}}
            />
            {celebrationExpanded
              ? <div className="dsh-companion-popover-anchor" style={popoverStyle(viewport, directPosition)}><UsagePopover model={scenario.model} /></div>
              : null}
          </div>
        </div>
      )
    : <Companion model={scenario.model} sessionId={scenario.sessionId} storage={storage} viewport={() => viewport} />

  return (
    <section
      className={geometry ? 'gallery-geometry-fixture' : 'gallery-card'}
      data-scenario-id={scenario.id}
      ref={fixtureRef}
    >
      {geometry ? null : <h2>{scenario.title}</h2>}
      <div className="gallery-stage">{content}</div>
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
