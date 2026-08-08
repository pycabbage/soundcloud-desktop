# AGENTS.md — packages/inject

## Overview

TypeScript browser-injection package for the `soundcloud-desktop` Tauri app.
The entry point (`src/index.ts`) is bundled as an IIFE and evaluated by the Tauri
WebView at runtime. It hooks into SoundCloud's internal webpack modules to expose
playback controls to the Rust backend.

The built bundle (`dist/index.js`) is committed to the repository; always rebuild
after editing TypeScript sources before testing with the Tauri app.

---

## Commands

```bash
# Install dependencies (run from repo root or packages/inject/)
bun install

# Build — outputs IIFE bundle to dist/index.js
bun run build

# Lint (oxlint + oxfmt --check, run concurrently)
bun run lint

# Auto-fix lint and formatting issues
bun run lint:fix

# Tests — no test suite exists yet; if added, use Bun's built-in runner
bun test                                        # all tests
bun test src/lib/debounce.test.ts               # single file
bun test --test-name-pattern "throttle"         # by test name pattern
```

---

## Directory Structure

```
packages/inject/
├── src/
│   ├── index.ts              # Entry point — bootstraps after page load
│   ├── lib/
│   │   ├── debounce.ts       # throttle() utility
│   │   ├── playManager.ts    # PlayManager webpack module accessor
│   │   ├── utils.ts          # panic() utility
│   │   ├── v2BridgePlayer.ts # V2BridgePlayer webpack module accessor
│   │   └── webpack.ts        # Webpack chunk module finder (getModule, getWebpackRequire)
│   └── types/
│       ├── events.ts         # PlayManagerEventMap, SoundEventMap, event constants
│       ├── nativePlayer.ts   # IPlayer, NativePlayer, V2BridgePlayer, reporter event types
│       ├── playManager.ts    # PlayManager, QueueItem, AdManager, ContextSnapshot, …
│       ├── sound.ts          # Sound, SoundAPlayer, SoundPlaylist, VisualsCollection, …
│       └── track.ts          # Track, Transcoding, V2ToWebiMessage, AudioAdPayload, …
├── scripts/
│   └── build.ts              # Bun.build() config (format: "iife", target: "browser")
├── dist/                     # Built bundle (committed; loaded by Tauri at runtime)
├── .oxlintrc.json            # Linter config (oxlint)
├── .oxfmtrc.json             # Formatter config (oxfmt)
└── tsconfig.json             # TypeScript config
```

---

## TypeScript Code Style

### Linter/Formatter (oxlint + oxfmt)

Lint config in `.oxlintrc.json`, format config in `.oxfmtrc.json`:

| Setting             | Value                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Indentation         | 2 spaces                                                                                                           |
| Quotes              | Double (`"`)                                                                                                       |
| Semicolons          | Omit unless required (`"semi": false`)                                                                             |
| Trailing commas     | ES5 (`"trailingComma": "es5"`)                                                                                     |
| Import organization | Auto-sorted (`"sortImports": true`)                                                                                |
| Tailwind classes    | Auto-sorted (`"sortTailwindcss": true`)                                                                            |
| Type-aware linting  | Enabled (`"typeAware": true`, `"typeCheck": true`) — catches issues like unhandled promises that require type info |

Run `bun run lint:fix` to auto-format and fix lint issues (`concurrently "oxfmt" "oxlint --fix"`).
Ignored paths (e.g. `dist`) live under `ignorePatterns` in `.oxlintrc.json` / `.oxfmtrc.json`.

### Imports

```typescript
// Local modules: relative path WITH .ts extension (no .js alias)
import { panic } from "./utils"
import type { PlayManager } from "../types/playManager"

// npm packages: package name only
import { invoke } from "@tauri-apps/api/core"

// Type-only imports: always use `import type` (verbatimModuleSyntax requires it)
import type { Sound } from "../types/sound"
```

Rules:

