# 0005 — Push-based startup hooks instead of polling in the inject script

## Status

Accepted

Supersedes the handler-location mechanism of
[0001](0001-inject-url-drop-queue.md) (Decision steps 2–3). Everything else in
0001 — no new event listeners, delegation to the original behaviour for file
drops, and the oEmbed/api-v2 resolution path — still stands.

## Context

The inject script runs before the SoundCloud web app has finished booting, so
two pieces of setup depended on state the vendor only creates later:

- **The jQuery `drop` binding.** URL queuing hijacks the document-level drop
  handler the upload-target view binds. That binding does not exist at injection
  time, so the script re-read `jQuery._data(document, "events").drop[0]` every
  500 ms for up to 60 attempts and gave up after 30 seconds.
- **The injected stylesheet.** The vendor replaces `document.adoptedStyleSheets`
  while booting, which drops our sheet. The script re-checked at 1 s, 3 s and
  8 s and re-adopted when the array looked empty. The same pass re-queried for
  the V2 layout iframe, which the vendor inserts after boot, so that iframe was
  only styled if it happened to appear before the last check.

Both are waiting loops, and both carry the same costs: timer wake-ups while
nothing is happening, a resolution that lands up to a full interval late, and a
fixed deadline after which the feature silently stays broken no matter what the
app does afterwards. A slow boot past 8 seconds left the layout permanently
unstyled; a slow boot past 30 seconds left URL drops permanently dead. Each
retry pass also constructed and pushed a fresh `CSSStyleSheet` into the iframe,
so repeated checks accumulated duplicate sheets.

Polling is also at odds with the guideline that motivated
[0003](0003-theme-vendor-store.md): rather than watching for the effects of
vendor code, hook the vendor code path itself.

## Decision

Every startup wait becomes a push-based hook. No timers remain in the inject
script.

### Drop queuing — `jQuery.event.special.drop.preDispatch`

Instead of locating and wrapping the stored handler, register a hook in
jQuery's own extension point (`lib/dropHandler.ts`):

```ts
special.drop = { ...special.drop, preDispatch: preDispatchDrop }
```

`jQuery.event.dispatch` reads `jQuery.event.special[type]` on every dispatch and
aborts when `preDispatch` returns `false`. Registering the hook therefore does
not care whether the vendor has bound its handler yet — bindings made before and
after us are both covered — and a cancelled dispatch means the vendor handlers
never run for a URL drop. Drops without a SoundCloud URL return `undefined`, so
the dispatch proceeds and file uploads keep their native behaviour. The existing
`special.drop` entry is spread through, leaving any vendor configuration intact.

Queuing itself is started from the hook and its failure only logged, because the
dispatch is synchronous and has to answer the drop immediately.

### Stylesheet retention — `adoptedStyleSheets` property wrapper

The sheet is built once at module scope, and `adoptedStyleSheets` is redefined
as an own accessor on `document` (`index.ts`). The setter re-appends our sheet
to whatever the vendor assigns; the getter reads through to the prototype
accessor. Both use `Reflect` against `Document.prototype` so they address the
platform accessor directly and never re-enter the instance property being
defined.

The final assignment in `adoptInjectStyles()` performs the initial adoption
through that same setter, which keeps a single code path for adoption and
re-adoption.

### V2 layout iframe — capture-phase `load`

The iframe is styled from its own `load` event, listened for on `document` in
the capture phase (`load` does not bubble, but the capture phase still reaches
the document). A `querySelector` at install time covers an iframe that already
finished loading. Each load gets a fresh document and therefore a fresh sheet,
which is correct rather than duplicative.

### Init ordering

With no waiting left, `init()` performs the synchronous UI setup first — the
titlebar, the drop hook, the stylesheet, the iframe listener — and then awaits
the IPC-dependent work concurrently:

```ts
await Promise.all([loadLikedTracks(), restoreSessionState()])
```

Each of those handles its own failure, so neither can hold up the other or the
UI that is already on screen.

## Consequences

### Positive

- Zero timers and zero retry budgets: the inject script does no work between
  events. Setup completes at the exact moment the vendor state appears rather
  than up to one interval later.
- No deadline to outlive. A boot slower than any previous cut-off now works
  instead of silently losing styles or drop handling.
- The drop hook no longer depends on the shape of jQuery's internal event store
  (`_data(document, "events").drop[0].handler`), only on the documented
  `event.special` extension point — a narrower and more stable coupling.
- The V2 iframe is styled on every navigation, not just when it happens to exist
  during a check, and the duplicate-sheet accumulation is gone.

### Negative

- `preDispatch` is jQuery-internal API. It has been stable since jQuery 1.9, and
  the lookup is still guarded by try/catch, so a change costs URL queuing only —
  never a broken page.
- The `adoptedStyleSheets` wrapper intercepts assignment. In-place edits of the
  array (`push`, `splice`) bypass it; the vendor only appends, so our sheet
  survives those, but a future in-place removal would need the getter to return
  a proxied array.
- Redefining a DOM property on `document` is visible to any vendor code that
  inspects the descriptor. Nothing in the app does today.

## Project priorities honored

- **最小コード行数**: the drop handler drops from ~90 lines to ~44 — the retry
  state machine, the event-store lookup and the handler wrapper all disappear.
  Style handling replaces a re-entrant closure plus a retry loop with three
  small functions.
- **パフォーマンス優先**: nothing runs on a schedule. Work happens once per real
  event — one drop dispatch, one stylesheet assignment, one iframe load.
