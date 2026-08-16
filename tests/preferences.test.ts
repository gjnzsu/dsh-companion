import { describe, expect, it } from 'vitest'
import { clampPosition, loadPreferences, savePreferences } from '../src/client/preferences.ts'
import type { CompanionPreferences, Viewport } from '../src/client/preferences.ts'

const viewport: Viewport = { width: 800, height: 600 }

describe('companion preferences', () => {
  it('uses the offset default when no stored preferences exist', () => {
    expect(loadPreferences(undefined, viewport)).toEqual({ x: 688, y: 488, collapsed: false, edge: 'right' })
  })

  it('restores valid stored preferences', () => {
    const storage = { getItem: () => JSON.stringify({ x: 100, y: 200, collapsed: true }) }

    expect(loadPreferences(storage, viewport)).toEqual({ x: 100, y: 200, collapsed: true, edge: 'left' })
  })

  it('migrates a collapsed preference without an edge to its nearest stored recovery edge', () => {
    const storage = { getItem: () => JSON.stringify({ x: 100, y: 200, collapsed: true }) }

    expect(loadPreferences(storage, viewport)).toEqual({ x: 100, y: 200, collapsed: true, edge: 'left' })
  })

  it('serializes the validated recovery edge', () => {
    const calls: [string, string][] = []
    const preferences = { x: 100, y: 200, collapsed: true, edge: 'left' } as unknown as CompanionPreferences

    savePreferences({ setItem: (key, value) => { calls.push([key, value]) } }, preferences)

    expect(calls).toEqual([['dsh-companion:preferences:v1', JSON.stringify(preferences)]])
  })

  it.each([
    ['malformed JSON', '{'],
    ['wrong coordinate type', JSON.stringify({ x: '100', y: 200, collapsed: false })],
    ['wrong collapsed type', JSON.stringify({ x: 100, y: 200, collapsed: 'false' })],
    ['non-finite coordinate', JSON.stringify({ x: null, y: 200, collapsed: false })],
  ])('falls back for %s', (_name, stored) => {
    const storage = { getItem: () => stored }

    expect(loadPreferences(storage, viewport)).toEqual({ x: 688, y: 488, collapsed: false, edge: 'right' })
  })

  it('clamps positions to the visible orb range', () => {
    expect(clampPosition({ x: -5, y: 900 }, viewport)).toEqual({ x: 24, y: 488 })
    expect(loadPreferences({ getItem: () => JSON.stringify({ x: 999, y: -5, collapsed: true }) }, viewport))
      .toEqual({ x: 688, y: 24, collapsed: true, edge: 'right' })
  })

  it('keeps positions at the edge gap when the viewport is smaller than the orb', () => {
    expect(clampPosition({ x: 0, y: 999 }, { width: 80, height: 70 })).toEqual({ x: 24, y: 24 })
    expect(loadPreferences(undefined, { width: 80, height: 70 })).toEqual({ x: 24, y: 24, collapsed: false, edge: 'right' })
  })

  it('falls back when reading storage throws', () => {
    const storage = { getItem: () => { throw new Error('blocked') } }

    expect(loadPreferences(storage, viewport)).toEqual({ x: 688, y: 488, collapsed: false, edge: 'right' })
  })

  it('writes exactly the versioned preference value', () => {
    const calls: [string, string][] = []
    const preferences: CompanionPreferences = { x: 100, y: 200, collapsed: true, edge: 'left' }

    savePreferences({ setItem: (key, value) => { calls.push([key, value]) } }, preferences)

    expect(calls).toEqual([['dsh-companion:preferences:v1', JSON.stringify(preferences)]])
  })

  it('does not throw when writing storage fails', () => {
    const storage = { setItem: () => { throw new Error('blocked') } }

    expect(() => savePreferences(storage, { x: 100, y: 200, collapsed: false })).not.toThrow()
  })

  it('propagates preference field access errors', () => {
    const preferences: CompanionPreferences = {
      get x() { throw new Error('invalid preferences') },
      y: 200,
      collapsed: false,
      edge: 'right',
    }

    expect(() => savePreferences({ setItem: () => undefined }, preferences)).toThrow('invalid preferences')
  })
})
