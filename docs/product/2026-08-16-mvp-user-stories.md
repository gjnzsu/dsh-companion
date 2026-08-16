# DSH Companion MVP User Stories

## Purpose

The original MVP scope is too large to estimate or deliver as one user story. It combines three distinct outcomes: ambient session awareness, on-demand inspection and control, and confidence that the plugin can be installed and maintained safely. This backlog therefore treats the MVP as three epics and splits each epic into independently testable vertical stories.

## Roles

- **DSH developer:** Uses DSH Web to run agent sessions and needs status and context information without interrupting their work.
- **New DSH Companion user:** Installs the plugin and needs to understand its behavior, privacy, and limitations.
- **Plugin maintainer:** Reviews, tests, packages, and releases the plugin without requiring model credentials.

## Sizing Scale

| Size | Expected effort | Rule |
| --- | --- | --- |
| S | Up to 1 focused engineering day | One narrow behavior and its tests |
| M | 1–3 focused engineering days | One complete user outcome across UI, behavior, and tests |

No MVP story is larger than M. If implementation evidence pushes a story beyond three focused days, split it again using its acceptance-criteria branches before continuing.

## Epic Summary

| Epic | User outcome | Why it is epic-sized | Stories |
| --- | --- | --- | --- |
| E1 — Ambient Session Awareness | Understand agent activity and context pressure at a glance | Combines installation, four activity rules, pressure rules, and session-selection behavior | US-01–US-04 |
| E2 — Inspect and Control | Inspect usage and control how the companion behaves in the workspace | Combines metric display, popover interaction, placement, visibility, keyboard access, and motion preferences | US-05–US-08 |
| E3 — Trust and Release | Install and maintain the plugin with reproducible, credential-free evidence | Combines synthetic coverage, visual review, package integrity, real DSH integration, and onboarding | US-09–US-13 |

Design reference for every story: [DSH Companion Design](../superpowers/specs/2026-08-15-dsh-companion-design.md).

---

## Epic E1: Ambient Session Awareness

### US-01: See a Companion in DSH Web

**Card**

As a DSH developer, I want a friendly companion to remain visible above DSH Web, so that agent status has a consistent place in my workspace.

**Conversation**

- The companion is one original Living Data Orb, not an animal or an imitation of an existing assistant mascot.
- It belongs to the global shell overlay and must not replace a page, sidebar, or conversation surface.
- The empty-session state is useful: it confirms the plugin is present without inventing session data.

**Size:** M

**Confirmation**

1. Given the plugin is installed in the Web profile, when DSH Web starts, then exactly one companion appears in `shell.overlay`.
2. Given no session is selected, when the companion renders, then it shows the sleeping state and no numeric usage values.
3. Given the user clicks elsewhere in DSH Web, when the pointer is outside the orb or its popover, then the overlay does not block the underlying page.
4. Given the plugin is unloaded, when its client fiber is disposed, then its slot registration, listeners, timers, and style contribution are removed.

### US-02: Understand Agent Activity at a Glance

**Card**

As a DSH developer, I want the companion to show whether the selected agent is idle, working, or waiting for me, so that I know when to watch, intervene, or continue other work.

**Conversation**

- Activity comes only from the selected session summary.
- A pending approval, plan review, or question is more important than a simultaneous running signal.
- A brief celebration acknowledges completion without becoming a durable session state.

**Size:** M

**Confirmation**

1. Given the selected session is neither running nor waiting, when it is displayed, then the companion shows idle.
2. Given the selected session is running with no pending interaction, when it is displayed, then the companion shows working.
3. Given the selected session has a pending interaction, when it is displayed, then the companion shows waiting even if the session also reports running.
4. Given the same session changes from working to idle, when the transition occurs, then one celebration appears for approximately two seconds and returns to idle.
5. Given the companion first mounts on an already-idle session, when it renders, then it does not play a false completion celebration.

### US-03: See Context Pressure Before It Becomes a Surprise

**Card**

As a DSH developer, I want the companion to show context pressure as an ambient visual signal, so that I can notice when a session is approaching its context limit.

**Conversation**

