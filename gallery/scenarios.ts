import { deriveCompanionState } from '../src/client/derive-state.ts'
import type { CompanionInput, CompanionViewModel } from '../src/client/types.ts'

/** One deterministic companion state rendered by the development gallery. */
export interface SyntheticScenario {
  id: string
  title: string
  model: CompanionViewModel
  sessionId?: string
  transitionFrom?: CompanionViewModel
}

const CONTEXT_WINDOW = 128_000

function input(
  sessionId: string,
  running: boolean,
  contextPercent?: number,
  usage?: CompanionInput['tokenUsage'],
  steps?: number,
  pendingInteraction?: CompanionInput['pendingInteraction'],
): CompanionInput {
  return {
    sessionId,
    running,
    ...(pendingInteraction === undefined ? {} : { pendingInteraction }),
    ...(contextPercent === undefined ? {} : {
      contextPressure: {
        projectedTokens: CONTEXT_WINDOW * contextPercent / 100,
        contextWindow: CONTEXT_WINDOW,
      },
    }),
    ...(usage === undefined ? {} : { tokenUsage: usage }),
    ...(steps === undefined ? {} : { sessionStats: { steps } }),
  }
}

const fullUsage = {
  uncachedInputTokens: 4_800,
  cacheReadTokens: 9_600,
  cacheWriteTokens: 600,
  outputTokens: 2_110,
} as const

const working42 = input('working-42', true, 42, fullUsage, 6)
const celebrationWorking = { ...working42, sessionId: 'celebration' }

/** The approved credential-free state matrix shared by gallery and browser tests. */
export const SYNTHETIC_SCENARIOS: readonly SyntheticScenario[] = [
  {
    id: 'no-session',
    title: 'No session',
    model: deriveCompanionState(undefined),
  },
  {
    id: 'idle-unknown',
    title: 'Idle · Unknown',
    sessionId: 'idle-unknown',
    model: deriveCompanionState(input('idle-unknown', false)),
  },
  {
    id: 'working-42',
    title: 'Working · 42%',
    sessionId: working42.sessionId,
    model: deriveCompanionState(working42),
  },
  {
    id: 'waiting-65',
    title: 'Waiting · 65%',
    sessionId: 'waiting-65',
    model: deriveCompanionState(input('waiting-65', true, 65, undefined, undefined, 'approval')),
  },
  {
    id: 'attention-74',
    title: 'Attention · 74%',
    sessionId: 'attention-74',
    model: deriveCompanionState(input('attention-74', false, 74, {
      uncachedInputTokens: 12_430,
      cacheReadTokens: 28_240,
      cacheWriteTokens: 850,
      outputTokens: 2_110,
    }, 9)),
  },
  {
    id: 'warning-92',
    title: 'Warning · 92%',
    sessionId: 'warning-92',
    model: deriveCompanionState(input('warning-92', true, 92, {
      uncachedInputTokens: 21_300,
      cacheReadTokens: 42_600,
      cacheWriteTokens: 1_100,
      outputTokens: 5_840,
    }, 14)),
  },
  {
    id: 'celebration',
    title: 'Celebration · 42%',
    sessionId: 'celebration',
    model: deriveCompanionState({ ...celebrationWorking, running: false }),
    transitionFrom: deriveCompanionState(celebrationWorking),
  },
] as const
