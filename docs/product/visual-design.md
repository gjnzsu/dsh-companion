# DSH Companion Visual Design

**Status:** Approved direction; implementation values are normative for MVP
**Direction:** B1 — Friendly Living Data Orb
**Surfaces:** DSH Web overlay, usage popover, collapsed edge tab

## Visual Intent

The companion should read in this order:

1. A small living presence.
2. The agent's current activity.
3. The session's context pressure.
4. Detailed usage only after deliberate inspection.

The selected direction is a friendly spherical data life-form with simple geometric facial features. It is not an animal, human character, robot body, emoji, or imitation of an existing coding companion.

## Character Principles

### Friendly

Two eyes and a small mouth make the orb immediately readable as a companion. Expression changes are clear at small size and do not require decorative illustration.

### Data-Bearing

Glow, halo, pressure ring, and particles carry product meaning. They are not arbitrary decoration.

### Calm

The orb stays on screen for long periods. Default motion is slow, low-amplitude, and silent. Waiting and warning attract attention through state contrast rather than flashing.

### Original

The silhouette remains a simple sphere with a luminous inner core. Avoid ears, fins, tails, limbs, helmets, familiar mascot proportions, and recognizable branded color arrangements.

## Anatomy

| Element | Purpose | Rule |
| --- | --- | --- |
| Body | Stable companion silhouette | 88px circle in the default desktop presentation |
| Inner core | Data-life character | Soft radial depth, visible in light and dark themes |
| Eyes | Primary activity expression | Two geometric shapes; readable without animation |
| Mouth | Secondary emotional cue | Small path or CSS shape; never text or emoji |
| Halo | Context pressure | Surrounds the body without changing its hit target |
| Particles | Active work | Visible only when they add state meaning |
| State label | Non-color reinforcement | Short visible activity label near or inside the interactive surface |

The interactive hit target is at least 88×88px. The orb stays at least 24px from the viewport edge when expanded.

## Layout Specifications

### Expanded Orb

| Property | MVP value |
| --- | --- |
| Body size | 88×88px |
| Minimum hit target | 88×88px |
| Viewport edge gap | 24px |
| Pressure halo | Extends up to 8px beyond the body |
| Focus outline | At least 2px and visibly separated from the halo |
| Default placement | Bottom-right, clamped inside the edge gap |

### Usage Popover

| Property | MVP value |
| --- | --- |
| Preferred width | 248px |
| Responsive maximum | Viewport width minus 32px |
| Internal padding | 12px |
| Row gap | 8px |
| Corner radius | 12px |
| Orb-to-panel gap | 10px |
| Alignment | Flip horizontally and vertically to remain onscreen |

The popover is visually attached to the orb but is not a speech bubble. It is a compact data panel consistent with DSH floating surfaces.

### Collapsed Edge Tab

| Property | MVP value |
| --- | --- |
| Minimum target | 44×44px |
| Visible label | `Show DSH Companion` or an equally explicit localized label |
| Edge | Nearest horizontal viewport edge at collapse time |
| Persistence | Edge and collapsed state persist locally |

The tab may use a miniature orb core, but its text label remains available to assistive technology and on visible hover/focus. It cannot be hidden again without restoring the orb.

## Activity State Matrix

| Activity | Eyes | Mouth | Energy | Visible cue |
| --- | --- | --- | --- | --- |
| Sleeping | Closed, relaxed arcs | Neutral small curve | Dim core; no particles | `Sleeping` |
| Idle | Open, soft round eyes | Small friendly smile | Slow breathing glow | `Idle` |
| Working | Narrower focused eyes | Short neutral line | Purposeful pulse and up to three moving particles | `Working` |
| Waiting | Open attentive eyes | Small open or raised curve | Amber interaction marker; no frantic motion | `Waiting` |
| Celebration | Bright relaxed eyes | Clear smile | One outward glow and particle flourish, then idle | `Done` during the response only |

Waiting uses the attentive expression even when the underlying session also reports running. Celebration lasts approximately two seconds and never loops.

## Pressure Modifier Matrix

Pressure modifies the halo and supporting accent without replacing the activity expression.

| Pressure | Halo | Accent | Motion | Label behavior |
| --- | --- | --- | --- | --- |
| Unknown | Neutral, low-contrast outline | DSH primary/blue family | Activity motion only | Omit numeric percentage |
| Normal | Calm blue/cyan halo | DSH brand or business state | Activity motion only | Percentage available in details |
| Attention | Warm amber halo with stronger separation | `--dsw-alias-state-warn-primary` family | No additional repetition | Pressure is also named in accessible text |
| Warning | Strong warm/error-adjacent halo and thicker ring | Warning/error semantic family | No flashing or shake | Pressure is named in visible/accessibility text |

The implementation consumes DSH semantic tokens and defines only component-local derived properties. It must not copy DSH palette values or create a second global theme.

## Combined-State Rules

1. Activity selects the face and activity motion.
2. Pressure selects the halo and pressure accent.
3. Waiting may add an amber interaction marker even under normal pressure; the marker and pressure ring must remain visually distinguishable by placement or shape.
4. Warning never changes the face into an error expression because high context is advisory, not failure.
5. Sleeping with unknown pressure remains dim and neutral.
6. Celebration inherits the current pressure ring and changes only the transient activity response.

## Theme Integration

Use these DSH semantic roles when available:

