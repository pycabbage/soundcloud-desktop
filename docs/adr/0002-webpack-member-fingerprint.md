# 0002 — Locate webpack modules by member fingerprint, not module ID

## Status

Accepted

## Context

The injected bundle (`packages/inject/src`) runs inside the SoundCloud web app and
needs a handful of internal vendor singletons to do its job:

- **PlayManager** — queue and playback control (`playManager.ts`)
- **jQuery** — DOM helpers used by the page itself (`jquery.ts`)
- **the config store(s)** — e.g. the DSA/playback config objects
- **ThemeStore** — vendor theme singleton pushed via `onThemeChange` (`theme.ts`)
- **the Sound model constructor** — exposes statics `resolve` / `normalize` / `states`
  (`soundConstructor.ts`)

These are not exported through any public API; they only exist as modules inside
SoundCloud's webpack runtimes.

Historically, modules were located by their absolute module ID, e.g.
`require(2847)`. This breaks on every SoundCloud vendor rebuild: webpack module
IDs are compiler-assigned (numeric, order/hash dependent) and are not stable
across builds. Any hardcoded ID silently resolves to the wrong module or throws,
so each deploy of the site could brick our injection until we re-derived IDs by
hand.

Two additional wrinkles:

1. **Some targets export classes/functions, not plain objects.** The Sound model
   is a constructor function with static members (`resolve`, `normalize`,
   `states`). A previous version of `getModule()` skipped any non-object export
   when checking fingerprints, so class-style exports were never matched and
   `getSoundConstructor()` always panicked. `getModule()` in
   `lib/webpack.ts` has been fixed to accept *any* non-null export (including
   functions/classes) before running the member check.

2. **There are two webpack runtimes.** The top document uses the legacy
   `webpackJsonp` runtime ("System A"), while the standby iframe uses Next.js's
   `webpackChunk_N_E`. Singletons living in the top document must be looked up
   with the top-document require (`getWebpackRequire()`), passed explicitly;
   falling back to the default standby-iframe runtime would scan a registry that
   doesn't contain them.

## Decision

- Always locate webpack modules by **member fingerprint**: call
  `getModule(members)` where `members` is a tuple of distinctive property names,
  each verified with the `in` operator against the module's exports. Example:
  `getModule(["resolve", "normalize", "states"])` for the Sound constructor.
- **Never call `webpackRequire` with literal numeric module IDs.** No hardcoded
  `2847`-style identifiers may appear anywhere in `packages/inject/src`.
- For System A singletons (PlayManager, jQuery, ThemeStore, Sound constructor),
  pass the top-document runtime explicitly:
  `getModule(members, false, getWebpackRequire())`. Only targets known to live
  inside the standby iframe rely on the default iframe runtime.
- `getModule()` accepts any non-null export — object, function, or class — so
  class-style modules with static members are matchable like any other.

## Consequences

### Positive

- **Resilient across vendor rebuilds** as long as the chosen member names
  survive refactors; no action needed when SoundCloud redeploys with shuffled
  module IDs.
- **Removes all hardcoded IDs**, eliminating the whole class of
  wrong-module/stale-ID failures.
- **Uniform accessor style**: every accessor (`playManager`, `jquery`,
  `soundConstructor`, `theme`, `version`) is a ~10-line function matching the
  pattern already established in `lib/version.ts`.

### Negative

- **Fingerprint collisions are theoretically possible** — another module could
  expose the same property names. Mitigated by choosing ≥3 distinctive members
  per target that are unlikely to co-occur elsewhere.
- **Scanning all modules is O(n)** per lookup. Acceptable because lookups run
  once per target at init only; there is no per-event or per-frame cost.

### Project priorities honored

- **最小コード行数 (minimum lines of code):** each accessor stays at ~10 lines
  with no caching layer, no memoization table, and no ID-mapping config file to
  maintain.
- **パフォーマンス優先 (performance first):** all O(n) scans happen once during
  startup initialization. After init, every consumer holds a direct reference to
  the resolved singleton, so there is zero lookup overhead at runtime.
