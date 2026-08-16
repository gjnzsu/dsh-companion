# DSH Companion Product Design

**Status:** Approved for MVP implementation
**Product:** DSH Companion
**Release target:** `0.1.0`
**Primary surface:** DeepSeek Harness Web

## Product Summary

DSH Companion is an ambient session-status companion for DSH Web. It gives the current agent session a friendly, persistent presence and makes context pressure visible without requiring the developer to read a status bar or open diagnostics.

The MVP is a status-first product. The companion's expression and motion answer “what is the agent doing?” Detailed usage is available on demand and remains visually secondary.

## Problem

Agent work often continues while the developer reads code, changes windows, or waits for a tool. DSH already records execution and token information, but three facts are easy to miss during normal work:

1. Whether the current session is working, idle, or blocked on the developer.
2. Whether context occupancy is becoming high enough to deserve attention.
3. What the session's current usage figures are when the developer chooses to inspect them.

The problem is not missing telemetry. It is that the existing information requires deliberate reading. DSH Companion turns it into a glanceable, calm signal.

## Target Users

### Primary: DSH Developer

A developer who runs agent sessions in DSH Web and frequently divides attention between the agent and other work.

### Secondary: New Plugin User

A developer evaluating whether to install the plugin who needs clear compatibility, privacy, and limitation information.

### Supporting: Plugin Maintainer

A contributor who needs credential-free, reproducible evidence for product states and DSH integration.

## Core Job

When I am working alongside an agent, I want to understand its activity and context pressure with a quick glance, so I can decide whether to keep waiting, respond, inspect usage, or start a fresh session.

## Product Promise

The user should be able to answer these questions without opening the details panel:

- Is there a current session?
- Is the agent idle, working, or waiting for me?
- Is context pressure normal, worth noticing, or high?

Opening details should answer:

- How full is the projected context?
- How many billed input and output tokens have accumulated?
- What is the cache-hit share when it can be calculated?
- How many steps have completed?

## Design Principles

### Status First

Activity and context pressure are the default experience. Usage numbers appear only when requested.

### Ambient, Not Demanding

The companion may attract attention when user action or high pressure matters, but it must not flash, cover work, or demand continuous reading.

### Friendly, Not Gimmicky

The Living Data Orb has a recognizable face and reactions, but the MVP avoids feeding, leveling, collections, and retention mechanics. Personality serves comprehension.

### Honest About Data

Missing metrics remain unknown or absent. The product never displays a fabricated zero, price, balance, or streaming estimate.

### Native to DSH

The plugin follows the current DSH session, uses existing projections, consumes DSH semantic style tokens, and respects DSH lifecycle and accessibility patterns.

### Observational by Default

Installing the companion does not change prompts, tools, model requests, token use, or durable session events.

## Experience Model

The experience combines two independent signals:

1. **Activity** describes what the selected agent is doing.
2. **Pressure** describes projected context occupancy.

This independence is important. A working agent can have normal, attention, warning, or unknown pressure. Pressure does not replace the activity expression.

### Activity

| State | User meaning | Product response |
| --- | --- | --- |
| Sleeping | No session is selected | Resting orb; no invented usage |
| Idle | The current session is ready | Calm expression and low-energy presence |
| Working | The agent is executing | Focused expression and purposeful energy |
| Waiting | The developer must respond | Attentive expression and amber interaction cue |
| Celebration | The same session just finished work | Brief positive response, then idle |

Waiting takes precedence over working because required user action is the more important message. Celebration is a two-second presentation response to a working-to-idle transition, not a durable fifth activity state.

### Context Pressure

| Band | Occupancy | User meaning |
| --- | ---: | --- |
| Unknown | Required projection data is absent or invalid | The product cannot make an honest pressure claim |
| Normal | Below 70% | No action suggested |
| Attention | 70% to below 85% | Notice the session's growing context |
| Warning | 85% or above | Consider compaction, completion, or a fresh session |

The visible percentage is capped at 100%. Thresholds are fixed for the MVP so users learn one shared visual language.

## Main User Journey

