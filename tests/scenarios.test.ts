import { describe, expect, it } from 'vitest'
import { SYNTHETIC_SCENARIOS } from '../gallery/scenarios.ts'

const EXPECTED_IDS = [
  'no-session',
  'idle-unknown',
  'working-42',
  'waiting-65',
  'attention-74',
  'warning-92',
  'celebration',
] as const

describe('Synthetic State Matrix', () => {
  it('contains the exact approved scenario ids in display order', () => {
    expect(SYNTHETIC_SCENARIOS.map(scenario => scenario.id)).toEqual(EXPECTED_IDS)
  })

  it('represents every durable activity and pressure band', () => {
    expect(new Set(SYNTHETIC_SCENARIOS.map(scenario => scenario.model.activity))).toEqual(
      new Set(['sleeping', 'idle', 'working', 'waiting']),
    )
    expect(new Set(SYNTHETIC_SCENARIOS.map(scenario => scenario.model.pressure))).toEqual(
      new Set(['unknown', 'normal', 'attention', 'warning']),
    )
  })

  it('pins every approved id to its activity, pressure, and context percentage', () => {
    expect(Object.fromEntries(SYNTHETIC_SCENARIOS.map(({ id, model }) => [id, {
      activity: model.activity,
      pressure: model.pressure,
      contextPercent: model.contextPercent,
    }]))).toEqual({
      'no-session': { activity: 'sleeping', pressure: 'unknown', contextPercent: undefined },
      'idle-unknown': { activity: 'idle', pressure: 'unknown', contextPercent: undefined },
      'working-42': { activity: 'working', pressure: 'normal', contextPercent: 42 },
      'waiting-65': { activity: 'waiting', pressure: 'normal', contextPercent: 65 },
      'attention-74': { activity: 'idle', pressure: 'attention', contextPercent: 74 },
      'warning-92': { activity: 'working', pressure: 'warning', contextPercent: 92 },
      celebration: { activity: 'idle', pressure: 'normal', contextPercent: 42 },
    })
  })

  it('represents celebration as a same-session working-to-idle transition', () => {
    const celebration = SYNTHETIC_SCENARIOS.find(scenario => scenario.id === 'celebration')
    expect(celebration).toMatchObject({
      id: 'celebration',
      sessionId: 'celebration',
      model: { activity: 'idle' },
      transitionFrom: { activity: 'working' },
    })
  })

  it('uses unique ids and JSON-serializable fixtures', () => {
    const ids = SYNTHETIC_SCENARIOS.map(scenario => scenario.id)
    expect(new Set(ids)).toHaveLength(ids.length)
    expect(JSON.parse(JSON.stringify(SYNTHETIC_SCENARIOS))).toEqual(SYNTHETIC_SCENARIOS)
  })

  it('keeps full usage rows on the approved metric scenarios and none on idle unknown', () => {
    for (const id of ['working-42', 'attention-74', 'warning-92']) {
      const model = SYNTHETIC_SCENARIOS.find(scenario => scenario.id === id)?.model
      expect(model).toMatchObject({
        contextPercent: expect.any(Number),
        contextTokens: expect.any(Number),
        contextWindow: expect.any(Number),
        billedInputTokens: expect.any(Number),
        outputTokens: expect.any(Number),
        cacheHitPercent: expect.any(Number),
        steps: expect.any(Number),
      })
    }

    expect(SYNTHETIC_SCENARIOS.find(scenario => scenario.id === 'idle-unknown')?.model).toEqual({
      activity: 'idle',
      pressure: 'unknown',
    })
  })
})
