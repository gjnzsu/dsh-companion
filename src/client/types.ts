/** Token counts projected by the selected session. */
export interface TokenUsageInput {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** Context-capacity values projected by the selected session. */
export interface ContextPressureInput {
  projectedTokens?: number
  contextWindow?: number
}

/** Session progress values projected by the selected session. */
export interface SessionStatsInput {
  steps: number
}

/** The selected session projections consumed by the companion. */
export interface CompanionInput {
  sessionId: string
  running: boolean
  pendingInteraction?: 'approval' | 'plan-review' | 'question'
  tokenUsage?: TokenUsageInput
  contextPressure?: ContextPressureInput
  sessionStats?: SessionStatsInput
}

/** A companion's visible activity. */
export type CompanionActivity = 'sleeping' | 'idle' | 'working' | 'waiting'

/** The selected session's context-capacity classification. */
export type CompanionPressure = 'unknown' | 'normal' | 'attention' | 'warning'

/** The presentation-ready state for the companion. */
export interface CompanionViewModel {
  activity: CompanionActivity
  pressure: CompanionPressure
  contextPercent?: number
  contextTokens?: number
  contextWindow?: number
  billedInputTokens?: number
  outputTokens?: number
  cacheHitPercent?: number
  steps?: number
}
