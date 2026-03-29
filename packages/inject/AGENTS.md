# Type Design Notes — packages/inject

This document records intentional design decisions in the TypeScript type definitions
under `src/types/`, so that future contributors understand why certain `unknown` types
are kept rather than replaced.

---

## Backbone Event Method Context Parameters

**Location:** `src/types/sound.ts` and `src/types/playManager.ts`  
**Pattern:** `context?: unknown` in `on()`, `off()`, `once()`, `listenTo()`, `stopListening()`

These parameters represent the `this` binding passed to Backbone event callbacks.
They are typed as `unknown` (rather than `object`) for the following reasons:

1. **Backbone's own typings** (`@types/backbone`) type these as `any`.  
   Using `unknown` is already stricter and provides better safety without being needlessly opaque.
2. **Practical usage** — in SoundCloud's codebase, `context` is almost always `undefined`
   (arrow functions are used instead). Constraining to `object` provides no real benefit.
3. **Interface stability** — changing to `object` would break callers that pass `undefined`
   explicitly.

**Decision:** Keep `context?: unknown`.

---

## Backbone Generic Callback Variadic Args

**Location:** `src/types/sound.ts` and `src/types/playManager.ts`  
**Pattern:** `callback: (...args: unknown[]) => void` in string catch-all overloads  
**Pattern:** `trigger(eventName: string, ...args: unknown[]): this`

The string overloads exist for Backbone compatibility when calling `on()` / `trigger()`
with arbitrary event names not in the typed `EventMap`. The `unknown[]` variadic args
are semantically correct: we genuinely do not know the types of arguments for an
arbitrary string-named event. Changing to `any[]` would be less safe.

**Decision:** Keep `...args: unknown[]`.

---

## Record<string, unknown> Index Signatures

**Location:** throughout all type files  
**Pattern:**
- `[key: string]: unknown` — index signature on interface (e.g. `SourceInfo`, `Visual`, options bags)
- `Record<string, unknown>` — type alias for opaque data (e.g. `parse()` return, `toJSON()`, options)

These represent genuinely opaque data structures:
- **`SourceInfo` and `Visual`** — raw API objects whose full shape is not needed by the inject script.
- **Options bags** (`pauseCurrent`, `toggleCurrent`, `playNext`, `playPrev`, etc.) — SoundCloud's
  internal APIs accept arbitrary options whose valid keys vary by call site.
- **Backbone model API methods** (`parse`, `toJSON`, `setup`, `getAttributesToBeSaved`, etc.) —
  these operate on raw API data shapes that the inject script never inspects.

**Decision:** Keep `Record<string, unknown>` and `[key: string]: unknown` index signatures
for these genuinely opaque structures.

---

## AdManager and DestroyManager Internal Types

**Location:** `src/types/playManager.ts`  
**Pattern:** `getCurrentAdController(): unknown`, `getCurrentAd(): unknown | null`, etc.

The `AdManager` interface defines only the methods that `PlayManager` calls.
Several return types remain `unknown` because:
- The inject script never inspects the returned `AudioAd` model, `AdController`, or
  `AdVisualController` objects.
- Fully typing these would require additional interfaces (e.g. `AudioAd`, `AdController`)
  that have no benefit for the inject script's use case.

**Decision:** Keep internal ad controller return types as `unknown`.
