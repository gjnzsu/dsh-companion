import { createElement, type ReactNode } from 'react'
import { mountCompanionStyles } from './styles.ts'

/** The additive overlay registration supplied by the public DSH slots service. */
interface CompanionSlots {
  inject(name: 'shell.overlay', callback: () => () => void): () => void
  register(
    metadata: { name: 'shell.overlay'; id: string; order: number; label: string },
    component: () => ReactNode,
  ): () => void
}

/** The client services the temporary overlay placeholder needs from DSH. */
interface CompanionClientContext {
  effect(callback: () => () => void, name?: string): unknown
  slots: CompanionSlots
}

/** Required public client service provided by the DSH client runtime. */
export const inject = ['slots'] as const

/**
 * Register the temporary shell-overlay placeholder while the client plugin is mounted.
 * @param ctx - DSH client context with the public slots service.
 */
export function apply(ctx: CompanionClientContext): void {
  ctx.effect(() => {
    const releaseStyles = mountCompanionStyles(document)
    const disposeRegistration = ctx.slots.inject('shell.overlay', () => ctx.slots.register(
      { name: 'shell.overlay', id: 'dsh-companion', order: 100, label: 'DSH Companion' },
      () => createElement('div', { className: 'dsh-companion-root' }, 'DSH Companion'),
    ))
    return () => {
      disposeRegistration()
      releaseStyles()
    }
  }, 'dsh-companion: shell overlay placeholder')
}
