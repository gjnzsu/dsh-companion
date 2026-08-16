import type { ButtonHTMLAttributes, PointerEvent as ReactPointerEvent, ReactElement } from 'react'
import type { CompanionViewModel } from './types.ts'

/** Interaction and presentation inputs for the companion's accessible orb. */
export interface DataOrbProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-expanded' | 'children' | 'type'> {
  model: CompanionViewModel
  celebrating: boolean
  expanded: boolean
  onCollapse: () => void
}

/** Format a durable activity as the short label rendered on the orb. */
function activityLabel(activity: CompanionViewModel['activity']): string {
  return `${activity[0]!.toUpperCase()}${activity.slice(1)}`
}

/** Format a known pressure band as the compact non-color cue rendered on the orb. */
function pressureLabel(pressure: Exclude<CompanionViewModel['pressure'], 'unknown'>): string {
  return `${pressure[0].toUpperCase()}${pressure.slice(1)}`
}

/** Describe the orb state for users who cannot rely on its expression or color. */
function accessibleName(model: CompanionViewModel): string {
  const pressure = model.pressure === 'unknown' || model.contextPercent === undefined
    ? 'context pressure unknown'
    : `context pressure ${model.pressure}, ${Math.min(100, Math.round(model.contextPercent))} percent`
  return `DSH Companion: ${model.activity}, ${pressure}`
}

/**
 * Render the presentational living data orb and its separate collapse control.
 * @param props - View state and ordinary native button handlers supplied by the controller.
 * @returns The interactive orb and collapse control.
 */
export function DataOrb({ model, celebrating, expanded, onCollapse, ...buttonProps }: DataOrbProps): ReactElement {
  const stopCollapsePointer = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.stopPropagation()
  }

  return (
    <div className="dsh-companion-orb-frame">
      <button
        {...buttonProps}
        aria-expanded={expanded}
        aria-label={accessibleName(model)}
        className="dsh-companion-orb"
        data-activity={model.activity}
        data-celebrating={celebrating}
        data-pressure={model.pressure}
        type="button"
      >
        <span aria-hidden="true" className="dsh-companion-orb-core" />
        <span aria-hidden="true" className="dsh-companion-face">
          <span aria-hidden="true" className="dsh-companion-eye dsh-companion-eye-left" data-expression={model.activity} data-orb-eye />
          <span aria-hidden="true" className="dsh-companion-eye dsh-companion-eye-right" data-expression={model.activity} data-orb-eye />
          <span aria-hidden="true" className="dsh-companion-mouth" data-expression={model.activity} data-orb-mouth />
        </span>
        {[0, 1, 2].map(index => (
          <span aria-hidden="true" className="dsh-companion-particle" data-orb-particle key={index} />
        ))}
        {model.pressure === 'unknown'
          ? null
          : (
              <span
                aria-hidden="true"
                className="dsh-companion-pressure-label"
                data-pressure-band={model.pressure}
              >
                {pressureLabel(model.pressure)}
              </span>
            )}
        <span className="dsh-companion-state-label">{celebrating ? 'Done' : activityLabel(model.activity)}</span>
      </button>
      <button
        aria-label="Collapse companion"
        className="dsh-companion-collapse"
        onClick={onCollapse}
        onPointerDown={stopCollapsePointer}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}
