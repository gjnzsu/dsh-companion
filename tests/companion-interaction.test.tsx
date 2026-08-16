import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Companion } from '../src/client/Companion.tsx'
import type { CompanionViewModel } from '../src/client/types.ts'

const viewport = { width: 800, height: 600 }
const companionCss = readFileSync('src/client/companion.css', 'utf8')

function model(overrides: Partial<CompanionViewModel> = {}): CompanionViewModel {
  return { activity: 'idle', pressure: 'normal', contextPercent: 42, ...overrides }
}

function storage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

function renderCompanion(overrides: Partial<React.ComponentProps<typeof Companion>> = {}) {
  return render(
    <Companion
      model={model()}
      sessionId="alpha"
      storage={storage()}
      viewport={() => viewport}
      {...overrides}
    />,
  )
}

function orb(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'DSH Companion: idle, context 42 percent' })
}

function anchor(): HTMLElement {
  return screen.getByTestId('dsh-companion-anchor')
}

function popover(): HTMLElement | null {
  return screen.queryByRole('status')
}

function pointerClick(target: Element): void {
  fireEvent.pointerDown(target, { button: 0, pointerId: 1, pointerType: 'mouse' })
  fireEvent.pointerUp(target, { button: 0, pointerId: 1, pointerType: 'mouse' })
  fireEvent.click(target, { detail: 1 })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Companion disclosure', () => {
  it('requires new pointer intent after an explicit unpin', () => {
    renderCompanion()

    fireEvent.pointerEnter(anchor(), { pointerType: 'mouse' })
    pointerClick(orb())
    fireEvent.pointerLeave(anchor(), { pointerType: 'mouse' })
    expect(orb().getAttribute('aria-expanded')).toBe('true')

    fireEvent.pointerEnter(anchor(), { pointerType: 'mouse' })
    pointerClick(orb())
    expect(orb().getAttribute('aria-expanded')).toBe('false')
    expect(popover()).toBeNull()

    fireEvent.pointerLeave(anchor(), { pointerType: 'mouse' })
    fireEvent.pointerEnter(anchor(), { pointerType: 'mouse' })
    expect(orb().getAttribute('aria-expanded')).toBe('true')
  })

  it('lets keyboard activation reopen details after Escape dismisses focused details', () => {
    renderCompanion()

    orb().focus()
    fireEvent.keyDown(orb(), { key: 'Enter' })
    fireEvent.click(orb(), { detail: 0 })
    expect(orb().getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(orb().getAttribute('aria-expanded')).toBe('false')
    expect(popover()).toBeNull()

    fireEvent.keyDown(orb(), { key: 'Enter' })
    fireEvent.click(orb(), { detail: 0 })
    expect(orb().getAttribute('aria-expanded')).toBe('true')
  })

  it('opens on hover and closes when the pointer leaves the companion', () => {
    renderCompanion()

    fireEvent.pointerEnter(anchor())
    expect(popover()).not.toBeNull()

    fireEvent.pointerLeave(anchor())
    expect(popover()).toBeNull()
  })

  it('opens on focus and closes when focus leaves the companion', () => {
    renderCompanion()

    fireEvent.focus(orb())
    expect(popover()).not.toBeNull()

    fireEvent.blur(orb())
    expect(popover()).toBeNull()
  })

  it('pins with a real orb click and unpins with a second click', () => {
    renderCompanion()

    fireEvent.click(orb())
    fireEvent.pointerLeave(anchor())
    expect(popover()).not.toBeNull()

    fireEvent.click(orb())
    expect(popover()).toBeNull()
  })

  it('closes pinned details with Escape while retaining a usable orb', () => {
    renderCompanion()
    fireEvent.click(orb())

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(popover()).toBeNull()
    expect(orb()).not.toBeNull()
  })

  it('closes pinned details from an outside pointer but not popover interaction', () => {
    renderCompanion()
    fireEvent.click(orb())

    fireEvent.pointerDown(popover()!)
    expect(popover()).not.toBeNull()

    fireEvent.pointerDown(document.body)
    expect(popover()).toBeNull()
  })

  it('clears a pinned panel when the selected session changes', () => {
    const rendered = renderCompanion()
    fireEvent.click(orb())

    rendered.rerender(<Companion model={model()} sessionId="beta" storage={storage()} viewport={() => viewport} />)

    expect(popover()).toBeNull()
  })

  it.each([
    [{ x: 100, y: 100 }, { left: '98px', top: '98px', 'max-height': '386px' }],
    [{ x: 688, y: 100 }, { left: '-258px', top: '98px', 'max-height': '386px' }],
    [{ x: 100, y: 488 }, { left: '98px', bottom: '98px', 'max-height': '462px' }],
    [{ x: 688, y: 488 }, { left: '-258px', bottom: '98px', 'max-height': '462px' }],
  ])('positions a panel-sized popover box in each viewport quadrant', (position, expected) => {
    const saved = storage()
    saved.setItem('dsh-companion:preferences:v1', JSON.stringify({ ...position, collapsed: false, edge: 'right' }))
    renderCompanion({ storage: saved })
    pointerClick(orb())

    const panelAnchor = popover()!.parentElement!
    expect(panelAnchor.style.width).toBe('248px')
    for (const [property, value] of Object.entries(expected)) expect(panelAnchor.style.getPropertyValue(property)).toBe(value)
  })

  it('clamps the compact popover box to a sixteen-pixel horizontal viewport inset', () => {
    const compactViewport = { width: 300, height: 200 }
    const saved = storage()
    saved.setItem('dsh-companion:preferences:v1', JSON.stringify({ x: 188, y: 88, collapsed: false, edge: 'right' }))
    renderCompanion({ storage: saved, viewport: () => compactViewport })
    pointerClick(orb())

    const panelAnchor = popover()!.parentElement!
    expect(panelAnchor.style.left).toBe('-172px')
    expect(panelAnchor.style.width).toBe('248px')
    expect(panelAnchor.style.maxHeight).toBe('62px')
    expect(companionCss).toContain('.dsh-companion-popover-anchor {\n  position: absolute;\n  box-sizing: border-box;')
    expect(companionCss).toContain('.dsh-companion-popover {\n  position: static;\n  width: 100%;\n  box-sizing: border-box;')
    expect(companionCss).toContain('.dsh-companion-tab[data-edge="right"] { border-radius: 12px 0 0 12px; }')
    expect(companionCss).toContain('.dsh-companion-tab[data-edge="left"] { border-radius: 0 12px 12px 0; }')
  })
})

