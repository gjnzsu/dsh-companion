import { createElement } from 'react'
import { Companion } from './Companion.tsx'
import { deriveCompanionState } from './derive-state.ts'
import type { ClientContext, OverlayProps, SessionListState } from './dsh-contract.ts'
import { mountCompanionStyles } from './styles.ts'
import type { CompanionInput } from './types.ts'

/** Required public client service provided by the DSH client runtime. */
export const inject = ['slots'] as const

/** Select the approved fields from the currently selected session summary. */
function selectCurrentInput(state: SessionListState): CompanionInput | undefined {
  const current = state.current
  if (current === undefined) return undefined
  const summary = state.byId[current]
  if (summary === undefined) return undefined
  const tokenUsage = summary.projectionValues?.tokenUsage
  const contextPressure = summary.projectionValues?.contextPressure
  const sessionStats = summary.projectionValues?.sessionStats
  return {
    sessionId: summary.id,
    running: summary.running,
    ...(summary.pendingInteraction === undefined ? {} : { pendingInteraction: summary.pendingInteraction }),
    ...(tokenUsage === undefined ? {} : { tokenUsage }),
    ...(contextPressure === undefined ? {} : { contextPressure }),
    ...(sessionStats === undefined ? {} : { sessionStats }),
  }
}

/** Whether two selected companion inputs contain the same approved fields. */
function equalCompanionInput(left: CompanionInput | undefined, right: CompanionInput | undefined): boolean {
  if (left === undefined || right === undefined) return left === right
  return left.sessionId === right.sessionId
    && left.running === right.running
    && left.pendingInteraction === right.pendingInteraction
    && left.tokenUsage?.uncachedInputTokens === right.tokenUsage?.uncachedInputTokens
    && left.tokenUsage?.outputTokens === right.tokenUsage?.outputTokens
    && left.tokenUsage?.cacheReadTokens === right.tokenUsage?.cacheReadTokens
    && left.tokenUsage?.cacheWriteTokens === right.tokenUsage?.cacheWriteTokens
    && left.contextPressure?.projectedTokens === right.contextPressure?.projectedTokens
    && left.contextPressure?.contextWindow === right.contextPressure?.contextWindow
    && left.sessionStats?.steps === right.sessionStats?.steps
}

/** Render the companion from the framework's live selected-session hook. */
function CompanionEntry({ useSessions }: OverlayProps) {
  const input = useSessions(selectCurrentInput, equalCompanionInput)
  return createElement(Companion, { sessionId: input?.sessionId, model: deriveCompanionState(input) })
}

/**
 * Register the companion in the additive shell overlay for this client fiber.
 * @param ctx - DSH client context with the public slots service.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => mountCompanionStyles(document), 'dsh-companion: styles')
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'dsh-companion', order: 100, label: 'DSH Companion' },
    CompanionEntry,
  ))
}