- Pressure is independent of activity: a working agent can still be normal, attention, or warning.
- The percentage uses the projected next-request context value divided by the context window.
- Missing or invalid projection data remains unknown; it is not shown as zero.

**Size:** S

**Confirmation**

1. Given valid context occupancy below 70%, when the companion renders, then pressure is normal.
2. Given occupancy from 70% up to but not including 85%, when the companion renders, then the attention treatment appears.
3. Given occupancy of 85% or more, when the companion renders, then the warning treatment appears without flashing.
4. Given projected tokens or context capacity is unavailable or invalid, when the companion renders, then pressure is unknown and no percentage is fabricated.
5. Given occupancy exceeds 100%, when details are displayed, then the visible percentage is capped at 100% while the derivation remains testable with the raw value.

### US-04: Follow the Current Session Reliably

**Card**

As a DSH developer, I want the companion to follow the session I select, so that it never shows status or usage from the wrong agent.

**Conversation**

- The DSH session list's `current` value is the only selection authority.
- The companion does not cache a second current-session identity.
- Transient presentation from the previous session must not leak into the next one.

**Size:** S

**Confirmation**

1. Given session Alpha is selected, when its summary changes, then the companion updates from Alpha's current fields.
2. Given the user changes selection from Alpha to Beta, when the current-session snapshot changes, then the companion promptly displays Beta's state and metrics.
3. Given Alpha was celebrating or had a pinned panel, when Beta becomes current, then Alpha's celebration and pin state are cleared.
4. Given a selected session has projection keys the plugin does not use, when it renders, then those keys are ignored without errors.
5. Given selection becomes empty, when the snapshot updates, then the companion returns to sleeping.

---

## Epic E2: Inspect and Control

### US-05: Inspect Available Usage Details

**Card**

As a DSH developer, I want to reveal compact usage details from the companion, so that I can inspect context and token consumption without opening a diagnostic screen.

**Conversation**

- Context is the first and most prominent row.
- Billed input follows the Harness definition: uncached input plus cache reads plus cache writes.
- Cache hit is cache-read tokens divided by billed input and is absent when billed input is zero.

**Size:** M

**Confirmation**

1. Given pointer hover or keyboard focus on the orb, when the panel opens, then context is shown before token and step metrics.
2. Given complete token usage exists, when the panel opens, then billed input, output, cache hit, and steps use readable formatted numbers.
3. Given one optional metric is unavailable, when the panel opens, then only that row is omitted and the remaining rows stay visible.
4. Given no authoritative usage exists, when the panel opens, then it does not show fabricated zero rows.
5. Given context occupancy exceeds 100%, when the panel opens, then the displayed value is at most 100%.

### US-06: Keep Details Open Only When Needed

**Card**

As a DSH developer, I want to pin and dismiss the usage panel, so that I can either compare metrics deliberately or return to an unobtrusive companion.

**Conversation**

- Hover and focus are temporary disclosure modes.
- Clicking toggles a page-lifetime pinned mode.
- Standard dismissal actions must work without requiring a pointer.

**Size:** S

**Confirmation**

1. Given the panel is not pinned, when hover or focus leaves the companion, then the panel closes after ordinary hover intent.
2. Given the user clicks the orb, when the panel is open, then it stays pinned after hover leaves.
3. Given the panel is pinned, when the user clicks the orb again, presses Escape, or clicks outside, then it closes.
4. Given the user interacts inside the popover, when that interaction occurs, then the panel does not treat it as an outside click.
5. Given a session switch occurs, when the new selection renders, then pinned state is cleared.

### US-07: Place, Collapse, and Restore the Companion

**Card**

As a DSH developer, I want to place or collapse the companion, so that it fits my workspace without becoming permanently unreachable.

**Conversation**

- Placement is local browser preference, not durable session data.
- Collapsing leaves a small labeled edge tab as an obvious recovery path.
- Invalid storage or viewport changes must not strand the companion offscreen.

**Size:** M

**Confirmation**