describe('Companion celebration', () => {
  it('celebrates a same-session working-to-idle transition for exactly two seconds', () => {
    const rendered = renderCompanion({ model: model({ activity: 'working' }) })

    rendered.rerender(<Companion model={model({ activity: 'idle' })} sessionId="alpha" storage={storage()} viewport={() => viewport} />)
    expect(orb().getAttribute('data-celebrating')).toBe('true')

    act(() => vi.advanceTimersByTime(1_999))
    expect(orb().getAttribute('data-celebrating')).toBe('true')

    act(() => vi.advanceTimersByTime(1))
    expect(orb().getAttribute('data-celebrating')).toBe('false')
  })

  it('does not celebrate an initial idle session or motion-reduced transition', () => {
    const idle = renderCompanion()
    expect(orb().getAttribute('data-celebrating')).toBe('false')
    idle.unmount()

    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const rendered = renderCompanion({ model: model({ activity: 'working' }) })
    rendered.rerender(<Companion model={model()} sessionId="alpha" storage={storage()} viewport={() => viewport} />)

    expect(orb().getAttribute('data-celebrating')).toBe('false')
  })

  it('cancels a celebration when the selected session changes', () => {
    const rendered = renderCompanion({ model: model({ activity: 'working' }) })
    rendered.rerender(<Companion model={model()} sessionId="alpha" storage={storage()} viewport={() => viewport} />)
    expect(orb().getAttribute('data-celebrating')).toBe('true')

    rendered.rerender(<Companion model={model()} sessionId="beta" storage={storage()} viewport={() => viewport} />)
    expect(orb().getAttribute('data-celebrating')).toBe('false')

    act(() => vi.advanceTimersByTime(2_000))
    expect(orb().getAttribute('data-celebrating')).toBe('false')
  })

  it.each(['working', 'waiting'] as const)('cancels an active celebration when the same session becomes %s', activity => {
    const rendered = renderCompanion({ model: model({ activity: 'working' }) })
    rendered.rerender(<Companion model={model()} sessionId="alpha" storage={storage()} viewport={() => viewport} />)
    expect(orb().getAttribute('data-celebrating')).toBe('true')

    rendered.rerender(<Companion model={model({ activity })} sessionId="alpha" storage={storage()} viewport={() => viewport} />)
    expect(screen.getByRole('button', { name: `DSH Companion: ${activity}, context 42 percent` }).getAttribute('data-celebrating')).toBe('false')

    act(() => vi.advanceTimersByTime(2_000))
    expect(screen.getByRole('button', { name: `DSH Companion: ${activity}, context 42 percent` }).getAttribute('data-celebrating')).toBe('false')
  })
})

