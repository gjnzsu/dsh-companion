import { cleanup, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataOrb } from '../src/client/DataOrb.tsx'
import { UsagePopover } from '../src/client/UsagePopover.tsx'
import type { CompanionViewModel } from '../src/client/types.ts'

const companionCss = readFileSync('src/client/companion.css', 'utf8')

function model(overrides: Partial<CompanionViewModel>): CompanionViewModel {
  return { activity: 'idle', pressure: 'unknown', ...overrides }
}

afterEach(cleanup)

function cssRule(selector: string): string {
  const start = companionCss.indexOf(`${selector} {`)
  const end = companionCss.indexOf('}', start)
  return companionCss.slice(start, end + 1)
}

describe('DataOrb', () => {
  it('uses the DSH business accent for the orb body', () => {
    expect(cssRule('.dsh-companion-root')).toContain('--companion-accent: var(--dsw-alias-state-business-primary, #4f8cff)')
  })

  it.each([
    ['sleeping', model({ activity: 'sleeping' }), 'DSH Companion: sleeping, context pressure unknown', 'Sleeping', undefined],
    ['idle', model({ pressure: 'attention', contextPercent: 74 }), 'DSH Companion: idle, context pressure attention, 74 percent', 'Idle', 'Attention'],
    ['working', model({ activity: 'working', pressure: 'warning', contextPercent: 92 }), 'DSH Companion: working, context pressure warning, 92 percent', 'Working', 'Warning'],
    ['waiting', model({ activity: 'waiting' }), 'DSH Companion: waiting, context pressure unknown', 'Waiting', undefined],
  ] as const)('renders the %s state with its accessible name and visible labels', (_state, state, accessibleName, label, pressureLabel) => {
    const { container } = render(
      <DataOrb celebrating={false} expanded={false} model={state} onCollapse={vi.fn()} />,
    )

    const orb = screen.getByRole('button', { name: accessibleName })
    expect(orb.getAttribute('type')).toBe('button')
    expect(orb.getAttribute('aria-expanded')).toBe('false')
    expect(within(orb).getByText(label)).not.toBeNull()
    if (pressureLabel === undefined) {
      expect(orb.querySelector('[data-pressure-band]')).toBeNull()
    } else {
      const cue = within(orb).getByText(pressureLabel)
      expect(cue.getAttribute('data-pressure-band')).toBe(state.pressure)
      expect(cue.getAttribute('aria-hidden')).toBe('true')
    }
    expect(orb.getAttribute('data-activity')).toBe(state.activity)
    expect(orb.getAttribute('data-pressure')).toBe(state.pressure)
    expect(orb.getAttribute('data-celebrating')).toBe('false')
    expect(container.querySelectorAll('[data-orb-eye]')).toHaveLength(2)
    expect(container.querySelector('[data-orb-mouth]')).not.toBeNull()
    expect(container.querySelectorAll('[data-orb-particle]')).toHaveLength(3)
    expect(container.querySelector('[data-orb-eye]')?.getAttribute('data-expression')).toBe(state.activity)
  })

  it('reflects an expanded popover and isolates the collapse control from drag pointers', () => {
    const onCollapse = vi.fn()
    const onPointerDown = vi.fn()
    render(
      <DataOrb
        celebrating
        expanded
        model={model({ activity: 'working', pressure: 'normal', contextPercent: 42 })}
        onCollapse={onCollapse}
        onPointerDown={onPointerDown}
      />,
    )

    expect(screen.getByRole('button', { name: 'DSH Companion: working, context pressure normal, 42 percent' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Normal').getAttribute('data-pressure-band')).toBe('normal')
    const collapse = screen.getByRole('button', { name: 'Collapse companion' })
    collapse.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    collapse.click()

    expect(onPointerDown).not.toHaveBeenCalled()
    expect(onCollapse).toHaveBeenCalledOnce()
  })

  it('keeps attention and warning pressure rings when celebration adds its success burst', () => {
    expect(cssRule('.dsh-companion-orb[data-pressure="attention"]')).toContain('--orb-ring: var(--companion-attention)')
    expect(cssRule('.dsh-companion-orb[data-pressure="warning"]')).toContain('--orb-ring: var(--companion-attention)')
    const celebration = cssRule('.dsh-companion-orb[data-celebrating="true"]')

    expect(celebration).not.toContain('--orb-ring')
    expect(celebration).toContain('--celebration-accent: var(--companion-success)')
    expect(companionCss.match(/\.dsh-companion-orb\[data-celebrating="true"\]\s*\{[^}]*--orb-ring/g)).toBeNull()
    expect(cssRule('.dsh-companion-orb[data-celebrating="true"]::before')).toContain('animation: dsh-companion-celebration-burst')
  })
})

describe('UsagePopover', () => {
  it('renders available metrics in product order and formats values for display', () => {
    render(
      <UsagePopover model={model({
        contextPercent: 74.4,
        contextTokens: 94_720,
        contextWindow: 128_000,
        billedInputTokens: 12_430,
        outputTokens: 2_110,
        cacheHitPercent: 68,
        steps: 9,
      })} />,
    )

    const popover = screen.getByRole('status')
    const labels = Array.from(popover.querySelectorAll('[data-usage-label]'), label => label.textContent)
    expect(labels).toEqual(['Context', 'Billed input', 'Output', 'Cache hit', 'Steps'])
    const context = popover.querySelector('[data-usage-context]')
    expect(context?.textContent).toContain('Context')
    expect(cssRule('.dsh-companion-usage-row[data-usage-context]')).toContain('font-weight: 600')
    expect(popover.textContent).toContain('74% · 94,720 / 128,000')
    expect(popover.textContent).toContain('12,430')
    expect(popover.textContent).toContain('2,110')
    expect(popover.textContent).toContain('68%')
    expect(popover.textContent).toContain('9')
  })

  it('omits unavailable metrics and explains an intentionally opened empty panel', () => {
    render(<UsagePopover model={model({})} />)

    const popover = screen.getByRole('status')
    expect(within(popover).queryByText('Context')).toBeNull()
    expect(within(popover).queryByText('Billed input')).toBeNull()
    expect(within(popover).queryByText('Output')).toBeNull()
    expect(within(popover).queryByText('Cache hit')).toBeNull()
    expect(within(popover).queryByText('Steps')).toBeNull()
    expect(popover.textContent).toContain('Usage unavailable')
  })
})
