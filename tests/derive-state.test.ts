import { describe, expect, it } from 'vitest'
import { deriveCompanionState } from '../src/client/derive-state.ts'
import type { CompanionInput } from '../src/client/types.ts'

function base(overrides: Partial<CompanionInput> = {}): CompanionInput {
  return {
    sessionId: 'session-1',
    running: false,
    ...overrides,
  }
}

describe('deriveCompanionState', () => {
  it.each([
    ['no session', undefined, { activity: 'sleeping', pressure: 'unknown' }],
    ['idle', base(), { activity: 'idle', pressure: 'unknown' }],
    ['running', base({ running: true }), { activity: 'working', pressure: 'unknown' }],
    ['pending interaction', base({ pendingInteraction: 'approval' }), { activity: 'waiting', pressure: 'unknown' }],
    ['pending interaction while running', base({ running: true, pendingInteraction: 'question' }), { activity: 'waiting', pressure: 'unknown' }],
  ])('derives %s activity', (_name, input, expected) => {
    expect(deriveCompanionState(input)).toEqual(expected)
  })

  it.each([
    [69.99, 'normal'],
    [70, 'attention'],
    [84.99, 'attention'],
    [85, 'warning'],
    [120, 'warning'],
  ] as const)('classifies %s percent context pressure as %s', (contextPercent, pressure) => {
    const model = deriveCompanionState(base({
      contextPressure: { projectedTokens: contextPercent, contextWindow: 100 },
    }))

    expect(model).toMatchObject({
      pressure,
      contextPercent,
      contextTokens: contextPercent,
      contextWindow: 100,
    })
  })

  it('derives token totals, cache ratio, and steps', () => {
    expect(deriveCompanionState(base({
      tokenUsage: { uncachedInputTokens: 10, cacheReadTokens: 80, cacheWriteTokens: 10, outputTokens: 25 },
      sessionStats: { steps: 4 },
    }))).toMatchObject({ billedInputTokens: 100, outputTokens: 25, cacheHitPercent: 80, steps: 4 })
  })

  it('omits the cache ratio when billed input is zero', () => {
    const model = deriveCompanionState(base({
      tokenUsage: { uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
    }))

    expect(model).toMatchObject({ billedInputTokens: 0, outputTokens: 0 })
    expect(Object.hasOwn(model, 'cacheHitPercent')).toBe(false)
  })

  it('omits every numeric field when projections are absent', () => {
    expect(deriveCompanionState(base())).toEqual({ activity: 'idle', pressure: 'unknown' })
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'treats a %s context window as unknown',
    (contextWindow) => {
      expect(deriveCompanionState(base({
        contextPressure: { projectedTokens: 10, contextWindow },
      }))).toEqual({ activity: 'idle', pressure: 'unknown' })
    },
  )

  it('omits invalid optional numeric projection values', () => {
    expect(deriveCompanionState(base({
      contextPressure: { projectedTokens: Number.NaN, contextWindow: 100 },
      tokenUsage: { uncachedInputTokens: 10, cacheReadTokens: Number.POSITIVE_INFINITY, cacheWriteTokens: 0, outputTokens: 2 },
      sessionStats: { steps: -1 },
    }))).toEqual({ activity: 'idle', pressure: 'unknown' })
  })
})
