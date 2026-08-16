import type { CompanionInput, CompanionViewModel } from './types.ts'

/** Whether a projected count is a finite, non-negative number. */
function finiteNonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Whether a projected capacity is a finite, positive number. */
function finitePositive(value: unknown): value is number {
  return finiteNonnegative(value) && value > 0
}

/**
 * Convert selected-session projections into companion presentation state.
 * @param input - The selected session projections, when a session is selected.
 * @returns A view model with only known numeric values present.
 */
export function deriveCompanionState(input: CompanionInput | undefined): CompanionViewModel {
  if (input === undefined) return { activity: 'sleeping', pressure: 'unknown' }

  const activity = input.pendingInteraction !== undefined ? 'waiting' : input.running ? 'working' : 'idle'
  const projected = input.contextPressure?.projectedTokens
  const capacity = input.contextPressure?.contextWindow
  const contextKnown = finiteNonnegative(projected) && finitePositive(capacity)
  const contextPercent = contextKnown ? projected / capacity * 100 : undefined
  const usage = input.tokenUsage
  const usageKnown = usage !== undefined
    && finiteNonnegative(usage.uncachedInputTokens) && finiteNonnegative(usage.outputTokens)
    && finiteNonnegative(usage.cacheReadTokens) && finiteNonnegative(usage.cacheWriteTokens)
  const billedInputTokens = usage !== undefined && usageKnown
    ? usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
    : undefined
  const steps = Number.isSafeInteger(input.sessionStats?.steps) && (input.sessionStats?.steps ?? -1) >= 0
    ? input.sessionStats?.steps
    : undefined

  return {
    activity,
    pressure: contextPercent === undefined ? 'unknown' : contextPercent < 70 ? 'normal' : contextPercent < 85 ? 'attention' : 'warning',
    ...(contextPercent === undefined ? {} : { contextPercent, contextTokens: projected, contextWindow: capacity }),
    ...(billedInputTokens === undefined || usage === undefined ? {} : {
      billedInputTokens,
      outputTokens: usage.outputTokens,
      ...(billedInputTokens === 0 ? {} : { cacheHitPercent: Math.round(usage.cacheReadTokens / billedInputTokens * 100) }),
    }),
    ...(steps === undefined ? {} : { steps }),
  }
}