- **Always** `import type` for type-only imports — `verbatimModuleSyntax: true` enforces this at compile time
- No path aliases (`@/` etc.) — use relative paths only
- oxfmt auto-organizes import order via `"sortImports": true` — `--write` is its default mode

### TypeScript Configuration

Key constraints from `tsconfig.json` to keep in mind:

| Option                           | Effect                                                           |
| -------------------------------- | ---------------------------------------------------------------- |
| `strict: true`                   | All strict checks enabled                                        |
| `verbatimModuleSyntax: true`     | Type-only imports **must** use `import type`                     |
| `noUncheckedIndexedAccess: true` | Array/object indexing returns `T \| undefined`; guard before use |
| `noImplicitOverride: true`       | `override` keyword required in subclasses                        |
| `moduleResolution: "bundler"`    | Bun bundler resolution; use `.ts` in local imports               |

### Naming Conventions

| Construct          | Convention   | Example                                       |
| ------------------ | ------------ | --------------------------------------------- |
| Functions          | `camelCase`  | `getPlayManager`, `getModule`, `throttle`     |
| Variables          | `camelCase`  | `playManager`, `requestId`, `webpackRequire`  |
| Interfaces / Types | `PascalCase` | `PlayManager`, `QueueItem`, `ContextSnapshot` |
| Source files       | `camelCase`  | `playManager.ts`, `v2BridgePlayer.ts`         |

### Error Handling

Use `panic()` from `./utils` for unrecoverable failures (e.g. module not found at startup):

```typescript
import { panic } from "./utils"

const playManager =
  (getModule(["getCurrentSound", "cycleRepeatMode"]) as PlayManager | undefined) ??
  panic("Could not find the PlayManager module")
```

`panic()` throws and returns `never`, so TypeScript narrows the result type automatically.
For optional/recoverable failures, prefer early returns or `undefined` checks.

### oxlint Suppression

Suppress only when unavoidable. Always include a reason after `--`:

```typescript
// oxlint-disable-next-line typescript/no-explicit-any -- SoundCloud internal webpack API
const modules: any = webpackRequire.c

// oxlint-disable-next-line typescript/no-non-null-assertion -- webpackRequire must be assigned by push callback
if (!webpackRequire!) {
  panic("Could not get webpack require")
}
```

For promises that are intentionally not awaited (event listener registration, fire-and-forget
init calls), prefer the `void` operator over a suppression comment — this is what the
`no-floating-promises` rule itself recommends, and it doesn't require a top-level `await`
(which the `format: "iife"` bundle output cannot support — see Workflow Notes):

```typescript
void listen("play-pause", () => {
  playManager.toggleCurrent()
})
```

---

## Type Design Notes

The `src/types/` interfaces model SoundCloud's internal webpack modules derived from
vendor JS analysis. Some `unknown` types are intentionally retained:

### `context?: unknown` in Backbone event methods

Pattern in `sound.ts` and `playManager.ts`: `on()`, `off()`, `once()`, `listenTo()`, `stopListening()`.

Kept as `unknown` because: `@types/backbone` types these as `any` — `unknown` is
already stricter. Context is almost always `undefined` in practice (arrow functions
are used instead of bound methods). Constraining to `object` adds no real safety.

### `...args: unknown[]` in Backbone generic overloads

`callback: (...args: unknown[]) => void` and `trigger(name: string, ...args: unknown[])`.

Semantically correct: for arbitrary string-named events, the argument types are
genuinely unknown. Changing to `any[]` would be strictly less safe.

### `Record<string, unknown>` and `[key: string]: unknown`

Used for `SourceInfo`, `Visual`, options bags, and Backbone model API methods
(`parse`, `toJSON`, `setup`). These are opaque data structures the inject script
never inspects — no benefit to typing them further.

### Opaque return types in `AdManager`

`getCurrentAd()`, `getCurrentAdController()`, etc. return `unknown` because the
inject script never accesses the returned AudioAd or AdController objects directly.