describe('Companion placement', () => {
  it('drags only after four pixels, clamps the position, saves it, and does not pin after a drag', () => {
    const saved = storage()
    renderCompanion({ storage: saved })

    fireEvent.pointerDown(anchor(), { pointerId: 7, clientX: 700, clientY: 500 })
    fireEvent.pointerMove(anchor(), { pointerId: 7, clientX: 703, clientY: 500 })
    fireEvent.pointerUp(anchor(), { pointerId: 7, clientX: 703, clientY: 500 })
    fireEvent.click(orb())
    expect(popover()).not.toBeNull()
    fireEvent.click(orb())

    fireEvent.pointerDown(anchor(), { pointerId: 8, clientX: 700, clientY: 500 })
    fireEvent.pointerMove(anchor(), { pointerId: 8, clientX: 1_100, clientY: 1_000 })
    fireEvent.pointerUp(anchor(), { pointerId: 8, clientX: 1_100, clientY: 1_000 })
    fireEvent.click(orb())

    expect(anchor().style.left).toBe('688px')
    expect(anchor().style.top).toBe('488px')
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 688, y: 488, collapsed: false, edge: 'right' }))
    expect(popover()).toBeNull()
  })

  it('clamps the saved position when the viewport shrinks', () => {
    let currentViewport = { ...viewport }
    const saved = storage()
    saved.setItem('dsh-companion:preferences:v1', JSON.stringify({ x: 688, y: 488, collapsed: false, edge: 'right' }))
    renderCompanion({ storage: saved, viewport: () => currentViewport })

    currentViewport = { width: 300, height: 200 }
    fireEvent.resize(window)

    expect(anchor().style.left).toBe('188px')
    expect(anchor().style.top).toBe('88px')
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 188, y: 88, collapsed: false, edge: 'right' }))
  })

  it('collapses into an edge tab and restores from it', () => {
    const saved = storage()
    renderCompanion({ storage: saved })

    fireEvent.click(screen.getByRole('button', { name: 'Collapse companion' }))
    const tab = screen.getByRole('button', { name: 'Show DSH Companion' })
    expect(tab.style.right).toBe('0px')
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 688, y: 488, collapsed: true, edge: 'right' }))

    fireEvent.click(tab)
    expect(screen.queryByRole('button', { name: 'Show DSH Companion' })).toBeNull()
    expect(orb()).not.toBeNull()
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 688, y: 488, collapsed: false, edge: 'right' }))
  })

  it('persists the collapse edge selected at collapse time across resize and reload', () => {
    let currentViewport = { ...viewport }
    const saved = storage()
    saved.setItem('dsh-companion:preferences:v1', JSON.stringify({ x: 100, y: 200, collapsed: false, edge: 'right' }))
    const rendered = renderCompanion({ storage: saved, viewport: () => currentViewport })

    fireEvent.click(screen.getByRole('button', { name: 'Collapse companion' }))
    expect(screen.getByRole('button', { name: 'Show DSH Companion' }).style.left).toBe('0px')
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 100, y: 200, collapsed: true, edge: 'left' }))

    currentViewport = { width: 80, height: 600 }
    fireEvent.resize(window)
    expect(screen.getByRole('button', { name: 'Show DSH Companion' }).style.left).toBe('0px')
    rendered.unmount()

    renderCompanion({ storage: saved, viewport: () => currentViewport })
    expect(screen.getByRole('button', { name: 'Show DSH Companion' }).style.left).toBe('0px')
  })

  it('migrates an edge-less collapsed preference before a resize can make its fallback ambiguous', () => {
    let currentViewport = { ...viewport }
    const saved = storage()
    saved.setItem('dsh-companion:preferences:v1', JSON.stringify({ x: 100, y: 200, collapsed: true }))
    const rendered = renderCompanion({ storage: saved, viewport: () => currentViewport })
    expect(screen.getByRole('button', { name: 'Show DSH Companion' }).style.left).toBe('0px')

    currentViewport = { width: 250, height: 600 }
    fireEvent.resize(window)
    rendered.unmount()

    renderCompanion({ storage: saved, viewport: () => currentViewport })
    expect(screen.getByRole('button', { name: 'Show DSH Companion' }).style.left).toBe('0px')
  })

  it('returns focus to the recovery tab when the collapse button is keyboard activated', () => {
    renderCompanion()
    const collapse = screen.getByRole('button', { name: 'Collapse companion' })

    collapse.focus()
    fireEvent.keyDown(collapse, { key: 'Enter' })
    fireEvent.click(collapse, { detail: 0 })

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show DSH Companion' }))
  })

  it.each([
    ['pointer cancellation', 'pointerCancel'],
    ['lost pointer capture', 'lostPointerCapture'],
  ] as const)('saves the last dragged position after %s', (_name, eventName) => {
    const saved = storage()
    renderCompanion({ storage: saved })

    fireEvent.pointerDown(anchor(), { pointerId: 7, clientX: 700, clientY: 500 })
    fireEvent.pointerMove(anchor(), { pointerId: 7, clientX: 500, clientY: 300 })
    fireEvent[eventName](anchor(), { pointerId: 7, clientX: 500, clientY: 300 })

    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 488, y: 288, collapsed: false, edge: 'right' }))
    pointerClick(orb())
    expect(orb().getAttribute('aria-expanded')).toBe('true')
  })
})

describe('Companion lifecycle', () => {
  it('clears pending timers and document listeners on unmount', () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener')
    const rendered = renderCompanion({ model: model({ activity: 'working' }) })
    rendered.rerender(<Companion model={model()} sessionId="alpha" storage={storage()} viewport={() => viewport} />)
    fireEvent.click(orb())

    rendered.unmount()
    act(() => vi.runOnlyPendingTimers())

    expect(removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), true)
    expect(removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
