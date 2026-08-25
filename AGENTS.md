# AGENTS.md — Coding Agent Guidelines for soundcloud-desktop

## Project Overview

A Tauri v2 desktop application that wraps the SoundCloud website in a WebView and injects
a TypeScript script to expose playback controls as native OS media keys.

Architecture:

- `packages/inject/` — TypeScript browser injection script (built with Bun bundler → IIFE)
- `src-tauri/` — Rust/Tauri backend that loads SoundCloud in a WebView and evals the bundle

The Rust backend reads `packages/inject/dist/index.js` at runtime, so the inject package

---

## Build Commands

### TypeScript (packages/inject)

```bash
# Install dependencies (uses Bun as package manager)
bun install

# Build the inject bundle (outputs to packages/inject/dist/index.js)
cd packages/inject && bun run build

# Lint (oxlint + oxfmt --check, run concurrently)
cd packages/inject && bun run lint

# Auto-fix lint and formatting issues
cd packages/inject && bun run lint:fix
```

### Rust / Tauri (src-tauri)

```bash
# Dev mode — also runs the inject build first via beforeDevCommand
cargo tauri dev

# Production build — also runs the inject build first via beforeBuildCommand
cargo tauri build

# Format Rust code
cargo fmt

# Lint Rust code
cargo clippy

# Run all tests
cargo test --lib

# Run a single test by name
cargo test --lib -- test_name

# Run tests in a specific module
cargo test --lib -- discord_tests

# Run a specific test function
cargo test --lib -- truncate_discord_text
```

---

## Repository Structure

```plaintext
soundcloud-desktop/
├── packages/
│   └── inject/               # TypeScript injection script
│       ├── src/
│       │   ├── index.ts       # Entry point
│       │   ├── lib/           # Utilities (debounce, playManager, utils, webpack)
│       │   └── types/        # SoundCloud internal type definitions
│       ├── scripts/build.ts   # Bun.build() config — IIFE bundle
│       ├── dist/              # Build output (committed)
│       ├── .oxlintrc.json     # Linter config (oxlint)
│       ├── .oxfmtrc.json      # Formatter config (oxfmt)
│       └── tsconfig.json
└── src-tauri/
    ├── src/
    │   ├── main.rs           # Windows subsystem entry point
    │   ├── lib.rs            # App bootstrap: window, state, IPC handlers
    │   ├── commands.rs       # Tauri command handlers (thin delegation layer)
    │   ├── commands_tests.rs # Tests for commands (#[path] pattern)
    │   ├── discord.rs        # Discord Rich Presence — 3-layer architecture
    │   ├── discord_tests.rs  # Tests for discord module (#[path] pattern)
    │   ├── models.rs         # Data models (SoundAttributes, PlaybackState)
    │   └── tray.rs           # System tray handling
    ├── capabilities/          # Tauri permissions
    └── tauri.conf.json       # Tauri app configuration
```

---

## Test File Organization

Rust tests are in separate `*_tests.rs` files using the `#[path]` attribute pattern:

```rust
// At end of discord.rs
#[cfg(test)]
#[path = "discord_tests.rs"]
mod tests;
```

This keeps test code physically separate while maintaining access to private functions
via `use super::*;`. Do not inline tests in source files.

---

## Rust Architecture: discord.rs (3-Layer)

The `discord.rs` module uses a clear separation of concerns:

1. **Layer A — Pure functions** (testable, no side effects):
   - `truncate_discord_text()`, `PresenceFields::from_attributes()`, `build_activity()`
   - State mutation helpers: `apply_track_change()`, `apply_playback_change()`, `apply_seek()`

2. **Layer B — Discord IPC operations**:
   - `send_presence()`, `clear_presence()`, `update_presence_locked()`
   - Handle Discord client connection, mark `None` on failure for reconnect

3. **Layer C — Event handlers** (public API called from commands.rs):
   - `handle_track_changed()`, `handle_playback_changed()`, `handle_seeked()`
   - Manage state updates, pause timeouts, presence updates

When adding new functionality, place it in the appropriate layer.
Functions in Layer A should be pure and unit-testable.

---

## TypeScript Code Style

### Linter/Formatter (oxlint + oxfmt)

Run `bun run lint:fix` to auto-format and auto-fix lint issues. Config in `.oxlintrc.json`
(lint) and `.oxfmtrc.json` (format):

- 2-space indentation, double quotes, semicolons omitted unless required
- ES5 trailing commas, auto-sorted imports and Tailwind classes
- Suppress a rule for one line with `// oxlint-disable-next-line <plugin>/<rule> -- <reason>`
  — the reason after `--` is required
- Ignored paths (e.g. `dist`) are listed in each package's `.oxlintrc.json` /
  `.oxfmtrc.json` under `ignorePatterns`, not a shared root-level ignore file

### Imports

```ts
// Relative paths with .ts extension for local modules
import { panic } from "./utils"
import { getNativePlayer } from "./lib/nativePlayer"

// Type-only imports MUST use `import type`
import type { NativePlayer } from "./lib/nativePlayer"

// No path aliases — use relative paths only
```

### Error Handling

Use `panic()` for unrecoverable errors; prefer early returns for expected failures.

```ts
const player = getPlayerModule() ?? panic("Could not find player module")
```

### Other TypeScript Guidelines

- DO NOT use `let` for ALL variables (even if it changes later)
- DO NOT use `.then()` and `.catch()`
- DO NOT use `let isExecuted = false` for one-time execution flags
- DO NOT use `let objectsMightBeSetLater: SomeObject | null = null` for late initialization; Initialize it upon declaration.

---

## Rust Code Style

- `snake_case` for functions/variables, `PascalCase` for types
- Use `eprintln!` for non-fatal errors (debug builds only)
- Return `Result<T, String>` from Tauri commands
- Use `if let` / `match` for Option/Result handling

```rust
let Some((attrs, pos, was_playing)) = result else {
    warn!("no current sound in state");
    return;
};
```

---

## Workflow Notes

1. After editing TypeScript: `cd packages/inject && bun run build`
2. After editing Rust: `cargo check --lib` to verify compilation
3. `cargo tauri dev` auto-builds inject via `beforeDevCommand`

---

## User development workflow guidelines

- Before starting on frontend tasks, always run the `agent-browser --auto-connect ...` command on the subagent to check the status.
- Before working on unfamiliar areas of the Soundcloud internal API, always investigate [packages/vendor](packages/vendor) to understand the situation.

### Browser debugging via agent-browser (CDP)

- `cargo tauri dev` may be run freely; no user approval is needed.
- In dev builds, the WebView listens for CDP on port 9223 automatically
  (`src-tauri\src\lib.rs:171`). Explore, operate, and debug freely with
  agent-browser commands such as `agent-browser --cdp 9223 snapshot`.
  See the /agent-browser skill for details.

---

## Design Principles

- **Rust primary**: Rust handles all the logic. The JavaScript side focuses solely on communication with the Rust process, event handling, and processing that can only be done in JavaScript (such as controlling toolbar menus). JavaScript does not implement any logic itself.