1. The developer installs DSH Companion into the Web profile and restarts DSH Web.
2. One orb appears in the global overlay. With no current session it sleeps.
3. Selecting a session updates the orb to that session's activity and pressure.
4. The developer glances at the orb during work without opening any panel.
5. Hovering or focusing reveals usage. Clicking pins the panel for comparison.
6. The developer may drag the orb or collapse it into a recoverable viewport-edge tab.
7. Switching sessions immediately replaces the displayed data and clears stale transient presentation.

## Interaction Summary

| Intent | Interaction | Result |
| --- | --- | --- |
| Inspect briefly | Hover or focus | Open details temporarily |
| Inspect continuously | Click orb | Pin or unpin details |
| Dismiss | Escape or outside click | Close pinned details |
| Reposition | Pointer drag | Save clamped local position |
| Reduce presence | Activate collapse control | Replace orb with labeled edge tab |
| Restore | Activate edge tab | Restore orb at its saved position |

The surrounding overlay is click-through. Only the orb, popover, and recovery tab receive pointer input.

## Usage Information

The popover presents available data in this order:

1. Projected context occupancy and projected tokens versus context window.
2. Billed input tokens.
3. Output tokens.
4. Cache-hit percentage.
5. Completed steps.

Billed input is uncached input plus cache-read and cache-write tokens. Cache hit is cache-read tokens divided by billed input, rounded to an integer and omitted when billed input is zero.

## Accessibility

- The orb and recovery tab are native buttons.
- The orb's accessible name includes activity and known context pressure.
- Expression and visible text accompany color, so color is never the only signal.
- Keyboard focus is visible; Enter and Space activate controls; Escape closes details.
- Reduced-motion preference removes travel, bursts, orbiting particles, and nonessential pulsing while preserving expressions and labels.
- The companion and popover stay reachable after viewport changes.

Detailed geometry, state appearance, motion, and theme behavior live in [Visual Design](./visual-design.md).

## Success Criteria

### Primary Outcome

A developer can identify the selected agent's activity and context-pressure band at a glance without reading the DSH status line or opening the popover.

### MVP Evidence

- Every durable activity and pressure band is distinguishable in the Synthetic State Matrix.
- Keyboard and reduced-motion users receive the same state meaning.
- Missing usage is recognizable as unknown rather than zero.
- The overlay does not block ordinary DSH Web interaction.
- A packed plugin follows session selection in official DSH Web fixture mode.

The MVP has no telemetry, so success is evaluated through product review, accessibility checks, visual regression, and direct usability feedback rather than behavioral tracking.

## MVP Scope

- Friendly Living Data Orb in DSH Web's global overlay.
- Current-session sleeping, idle, working, waiting, and completion response.
- Normal, attention, warning, and unknown context pressure.
- Hover/focus details and click-to-pin behavior.
- Available context, billed-input, output, cache-hit, and step metrics.
- Drag placement, local persistence, collapse, and guaranteed restore path.
- Keyboard access and reduced motion.
- Synthetic tests, visual gallery, screenshot regression, package verification, and real DSH Web smoke coverage.

The delivery backlog is split into three epics and thirteen stories in [MVP User Stories](./2026-08-16-mvp-user-stories.md).

## Non-Goals for `0.1.0`

- Streaming token estimates.
- Pricing, monetary cost, provider balance, or quotas.
- Daily, weekly, or monthly history.
- Feeding, growth, leveling, rewards, cosmetics, or multiple companions.
- CLI, desktop, IDE, or other non-Web surfaces.
- New host APIs, custom session events, or duplicated event-log processing.
- Telemetry, accounts, remote services, or cloud synchronization.

## Product Risks and Responses

| Risk | Product response |
| --- | --- |
| Companion becomes distracting | Restrained default motion, reduced-motion support, collapse control |
| Pressure looks like an exact billing or safety limit | Use “projected” language and three broad bands |
| Missing provider data looks like zero usage | Omit unknown metrics and retain neutral pressure |
| Cute presentation undermines developer trust | Keep status meaning explicit and avoid game mechanics |
| Existing DSH UI changes | Name the supported Harness release and keep one real integration smoke |

## Related Documents

- [Visual Design](./visual-design.md)
- [Architecture](../architecture.md)
- [MVP User Stories](./2026-08-16-mvp-user-stories.md)
- [Approved Design Record](../superpowers/specs/2026-08-15-dsh-companion-design.md)
- [Implementation Plan](../superpowers/plans/2026-08-16-dsh-companion-implementation.md)
