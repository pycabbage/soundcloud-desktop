# AGENTS.md — Coding Agent Guidelines for soundcloud-desktop

## Project Overview

A Tauri v2 desktop application that wraps the SoundCloud website in a WebView and injects
a TypeScript script to expose playback controls as native OS media keys.

Architecture:
- `packages/inject/` — TypeScript browser injection script (built with Bun bundler → IIFE)
- `src-tauri/` — Rust/Tauri backend that loads SoundCloud in a WebView and evals the bundle

The Rust backend reads `packages/inject/dist/index.js` at runtime, so the inject package
**must be rebuilt** before running the Tauri app whenever TypeScript sources change.

---

## Build Commands

### TypeScript (packages/inject)

```bash
# Install dependencies (uses Bun as package manager)
bun install

# Build the inject bundle (outputs to packages/inject/dist/index.js)
cd packages/inject && bun run build

# Lint (Biome)
cd packages/inject && bun run lint

# Auto-fix lint issues
cd packages/inject && bunx biome check --write
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

# Run Rust tests (no tests currently exist)
cargo test
```

### No Test Suite

There is currently **no test framework** configured for TypeScript. There are no test files.
If tests are added, Bun's built-in test runner is the expected choice:

```bash
# Run all tests
bun test

# Run a single test file
bun test packages/inject/src/lib/debounce.test.ts

# Run tests matching a pattern
bun test --test-name-pattern "debounce"
```

---

## Repository Structure

```
soundcloud-desktop/
├── packages/
│   └── inject/            # TypeScript injection script
│       ├── src/
│       │   ├── index.ts   # Entry point — bootstraps everything after page load
│       │   └── lib/
│       │       ├── debounce.ts      # Throttle/debounce utilities
│       │       ├── nativePlayer.ts  # SoundCloud NativePlayer type + accessor
│       │       ├── playManager.ts   # SoundCloud PlayManager type + accessor
│       │       ├── utils.ts         # panic() utility
│       │       └── webpack.ts       # Webpack chunk module finder
│       ├── scripts/
│       │   └── build.ts   # Bun.build() config — IIFE bundle for browser
│       ├── dist/          # Build output (committed; loaded by Tauri at runtime)
│       ├── biome.json     # Linter/formatter config
│       └── tsconfig.json
└── src-tauri/
    ├── src/
    │   ├── main.rs        # Windows subsystem entry point
    │   └── lib.rs         # All app logic: window setup, media key handling, IPC
    ├── capabilities/
    │   └── default.json   # Tauri permissions
    └── tauri.conf.json    # Tauri app configuration
```

---

## TypeScript Code Style

### Formatter (Biome)

- **Indentation**: 2 spaces
- **Quotes**: Double quotes (`"`)
- **Semicolons**: Omit when not required (`"asNeeded"`)
- **Trailing commas**: ES5 style (objects and arrays)
- **Import organization**: Automatic via Biome assist (`organizeImports: "on"`)

Run `bunx biome check --write` to auto-format and fix lint issues.

### TypeScript Configuration

Key compiler options (`tsconfig.json`):
- `strict: true` — all strict checks enabled
- `verbatimModuleSyntax: true` — type-only imports **must** use `import type`
- `noUncheckedIndexedAccess: true` — array indexing returns `T | undefined`
- `noImplicitOverride: true` — `override` keyword required in subclasses
- `moduleResolution: "bundler"` — Bun bundler resolution

### Imports

- Use **relative paths with `.ts` extension** for local modules:
  ```ts
  import { panic } from "./utils"
  import { getNativePlayer } from "./lib/nativePlayer"
  ```
- Use package name for npm packages:
  ```ts
  import { invoke } from "@tauri-apps/api/core"
  ```
- Use `import type` for type-only imports (required by `verbatimModuleSyntax`):
  ```ts
  import type { NativePlayer } from "./lib/nativePlayer"
  ```
- No path aliases (`@/` etc.) — use relative paths only.

### Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Functions | `camelCase` | `getNativePlayer`, `getModule` |
| Variables | `camelCase` | `songTitle`, `requestId` |
| Interfaces / Types | `PascalCase` | `NativePlayer`, `PlayManager` |
| Files | `camelCase` | `nativePlayer.ts`, `playManager.ts` |

### Error Handling

Use the `panic()` utility for unrecoverable errors — it throws and returns `never`:

```ts
import { panic } from "./utils"

const player =
  getPlayerModule() ?? panic("Could not find the player module")
```

For expected failures, prefer early returns or `undefined` checks with `noUncheckedIndexedAccess`.

### Lint Suppression

Suppress Biome lint rules only when necessary with a targeted comment:

```ts
// biome-ignore lint/suspicious/noExplicitAny: SoundCloud internal API
const modules: any = window.__webpack_require__
```

---

## Rust Code Style

Follow standard Rust idioms enforced by `cargo fmt` and `cargo clippy`.

- **Naming**: `snake_case` for variables/functions, `PascalCase` for types/structs
- **Error handling**: Return `Result<T, String>` from Tauri commands; use `eprintln!` for
  non-fatal errors; use `match` or `if let` for `Option`/`Result` handling
- **Async**: Use `tokio` async/await; channels via `tokio::sync::oneshot`
- **IPC**: Tauri events (`app.emit`, `webview.listen`) for Rust↔JS communication;
  Tauri commands (`#[tauri::command]`) for JS→Rust calls

Example pattern:

```rust
match rx.await {
    Ok(result) => println!("Got result: {result}"),
    Err(e) => eprintln!("Error: {e}"),
}
```

---

## Workflow Notes

1. After editing TypeScript sources, always rebuild before testing:
   ```bash
   cd packages/inject && bun run build
   ```
2. The Tauri dev command (`cargo tauri dev`) runs the inject build automatically via
   `beforeDevCommand`, so you only need to rebuild manually if iterating on JS alone.
3. The `dist/index.js` bundle is committed to the repository so the app works without
   a separate build step for end users.
4. VSCode recommended extensions: `tauri-apps.tauri-vscode`, `rust-lang.rust-analyzer`,
   `biomejs.biome`.
