import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.ts'

type OverlayEntry = {
  metadata: { name: string; id: string; order: number; label: string }
  component: () => ReactNode
}

function createClientContext(): {
  context: Parameters<typeof apply>[0]
  entries: OverlayEntry[]
  dispose: () => void
} {
  const entries: OverlayEntry[] = []
  let disposeEffect = (): void => {}
  const register = vi.fn((metadata: OverlayEntry['metadata'], component: OverlayEntry['component']) => {
    const entry = { metadata, component }
    entries.push(entry)
    return () => {
      entries.splice(entries.indexOf(entry), 1)
    }
  })
  const context = {
    effect: vi.fn((callback: () => () => void) => {
      disposeEffect = callback()
      return disposeEffect
    }),
    slots: {
      inject: vi.fn((_name: string, callback: () => () => void) => callback()),
      register,
    },
  } as unknown as Parameters<typeof apply>[0]
  return { context, entries, dispose: () => disposeEffect() }
}

describe('DSH Companion client bootstrap', () => {
  it('registers the visible shell overlay placeholder and releases it with its stylesheet', () => {
    const client = createClientContext()

    apply(client.context)

    expect(client.entries).toHaveLength(1)
    expect(client.entries[0]?.metadata).toEqual({
      name: 'shell.overlay',
      id: 'dsh-companion',
      order: 100,
      label: 'DSH Companion',
    })
    expect(render(client.entries[0]!.component()).getByText('DSH Companion')).not.toBeNull()
    expect(document.head.querySelectorAll('[data-dsh-companion-style]')).toHaveLength(1)

    client.dispose()

    expect(client.entries).toHaveLength(0)
    expect(document.head.querySelector('[data-dsh-companion-style]')).toBeNull()
  })

  it('shares the stylesheet across client lifetimes until the last registration disposes', () => {
    const first = createClientContext()
    const second = createClientContext()

    apply(first.context)
    apply(second.context)
    expect(document.head.querySelectorAll('[data-dsh-companion-style]')).toHaveLength(1)

    first.dispose()
    expect(document.head.querySelectorAll('[data-dsh-companion-style]')).toHaveLength(1)

    second.dispose()
    expect(document.head.querySelector('[data-dsh-companion-style]')).toBeNull()
  })
})
