import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { DataOrb } from './DataOrb.tsx'
import { clampPosition, loadPreferences, nearestRecoveryEdge, savePreferences, type CompanionPreferences, type Viewport } from './preferences.ts'
import type { CompanionViewModel } from './types.ts'
import { UsagePopover } from './UsagePopover.tsx'

const ORB_EXTENT = 88
const DRAG_THRESHOLD = 4
const POPOVER_GAP = 10
const POPOVER_MAX_WIDTH = 248
const VIEWPORT_INSET = 16

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

/**
 * Bind transient controller state to the selected session identity.
 * @param props - The current session view state and optional browser environment adapters.
 * @returns A click-through overlay containing the orb or its recovery tab.
 */
export function Companion(props: CompanionProps): ReactElement {
  return <CompanionController key={props.sessionId} {...props} />
}

/** Render one selected session's interactive, locally positioned companion. */
function CompanionController({ sessionId, model, storage: providedStorage, viewport: providedViewport }: CompanionProps): ReactElement {
  const storage = providedStorage ?? browserStorage()
  const viewport = providedViewport ?? browserViewport
  const [preferences, setPreferences] = useState(() => loadPreferences(storage, viewport()))
  const [hovered, setHovered] = useState(false)
  const [focusedWithin, setFocusedWithin] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const previousRef = useRef<{ sessionId?: string; activity: CompanionViewModel['activity'] }>()
  const celebrationTimerRef = useRef<number>()
  const preferencesRef = useRef(preferences)
  const persistInitialCollapsedRef = useRef(preferences.collapsed)
  const dragRef = useRef<DragState>()
  const ignoreNextClickRef = useRef(false)
  const focusRecoveryTabRef = useRef(false)
  const open = !dismissed && (pinned || hovered || focusedWithin)

  useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])

  useEffect(() => {
    if (persistInitialCollapsedRef.current) savePreferences(storage, preferencesRef.current)
  }, [storage])

  useEffect(() => {
    if (!preferences.collapsed || !focusRecoveryTabRef.current) return
    focusRecoveryTabRef.current = false
    tabRef.current?.focus()
  }, [preferences.collapsed])

  useEffect(() => {
    const previous = previousRef.current
    if (previous === undefined || previous.sessionId !== sessionId) {
      if (celebrationTimerRef.current !== undefined) {
        window.clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = undefined
      }
      setCelebrating(false)
      setPinned(false)
      setDismissed(false)
    } else if (model.activity !== 'idle') {
      if (celebrationTimerRef.current !== undefined) {
        window.clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = undefined
      }
      setCelebrating(false)
    } else if (previous.activity === 'working' && !prefersReducedMotion()) {
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
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setPinned(false)
        setDismissed(true)
      }
    }
    document.addEventListener('pointerdown', dismissOutside, true)
    return () => document.removeEventListener('pointerdown', dismissOutside, true)
  }, [pinned])

  useEffect(() => {
    if (!open) return
    const dismissEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setPinned(false)
        setDismissed(true)
      }
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

  const cancelDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    dragRef.current = undefined
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!drag.moved) return
    savePreferences(storage, preferencesRef.current)
  }

  const collapse = (): void => {
    const next = {
      ...preferencesRef.current,
      collapsed: true,
      edge: nearestRecoveryEdge(preferencesRef.current, viewport()),
    }
    focusRecoveryTabRef.current = true
    updatePreferences(next)
    savePreferences(storage, next)
    setHovered(false)
    setFocusedWithin(false)
    setPinned(false)
    setDismissed(false)
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
    setPinned(current => {
      setDismissed(current)
      return !current
    })
  }

  const currentViewport = viewport()
  const edge = preferences.edge
  const popoverWidth = Math.min(POPOVER_MAX_WIDTH, Math.max(0, currentViewport.width - VIEWPORT_INSET * 2))
  const horizontalInset = Math.min(VIEWPORT_INSET, Math.max(0, (currentViewport.width - popoverWidth) / 2))
  const preferredPopoverLeft = preferences.x + ORB_EXTENT / 2 < currentViewport.width / 2
    ? preferences.x + ORB_EXTENT + POPOVER_GAP
    : preferences.x - POPOVER_GAP - popoverWidth
  const popoverLeft = Math.min(
    Math.max(preferredPopoverLeft, horizontalInset),
    currentViewport.width - horizontalInset - popoverWidth,
  )
  const spaceAbove = Math.max(0, preferences.y - POPOVER_GAP - VIEWPORT_INSET)
  const spaceBelow = Math.max(0, currentViewport.height - preferences.y - ORB_EXTENT - POPOVER_GAP - VIEWPORT_INSET)
  const placePopoverBelow = spaceBelow >= spaceAbove
  const popoverStyle = {
    left: `${popoverLeft - preferences.x}px`,
    width: `${popoverWidth}px`,
    maxHeight: `${placePopoverBelow ? spaceBelow : spaceAbove}px`,
    ...(placePopoverBelow
      ? { top: `${ORB_EXTENT + POPOVER_GAP}px` }
      : { bottom: `${ORB_EXTENT + POPOVER_GAP}px` }),
  }

  return (
    <div className="dsh-companion-root" ref={rootRef}>
      {preferences.collapsed
        ? (
            <button
              aria-label="Show DSH Companion"
              className="dsh-companion-tab"
              data-edge={edge}
              onClick={restore}
              ref={tabRef}
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
              onFocusCapture={() => {
                setDismissed(false)
                setFocusedWithin(true)
              }}
              onBlurCapture={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocusedWithin(false)
              }}
              onPointerDown={handlePointerDown}
              onPointerEnter={() => {
                setDismissed(false)
                setHovered(true)
              }}
              onPointerLeave={() => setHovered(false)}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={cancelDrag}
              onLostPointerCapture={cancelDrag}
              style={{ left: `${preferences.x}px`, top: `${preferences.y}px` }}
            >
              <DataOrb celebrating={celebrating} expanded={open} model={model} onClick={togglePinned} onCollapse={collapse} />
              {open ? <div className="dsh-companion-popover-anchor" style={popoverStyle}><UsagePopover model={model} /></div> : null}
            </div>
          )}
    </div>
  )
}
