# 0003 — Subscribe to the vendor ThemeStore instead of observing the DOM

## Status

accepted

## Context

The injected titlebar needs to know when the user switches between the dark and
light theme so its shadow-DOM styling can follow along.

The original implementation used a `MutationObserver` on `document.body` class
attributes to detect those switches. This is now banned by project guidelines
(AGENTS.md): **DO NOT use `MutationObserver` (under no circumstances)**. Observing
vendor DOM mutations is fragile — SoundCloud may rewrite class lists for reasons
unrelated to theming, forcing us to re-derive intent from noise — and wasteful,
since every body mutation wakes our callback even when the theme did not change.
Instead of monitoring processing performed by vendor code, we should modify/hook
the webpack module that performs it.

Conveniently, the vendor app already contains a ThemeStore singleton. We locate
it by member fingerprint `["getTheme", "setTheme", "onThemeChange"]` (never by
absolute module ID). It exposes:

- `onThemeChange(listener)` — pushes a callback to subscribers whenever the
  user changes the theme, returning an unsubscribe function.
- Writes of the `theme-dark` / `theme-light` classes on `document.body`, which
  remain the single source of truth we read from.

## Decision

Delete the `MutationObserver` entirely and subscribe to the vendor ThemeStore:

1. Look the store up once via `getModule(["getTheme", "setTheme", "onThemeChange"], false, getWebpackRequire())` against the **top-document** System A runtime, passing `getWebpackRequire()` explicitly — the default standby-iframe runtime lacks `webpackChunk_N_E` in current builds, so the implicit iframe lookup would fail.
2. Wrap the connection in try/catch so a missing store degrades gracefully: the titlebar just keeps its last known theme; no crash, no retry loop.
3. Register a sync callback through the vendor's own `onThemeChange` API. The callback re-reads the `theme-dark` / `theme-light` classes from `document.body` into the local zustand store (`useThemeStore`). The initial value is also read once at connect time.

## Consequences

### Positive

- Zero DOM observation cost: the flow is push-based and fires only on actual
  theme changes — no continuous observation, no per-mutation work.
- Honors the MutationObserver ban in AGENTS.md; we hook the vendor module
  instead of monitoring its output.
- Fewer lines of code: `theme.ts` totals roughly ~50 lines including types and
  graceful-degradation handling.

### Negative

- Depends on the vendor ThemeStore member names surviving rebuilds.
  Mitigated twice over: the fingerprint lookup tolerates module-ID churn, and
  the try/catch degradation means a rename costs us reactivity only — never a
  broken titlebar.

### Neutral

- The initial theme is still read from `document.body` classes once at connect
  time; body classes remain the canonical representation we translate from.

## Project priorities honored

- **最小コード行数**: the observer plus its bookkeeping is replaced by one
  lookup, one callback registration, and one small sync function (~50 lines for
  the whole file).
- **パフォーマンス優先**: nothing runs continuously; the callback fires only
  when the vendor store itself reports a real theme change.
