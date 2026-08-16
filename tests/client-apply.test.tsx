import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { apply, inject } from '../src/client/index.ts'

interface TestSessionSummary {
  id: string
  running: boolean
  pendingInteraction?: 'approval' | 'plan-review' | 'question'
  projectionValues?: Record<string, unknown>
}

interface TestSessionListState {
  current?: string
  byId: Record<string, TestSessionSummary>
}

type TestUseSessions = <Selection>(
  selector: (state: TestSessionListState) => Selection,
  equal?: (left: Selection, right: Selection) => boolean,
) => Selection

interface OverlayEntry {
  metadata: { name: string; id: string; order: number; label: string }
  component: ComponentType<{ useSessions: TestUseSessions }>
}

function createClientContext(): {
  context: Parameters<typeof apply>[0]
  entries: OverlayEntry[]
  dispose: () => void
} {
  const disposers: Array<() => void> = []
  const entries: OverlayEntry[] = []
  const context = {
    effect: (callback: () => () => void) => {
      const dispose = callback()
      disposers.push(dispose)
      return dispose
    },
    slots: {
      inject: (_name: string, callback: () => () => void) => {
        const dispose = callback()
        disposers.push(dispose)
        return dispose
      },
      register: (metadata: OverlayEntry['metadata'], component: OverlayEntry['component']) => {
        const entry = { metadata, component }
        entries.push(entry)
        return () => {
          const index = entries.indexOf(entry)
          if (index !== -1) entries.splice(index, 1)
        }
      },
    },
  } as unknown as Parameters<typeof apply>[0]
  return {
    context,
    entries,
    dispose: () => {
      for (const dispose of disposers.splice(0).reverse()) dispose()
    },
  }
}

function createSessionStore(initial: TestSessionListState): {
  useSessions: TestUseSessions
  update: (next: TestSessionListState) => void
  selected: () => unknown
} {
  let state = initial
  let selected: unknown
  const listeners = new Set<() => void>()

  const useSessions: TestUseSessions = <Selection,>(
    selector: (state: TestSessionListState) => Selection,
    equal: (left: Selection, right: Selection) => boolean = Object.is,
  ): Selection => {
    const [selection, setSelection] = useState(() => selector(state))
    selected = selection
    useEffect(() => {
      const update = (): void => {
        setSelection(previous => {
          const next = selector(state)
          return equal(previous, next) ? previous : next
        })
      }
      listeners.add(update)
      return () => listeners.delete(update)
    }, [equal, selector])
    return selection
  }

  return {
    useSessions,
    update: (next) => {
      act(() => {
        state = next
        for (const listener of listeners) listener()
      })
    },
    selected: () => selected,
  }
}

function state(current: string | undefined, ...sessions: TestSessionSummary[]): TestSessionListState {
  return { current, byId: Object.fromEntries(sessions.map(session => [session.id, session])) }
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('DSH Companion client application', () => {
  it('registers one exact overlay entry and releases registrations and shared styles with each fiber', () => {
    const first = createClientContext()
    const second = createClientContext()

    apply(first.context)
    apply(second.context)

    expect(inject).toEqual(['slots'])
    expect(first.entries).toHaveLength(1)
    expect(first.entries[0]?.metadata).toEqual({
      name: 'shell.overlay',
      id: 'dsh-companion',
      order: 100,
      label: 'DSH Companion',
    })
    expect(second.entries).toHaveLength(1)
    expect(document.head.querySelectorAll('[data-dsh-companion-style]')).toHaveLength(1)

    first.dispose()

    expect(first.entries).toHaveLength(0)
    expect(second.entries).toHaveLength(1)
    expect(document.head.querySelectorAll('[data-dsh-companion-style]')).toHaveLength(1)

    second.dispose()

    expect(second.entries).toHaveLength(0)
    expect(document.head.querySelector('[data-dsh-companion-style]')).toBeNull()
  })

  it('follows only the selected session and approved live projection values', () => {
    const client = createClientContext()
    apply(client.context)
    const sessions = createSessionStore(state(undefined))
    const entry = client.entries[0]!

    render(createElement(entry.component, { useSessions: sessions.useSessions }))
    expect(screen.getByRole('button', { name: 'DSH Companion: sleeping' })).not.toBeNull()

    sessions.update(state('missing'))
    expect(screen.getByRole('button', { name: 'DSH Companion: sleeping' })).not.toBeNull()

    const alphaWithoutProjections = { id: 'alpha', running: true }
    sessions.update(state('alpha', alphaWithoutProjections))
    expect(screen.getByRole('button', { name: 'DSH Companion: working, context unknown' })).not.toBeNull()

    const alpha = {
      id: 'alpha',
      running: true,
      projectionValues: {
        tokenUsage: { uncachedInputTokens: 10, cacheReadTokens: 20, cacheWriteTokens: 5, outputTokens: 8 },
        contextPressure: { projectedTokens: 40, contextWindow: 100 },
        sessionStats: { steps: 3 },
        contextBreakdown: { systemTokens: 999 },
      },
    }
    sessions.update(state('alpha', alpha))
    const alphaOrb = screen.getByRole('button', { name: 'DSH Companion: working, context 40 percent' })
    expect(alphaOrb.getAttribute('data-activity')).toBe('working')
    expect(alphaOrb.getAttribute('data-pressure')).toBe('normal')

    const selectedAlpha = sessions.selected()
    sessions.update(state('alpha', {
      ...alpha,
      projectionValues: { ...alpha.projectionValues, contextBreakdown: { systemTokens: 1 } },
    }))
    expect(sessions.selected()).toBe(selectedAlpha)

    sessions.update(state('beta', alpha, {
      id: 'beta',
      running: true,
      pendingInteraction: 'question',
      projectionValues: {
        tokenUsage: { uncachedInputTokens: 4, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 2 },
        contextPressure: { projectedTokens: 90, contextWindow: 100 },
        sessionStats: { steps: 1 },
      },
    }))
    const betaOrb = screen.getByRole('button', { name: 'DSH Companion: waiting, context 90 percent' })
    expect(betaOrb.getAttribute('data-activity')).toBe('waiting')
    expect(betaOrb.getAttribute('data-pressure')).toBe('warning')

    client.dispose()
  })
})
