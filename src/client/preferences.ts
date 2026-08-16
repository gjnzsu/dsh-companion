const PREFERENCES_KEY = 'dsh-companion:preferences:v1'
const ORB_EXTENT = 88
const EDGE_GAP = 24

/** A position for the companion's top-left corner. */
export interface Position {
  x: number
  y: number
}

/** The visible browser viewport dimensions. */
export interface Viewport {
  width: number
  height: number
}

/** Persisted companion placement and collapsed state. */
export interface CompanionPreferences extends Position {
  collapsed: boolean
}

/** Whether a stored value is a valid preference record. */
function isPreferences(value: unknown): value is CompanionPreferences {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.x === 'number' && Number.isFinite(candidate.x)
    && typeof candidate.y === 'number' && Number.isFinite(candidate.y)
    && typeof candidate.collapsed === 'boolean'
}

/** Keep a position within the viewport's permitted companion area. */
export function clampPosition(position: Position, viewport: Viewport): Position {
  const maxX = Math.max(EDGE_GAP, viewport.width - ORB_EXTENT - EDGE_GAP)
  const maxY = Math.max(EDGE_GAP, viewport.height - ORB_EXTENT - EDGE_GAP)
  return {
    x: Math.min(Math.max(position.x, EDGE_GAP), maxX),
    y: Math.min(Math.max(position.y, EDGE_GAP), maxY),
  }
}

/**
 * Restore valid companion preferences, or use the lower-right default.
 * @param storage - Browser storage when available.
 * @param viewport - Current browser viewport dimensions.
 * @returns Validated and clamped preferences.
 */
export function loadPreferences(
  storage: Pick<Storage, 'getItem'> | undefined,
  viewport: Viewport,
): CompanionPreferences {
  const fallback = { ...clampPosition({ x: viewport.width - 112, y: viewport.height - 112 }, viewport), collapsed: false }
  if (storage === undefined) return fallback

  let stored: string | null
  try {
    stored = storage.getItem(PREFERENCES_KEY)
  } catch {
    return fallback
  }
  if (stored === null) return fallback

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return fallback
  }
  if (!isPreferences(parsed)) return fallback

  return { ...clampPosition(parsed, viewport), collapsed: parsed.collapsed }
}

/**
 * Persist companion preferences when browser storage is available.
 * @param storage - Browser storage when available.
 * @param preferences - Validated preferences to persist.
 * @returns Nothing.
 */
export function savePreferences(
  storage: Pick<Storage, 'setItem'> | undefined,
  preferences: CompanionPreferences,
): void {
  if (storage === undefined) return
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify({
      x: preferences.x,
      y: preferences.y,
      collapsed: preferences.collapsed,
    }))
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}
