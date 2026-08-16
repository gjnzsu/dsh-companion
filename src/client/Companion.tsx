import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { DataOrb } from './DataOrb.tsx'
import { clampPosition, loadPreferences, savePreferences, type CompanionPreferences, type Viewport } from './preferences.ts'
import type { CompanionViewModel } from './types.ts'
import { UsagePopover } from './UsagePopover.tsx'

const ORB_EXTENT = 88
const DRAG_THRESHOLD = 4

/** Inputs for the session-scoped companion controller. */
export interface CompanionProps {
  sessionId?: string
  model: CompanionViewModel
  storage?: Storage
  viewport?: () => Viewport
}

interface DragState {
  pointerId: number
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  moved: boolean
}

/** Read browser storage without failing in privacy-restricted contexts. */
function browserStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/** Read the current viewport when a host has not supplied one. */
function browserViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight }
}

/** Whether the current browser requests reduced motion. */
function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Select the viewport edge closest to the orb's horizontal centre. */
function closestEdge(position: CompanionPreferences, viewport: Viewport): 'left' | 'right' {
  return position.x + ORB_EXTENT / 2 < viewport.width / 2 ? 'left' : 'right'
}

/**
 * Render the selected session's interactive, locally positioned companion.
 * @param props - The current session view state and optional browser environment adapters.
 * @returns A click-through overlay containing the orb or its recovery tab.
 */
export function Companion({ sessionId, model, storage: providedStorage, viewport: providedViewport }: CompanionProps): ReactElement {
  const storage = providedStorage ?? browserStorage()
  const viewport = providedViewport ?? browserViewport
  const [preferences, setPreferences] = useState(() => loadPreferences(storage, viewport()))
  const [hovered, setHovered] = useState(false)
  const [focusedWithin, setFocusedWithin] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const previousRef = useRef<{ sessionId?: string; activity: CompanionViewModel['activity'] }>()
  const celebrationTimerRef = useRef<ReturnType<typeof window.setTimeout>>()
  const preferencesRef = useRef(preferences)
  const dragRef = useRef<DragState>()
  const ignoreNextClickRef = useRef(false)
  const open = pinned || hovered || focusedWithin

  useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])

  useEffect(() => {
    const previous = previousRef.current
    if (previous === undefined || previous.sessionId !== sessionId) {
      if (celebrationTimerRef.current !== undefined) {
        window.clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = undefined
      }
      setCelebrating(false)
      setPinned(false)
    } else if (previous.activity === 'working' && model.activity === 'idle' && !prefersReducedMotion()) {
      if (celebrationTimerRef.current !== undefined) window.clearTimeout(celebrationTimerRef.current)
      setCelebrating(true)
      celebrationTimerRef.current = window.setTimeout(() => {
        celebrationTimerRef.current = undefined
        setCelebrating(false)
      }, 2_000)
    }
    previousRef.current = { sessionId, activity: model.activity }
  }, [model.activity, sessionId])

  useEffect(() => () => {
    if (celebrationTimerRef.current !== undefined) window.clearTimeout(celebrationTimerRef.current)
  }, [])

  useEffect(() => {
    if (!pinned) return
    const dismissOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setPinned(false)
    }
    document.addEventListener('pointerdown', dismissOutside, true)
    return () => document.removeEventListener('pointerdown', dismissOutside, true)
  }, [pinned])

  useEffect(() => {
    if (!open) return
    const dismissEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPinned(false)
    }
    document.addEventListener('keydown', dismissEscape)
    return () => document.removeEventListener('keydown', dismissEscape)
  }, [open])

  useEffect(() => {
    const clampForResize = (): void => {
      const nextPosition = clampPosition(preferencesRef.current, viewport())
      if (nextPosition.x === preferencesRef.current.x && nextPosition.y === preferencesRef.current.y) return
      const next = { ...preferencesRef.current, ...nextPosition }
      preferencesRef.current = next
      setPreferences(next)
      savePreferences(storage, next)
    }
    window.addEventListener('resize', clampForResize)
    return () => window.removeEventListener('resize', clampForResize)
  }, [storage, viewport])

  const updatePreferences = (next: CompanionPreferences): void => {
    preferencesRef.current = next
    setPreferences(next)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - preferencesRef.current.x,
      offsetY: event.clientY - preferencesRef.current.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const updateDraggedPosition = (event: ReactPointerEvent<HTMLDivElement>): CompanionPreferences | undefined => {
    const drag = dragRef.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return undefined
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) return undefined
    drag.moved = true
    const position = clampPosition({ x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY }, viewport())
    const next = { ...preferencesRef.current, ...position }
    updatePreferences(next)
    return next
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    updateDraggedPosition(event)
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    const next = updateDraggedPosition(event)
    dragRef.current = undefined
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!drag.moved) return
    ignoreNextClickRef.current = true
    savePreferences(storage, next ?? preferencesRef.current)
  }

  const collapse = (): void => {
    const next = { ...preferencesRef.current, collapsed: true }
    updatePreferences(next)
    savePreferences(storage, next)
    setHovered(false)
    setFocusedWithin(false)
    setPinned(false)
  }

  const restore = (): void => {
    const next = { ...preferencesRef.current, collapsed: false }
    updatePreferences(next)
    savePreferences(storage, next)
  }

  const togglePinned = (): void => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false
      return
    }
    setPinned(current => !current)
  }

  const currentViewport = viewport()
  const edge = closestEdge(preferences, currentViewport)
  const popoverStyle = {
    ...(preferences.x + ORB_EXTENT / 2 < currentViewport.width / 2
      ? { left: `${ORB_EXTENT + 10}px` }
      : { right: `${ORB_EXTENT + 10}px` }),
    ...(preferences.y + ORB_EXTENT / 2 < currentViewport.height / 2
      ? { top: `${ORB_EXTENT + 10}px` }
      : { bottom: `${ORB_EXTENT + 10}px` }),
  }

  return (
    <div className="dsh-companion-root" ref={rootRef}>
      {preferences.collapsed
        ? (
            <button
              aria-label="Show DSH Companion"
              className="dsh-companion-tab"
              onClick={restore}
              style={{ [edge]: '0px', top: `${preferences.y}px` }}
              type="button"
            >
              Show DSH Companion
            </button>
          )
        : (
            <div
              className="dsh-companion-anchor"
              data-testid="dsh-companion-anchor"
              onFocusCapture={() => setFocusedWithin(true)}
              onBlurCapture={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocusedWithin(false)
              }}
              onPointerDown={handlePointerDown}
              onPointerEnter={() => setHovered(true)}
              onPointerLeave={() => setHovered(false)}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              style={{ left: `${preferences.x}px`, top: `${preferences.y}px` }}
            >
              <DataOrb celebrating={celebrating} expanded={open} model={model} onClick={togglePinned} onCollapse={collapse} />
              {open ? <div className="dsh-companion-popover-anchor" style={popoverStyle}><UsagePopover model={model} /></div> : null}
            </div>
          )}
    </div>
  )
}
