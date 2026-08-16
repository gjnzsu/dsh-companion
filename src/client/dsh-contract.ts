import type { ReactElement } from 'react'
import type { ContextPressureInput, SessionStatsInput, TokenUsageInput } from './types.ts'

/** Selector hook supplied to a root-scoped DSH Web slot component. */
export type SessionSelectorHook = <Selected>(
  selector: (state: SessionListState) => Selected,
  equal?: (left: Selected, right: Selected) => boolean,
) => Selected

/** Session fields consumed from the DSH Web list projection. */
export interface SessionSummary {
  id: string
  running: boolean
  pendingInteraction?: 'approval' | 'plan-review' | 'question'
  projectionValues?: Readonly<{
    tokenUsage?: TokenUsageInput
    contextPressure?: ContextPressureInput
    sessionStats?: SessionStatsInput
  }>
}

/** Selected-session store fields consumed by the companion. */
export interface SessionListState {
  current: string | undefined
  byId: Readonly<Record<string, SessionSummary | undefined>>
}

/** Framework-owned props delivered to the global overlay entry. */
export interface OverlayProps {
  useSessions: SessionSelectorHook
}

/** Metadata for the companion's additive global overlay entry. */
interface OverlayMetadata {
  name: 'shell.overlay'
  id: 'dsh-companion'
  order: 100
  label: 'DSH Companion'
}

/** Public DSH Web client methods used by the companion's entrypoint. */
export interface ClientContext {
  effect(setup: () => (() => void), label: string): unknown
  slots: {
    inject(key: 'shell.overlay', setup: () => (() => void)): unknown
    register(metadata: OverlayMetadata, component: (props: OverlayProps) => ReactElement): () => void
  }
}
