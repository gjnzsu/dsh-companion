# DSH Companion

DSH Companion is a small status and context-pressure companion for DeepSeek Harness Web. It follows the selected session and keeps optional usage details close without reading conversation content.

## Install

Add the plugin to the Web profile:

```sh
dsh plugin --profile web add dsh-companion
```

Restart DSH Web:

```sh
dsh web
```

Remove the plugin with:

```sh
dsh plugin --profile web remove dsh-companion
```

## What the orb means

- **Sleeping** means no session is selected yet.
- **Idle** means the selected session is not running.
- **Working** means the selected session is running.
- **Waiting** means the selected session needs an answer, approval, or other interaction. Waiting takes priority over working.
- **Celebration** is a short transition shown when active work finishes.
- **Attention** begins when projected context use reaches 70%.
- **Warning** begins when projected context use reaches 85%.

## Usage

Hover the orb or move keyboard focus to it to preview its details. Click the orb to pin the panel open. Press Escape or click outside the companion to close a pinned panel. Drag the orb to place it elsewhere in the viewport. Use the collapse control to reduce it to a reachable edge tab, then activate that tab to restore it.

## Metrics

The panel reports only values supplied by the selected session's projections:

- **Context** is projected token use divided by the model context window.
- **Billed input** is uncached input plus cache-read tokens plus cache-write tokens.
- **Output** is the projected output-token count.
- **Cache hit** is cache-read tokens divided by billed input, rounded to a whole percentage.
- **Steps** is the projected completed-step count.

Unavailable values are omitted instead of estimated.

## Privacy

DSH Companion runs in the Web client and observes numeric usage and status projections already delivered for the selected session. It has no telemetry, remote service, cloud synchronization, prompt or conversation-content inspection, tool-output inspection, credential access, or provider-account access. Its local preferences contain only position and collapsed-state settings.

## Compatibility

Version 0.1.0 targets **DeepSeek Harness 0.1.0-rc.5** exactly. Harness is in developer preview, so later release candidates may require a DSH Companion update.

The Harness client injects the runtime and layout modules named in the package manifest. They are host-provided plugin modules, not npm install dependencies.

## Development

Development requires Node.js `^22.19.0 || >=24.0.0` and pnpm `11.15.1`.

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm gallery
pnpm test:visual
pnpm pack:check
```

Run the keyless packed-plugin smoke against a source checkout of Harness from PowerShell:

```powershell
$env:DSH_REPO='C:\SourceCode\deepseek-harness'
pnpm test:smoke
```

The smoke creates an isolated temporary `DSH_HOME`, installs a freshly packed tarball through the normal plugin command, opens official Web fixture mode, and removes only the temporary home and process it owns.

## Limitations

Version 0.1.0 supports DSH Web and the selected session only. It does not provide streaming estimates, pricing or cost calculations, history, growth mechanics, multiple companions, prompt or tool-content analysis, or cloud synchronization.