1. Given the user drags the orb, when the pointer is released, then the orb stays at the clamped viewport position.
2. Given a saved position exists, when DSH Web reloads, then the companion restores that position in the same browser profile.
3. Given the user collapses the companion, when collapse completes, then a labeled `Show DSH Companion` tab appears at the nearest viewport edge.
4. Given the edge tab is visible, when the user activates it, then the orb returns and the tab disappears.
5. Given stored preferences are malformed or storage access fails, when the companion starts, then it remains usable with safe in-memory defaults.
6. Given the viewport shrinks, when resize handling runs, then the orb or recovery tab remains reachable.

### US-08: Use a Calm and Accessible Companion

**Card**

As a DSH developer who uses keyboard navigation or reduced motion, I want the companion to communicate the same information accessibly, so that its status is useful without causing discomfort or requiring a pointer.

**Conversation**

- Native controls and familiar keyboard behavior are required.
- Activity and pressure cannot depend on color alone.
- Reduced motion preserves meaning while removing travel, bursts, and nonessential pulsing.

**Size:** M

**Confirmation**

1. Given keyboard navigation, when focus reaches the orb, then it is a native button with a visible focus indicator and can open or pin details.
2. Given a known session state, when assistive technology reads the orb, then its accessible name includes activity and known context pressure.
3. Given pressure changes, when the companion renders, then expression or text changes accompany color changes.
4. Given `prefers-reduced-motion: reduce`, when activity changes, then particles, celebration bursts, and nonessential pulsing are suppressed while state labels and expressions remain.
5. Given the panel is open, when the user presses Escape, then focus remains usable and the panel closes.

---

## Epic E3: Trust and Release

### US-09: Exercise Product Rules Without a Model Key

**Card**

As a plugin maintainer, I want a shared synthetic state matrix, so that I can verify every companion state without consuming model quota or relying on a live session.

**Conversation**

- Synthetic fixtures are inputs to real production derivation and components, not alternate implementations.
- The matrix covers representative states; exact threshold boundaries remain table-driven unit tests.
- Synthetic tests do not replace the one real DSH integration smoke.

**Size:** M

**Confirmation**

1. Given no API key, when the unit and component suite runs, then it covers no session, idle unknown, working 42%, waiting 65%, attention 74%, warning 92%, and celebration.
2. Given threshold tests run, when occupancy is 69.99%, 70%, 84.99%, and 85%, then each boundary produces the specified pressure band.
3. Given missing and invalid projection fields, when derivation tests run, then unavailable metrics remain absent.
4. Given component interaction tests run, when hover, focus, pin, Escape, drag, collapse, storage failure, session switching, and reduced motion are exercised, then each behavior has an observable assertion.
5. Given the matrix changes, when its completeness test runs, then duplicate ids or missing durable states fail the suite.

### US-10: Review Every Visual State in One Gallery

**Card**

As a plugin maintainer, I want a lightweight visual gallery of real companion components, so that I can review state design quickly without adding a full component-workbench dependency.

**Conversation**

- The gallery is development-only and credential-free.
- It consumes the same synthetic scenarios as the component tests.
- It freezes time and motion where screenshots require deterministic output.

**Size:** M

**Confirmation**

1. Given the gallery starts locally, when it loads without DSH or credentials, then every synthetic scenario renders with the real production components.
2. Given light or dark query mode, when the gallery renders, then every scenario uses the requested theme.
3. Given desktop or compact viewport sizes, when the gallery renders, then labels, orb, and open popover remain readable and unclipped.
4. Given reduced-motion mode, when the gallery renders, then the visual state remains understandable without moving particles or celebration travel.
5. Given Playwright captures the approved matrix twice, when no product CSS changed, then all screenshots match their baselines.

### US-11: Install a Complete npm Bundle

**Card**

As a new DSH Companion user, I want one installable npm bundle, so that I can add the companion to my Web profile with the normal DSH plugin command.

**Conversation**

- The same package carries bundle metadata, the no-op host entry, client artifact, types, patch, license, and README.
- The client build is self-contained and does not import Harness monorepo-only build files.
- The supported package contract targets DSH `0.1.0-rc.5` exactly.

**Size:** M

**Confirmation**