| Companion role | DSH token family |
| --- | --- |
| Panel background | `--dsw-alias-bg-overlay`, `--dsw-alias-bg-layer-2` |
| Primary text | `--dsw-alias-label-primary` |
| Secondary text | `--dsw-alias-label-secondary`, `--dsw-alias-label-tertiary` |
| Border | `--dsw-alias-border-l2`, `--dsw-alias-border-l3` |
| Normal accent | `--dsw-alias-brand-primary`, `--dsw-alias-state-business-primary` |
| Waiting/attention | `--dsw-alias-state-warn-primary`, `--dsw-alias-state-warn-label` |
| Celebration | `--dsw-alias-state-success-primary` |
| Warning emphasis | `--dsw-alias-state-warn-primary`; error tokens only for sufficient contrast |
| Focus/hover | `--dsw-alias-interactive-bg-hover-accent`, existing focus conventions |

The same component CSS serves light and dark themes. Theme-specific selectors do not belong in the plugin. Component-local fallbacks exist only so the companion remains legible if a supported semantic token is absent.

## Typography and Numbers

- Use DSH's font family and small text roles, preferably `--dsw-font-xs-13` or `--dsw-font-xxs-12` families.
- Use tabular numerals for token counts and percentages.
- Format token counts with locale-aware grouping.
- Keep metric labels left aligned and values right aligned.
- Context is the first and strongest row; other rows use equal visual weight.
- Do not use decorative display typography.

## Popover Content

### Full Data Example

| Label | Example |
| --- | ---: |
| Context | `74% · 94,720 / 128,000` |
| Billed input | `12,430` |
| Output | `2,110` |
| Cache hit | `68%` |
| Steps | `9` |

### Missing Data

- If context cannot be calculated, omit the context row rather than showing `0%`.
- If all token data is absent, omit token rows.
- If billed input is zero, omit cache hit.
- If steps are absent, omit steps.
- Do not show an empty placeholder card. If no metric is available, show a short `Usage unavailable` message only while the user deliberately opens the panel.

## Interaction States

| State | Visual response |
| --- | --- |
| Hover | Slight elevation or glow increase; popover opens |
| Keyboard focus | Clear focus outline independent of pressure halo; popover opens |
| Pinned | Popover remains; pin state is conveyed through `aria-expanded` and stable panel presence |
| Dragging | Orb follows pointer without scale flourish; text selection is suppressed only during drag |
| Drag release | Position settles without bounce |
| Collapsing | Short fade/scale into edge tab; no long travel across the viewport |
| Restoring | Edge tab gives way to orb at the saved clamped position |

Movement under four CSS pixels remains a click, not a drag.

## Motion Specification

| Motion | Duration | Loop | Purpose |
| --- | ---: | --- | --- |
| Idle breathing | 2400ms | Yes | Quiet living presence |
| Working pulse | 1200ms | Yes while working | Active execution |
| Working particles | 1600–2400ms staggered | Yes while working | Data movement |
| Waiting cue | 1600ms opacity emphasis | Yes while waiting | Required attention without urgency |
| Celebration | 2000ms total | No | Work completion acknowledgement |
| Hover/focus transition | 120–180ms | No | Responsiveness |
| Popover appearance | 140–180ms | No | Spatial continuity |

No motion may flash, shake, or alternate high-contrast colors. Timing may be reduced slightly during implementation when visual review shows sluggishness, but celebration remains approximately two seconds.

## Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- Stop breathing, orbiting, particle travel, and repeated waiting motion.
- Replace celebration with one static success accent that settles immediately to idle.
- Keep short opacity changes only when needed to reveal the popover.
- Preserve activity expressions, pressure ring, labels, and focus indicators.

The Synthetic State Matrix includes a reduced-motion presentation so this is reviewed rather than assumed.

## Responsive Behavior

- Clamp the orb and tab after every viewport resize.
- Flip the popover to the available side of the orb before reducing its width.
- At compact width, maintain a 16px popover-to-viewport gap.
- The orb remains 88px in the MVP; it does not shrink with viewport width.
- Long localized labels may wrap inside the popover but never overlap metric values.

## Accessibility Review Checklist

- Activity is identifiable without animation.
- Pressure is identifiable without color.
- Focus outline remains visible over every pressure halo.
- Text and meaningful UI meet WCAG AA contrast against their actual rendered background.
- Native button targets meet the defined sizes.
- Popover content follows a logical reading order.
- Decorative particles and facial geometry are hidden from the accessibility tree.
- The accessible name contains activity and known pressure.

## Synthetic Visual Gallery

The gallery renders production components for these required scenarios:

| Scenario | Activity | Pressure | Detail state |
| --- | --- | --- | --- |
| No session | Sleeping | Unknown | Closed |
| Idle unknown | Idle | Unknown | Open without fabricated metrics |
| Working 42% | Working | Normal | Full metrics |
| Waiting 65% | Waiting | Normal | Interaction cue |
| Attention 74% | Idle | Attention | Full metrics |
| Warning 92% | Working | Warning | Full metrics |
| Celebration | Transition response | Normal | Frozen deterministic frame |

Review every scenario in light and dark themes. Screenshot coverage additionally includes desktop and compact widths, closed and pinned details, and reduced-motion mode.

## Visual Acceptance Gate

Before accepting the implementation:

1. Every state remains readable in a gallery image scaled to approximately 1000px wide.
2. The main reading order is orb → activity → pressure → optional metrics.
3. Popovers do not clip at the required viewport sizes.
4. Focus and pressure rings do not visually merge.
5. Waiting and warning are distinguishable.
6. Reduced motion communicates the same meaning.
7. The companion feels original and does not resemble an existing mascot.

## Related Documents

- [Product Design](./product-design.md)
- [Architecture](../architecture.md)
- [MVP User Stories](./2026-08-16-mvp-user-stories.md)
- [Approved Design Record](../superpowers/specs/2026-08-15-dsh-companion-design.md)
