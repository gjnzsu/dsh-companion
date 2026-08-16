import type { ReactElement } from 'react'
import type { CompanionViewModel } from './types.ts'

/** The number grouping used for all projected token and step values. */
const numberFormat = new Intl.NumberFormat('en-US')

/** A labeled metric rendered by the usage panel. */
interface UsageRowProps {
  label: string
  value: string
}

/** Render one right-aligned usage metric. */
function UsageRow({ label, value }: UsageRowProps): ReactElement {
  return (
    <div className="dsh-companion-usage-row">
      <span data-usage-label>{label}</span>
      <span className="dsh-companion-usage-value">{value}</span>
    </div>
  )
}

/**
 * Render only the selected session's available usage metrics.
 * @param props - The presentation-ready state derived from the current session.
 * @returns A compact status panel or an explicit unavailable message.
 */
export function UsagePopover({ model }: { model: CompanionViewModel }): ReactElement {
  const contextKnown = model.contextPercent !== undefined
    && model.contextTokens !== undefined
    && model.contextWindow !== undefined
  const rows = [
    contextKnown
      ? { label: 'Context', value: `${Math.min(100, Math.round(model.contextPercent!))}% · ${numberFormat.format(model.contextTokens!)} / ${numberFormat.format(model.contextWindow!)}` }
      : undefined,
    model.billedInputTokens === undefined ? undefined : { label: 'Billed input', value: numberFormat.format(model.billedInputTokens) },
    model.outputTokens === undefined ? undefined : { label: 'Output', value: numberFormat.format(model.outputTokens) },
    model.cacheHitPercent === undefined ? undefined : { label: 'Cache hit', value: `${numberFormat.format(model.cacheHitPercent)}%` },
    model.steps === undefined ? undefined : { label: 'Steps', value: numberFormat.format(model.steps) },
  ].filter((row): row is { label: string; value: string } => row !== undefined)

  return (
    <section className="dsh-companion-popover" role="status">
      {rows.length === 0
        ? <p className="dsh-companion-usage-unavailable">Usage unavailable</p>
        : rows.map(row => <UsageRow key={row.label} {...row} />)}
    </section>
  )
}