1. Given the built package, when `pnpm pack` runs, then the tarball contains the host entry, client entry, declarations, `cordis.patch.yml`, license, README, and package manifest.
2. Given the package is installed with `dsh plugin --profile web add dsh-companion`, when the profile config is dumped, then the `dsh-companion` row is present.
3. Given the built host entry is imported, when its `apply()` runs, then it completes without adding host behavior.
4. Given the client artifact is inspected, when it loads, then it registers through the DSH client module-loader wrapper.
5. Given a later incompatible Harness release candidate, when a user reads package documentation, then the `0.1.0-rc.5` compatibility limit is explicit.

### US-12: Prove the Packed Plugin in Real DSH Web

**Card**

As a plugin maintainer, I want a keyless smoke test of the packed plugin in official DSH Web, so that synthetic tests cannot silently drift away from the supported slot and projection APIs.

**Conversation**

- The smoke uses a fresh temporary DSH home and official `?fixture` mode.
- It installs the tarball through the user-facing plugin command.
- It verifies only the thin integration seam; detailed behavior stays in faster synthetic tests.

**Size:** M

**Confirmation**

1. Given a fresh temporary Web profile, when the packed bundle is installed, then config composition includes `dsh-companion`.
2. Given official DSH Web starts in fixture mode, when the page loads, then exactly one working companion appears for the current fixture session.
3. Given the smoke selects a different fixture session, when selection settles, then the companion follows the new session's activity.
4. Given the user clicks an ordinary DSH surface outside the companion, when the click occurs, then the overlay does not intercept it.
5. Given the smoke exits, when cleanup runs, then the spawned server stops and only its own temporary DSH home is removed.

### US-13: Understand Installation, Privacy, and Limits

**Card**

As a new DSH Companion user, I want concise setup and privacy documentation, so that I know how to use the plugin and what data it can access before installing it.

**Conversation**

- Documentation covers ordinary use, not internal implementation history.
- Privacy claims must match the client-only architecture.
- Limitations prevent users from expecting cost, history, growth mechanics, or non-Web support in `0.1.0`.

**Size:** S

**Confirmation**

1. Given a new user opens the README, when they follow installation steps, then they have exact add, restart, and remove commands.
2. Given the user reads the state guide, when they see sleeping, idle, working, waiting, attention, or warning, then the meaning and thresholds are clear.
3. Given the user reads the metrics guide, when billed input and cache hit are described, then the formulas match Harness accounting.
4. Given the user reads the privacy section, when evaluating risk, then it states that the plugin reads numeric/status projections and has no telemetry, prompt inspection, tool-output inspection, credential access, provider-account access, or remote service.
5. Given the user reads limitations, when evaluating fit, then DSH Web-only, selected-session-only, no streaming estimates, no pricing, no history, no growth mechanics, and no cloud sync are explicit.

---

## Story Validation

### INVEST Check

| Check | Result |
| --- | --- |
| Independent | Each story produces an observable user or maintainer outcome; implementation sequencing is recommended but acceptance does not depend on unfinished technical layers. |
| Negotiable | Stories state outcomes and product rules while leaving internal component composition open to implementation review. |
| Valuable | Every story benefits a DSH developer, new user, or maintainer; no story is merely “build the UI” or “write the backend.” |
| Estimable | Each story has bounded inputs, rules, and confirmation scenarios. |
| Small | Every story is S or M and expected to fit within three focused engineering days. |
| Testable | Every story contains four to six observable acceptance criteria. |

### Split Patterns Used

| Original scope | Pattern | Result |
| --- | --- | --- |
| Ambient companion state | Business-rule variations | Activity, pressure, and session fidelity are separate stories. |
| Usage popover and controls | Workflow steps and acceptance-criteria complexity | Inspect, pin/dismiss, place/restore, and accessible use are separate outcomes. |
| Testing and release | Major effort and external integration | Synthetic confidence, visual review, package integrity, real DSH smoke, and onboarding are separate stories. |

### Recommended Delivery Order

`US-01 → US-02 → US-03 → US-04 → US-05 → US-06 → US-07 → US-08 → US-09 → US-10 → US-11 → US-12 → US-13`

This order minimizes rework, but stories remain reviewable as vertical outcomes. Engineering tasks may share foundations without turning those foundations into user stories.
