import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Companion } from '../src/client/Companion.tsx'
import type { CompanionViewModel } from '../src/client/types.ts'

const viewport = { width: 800, height: 600 }

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

  it('places pinned details away from the nearest viewport edges', () => {
    renderCompanion()
    fireEvent.click(orb())

    const panelAnchor = popover()!.parentElement!
    expect(panelAnchor.style.right).toBe('98px')
    expect(panelAnchor.style.bottom).toBe('98px')
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
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 688, y: 488, collapsed: false }))
    expect(popover()).toBeNull()
  })

  it('clamps the saved position when the viewport shrinks', () => {
    let currentViewport = { ...viewport }
    const saved = storage()
    saved.setItem('dsh-companion:preferences:v1', JSON.stringify({ x: 688, y: 488, collapsed: false }))
    renderCompanion({ storage: saved, viewport: () => currentViewport })

    currentViewport = { width: 300, height: 200 }
    fireEvent.resize(window)

    expect(anchor().style.left).toBe('188px')
    expect(anchor().style.top).toBe('88px')
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 188, y: 88, collapsed: false }))
  })

  it('collapses into an edge tab and restores from it', () => {
    const saved = storage()
    renderCompanion({ storage: saved })

    fireEvent.click(screen.getByRole('button', { name: 'Collapse companion' }))
    const tab = screen.getByRole('button', { name: 'Show DSH Companion' })
    expect(tab.style.right).toBe('0px')
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 688, y: 488, collapsed: true }))

    fireEvent.click(tab)
    expect(screen.queryByRole('button', { name: 'Show DSH Companion' })).toBeNull()
    expect(orb()).not.toBeNull()
    expect(saved.getItem('dsh-companion:preferences:v1')).toBe(JSON.stringify({ x: 688, y: 488, collapsed: false }))
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
