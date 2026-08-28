# 0001 — Intercept URL drops via the vendor drop handler (TS-only)

## Status

Accepted — Decision steps 2–3 superseded by
[0005](0005-inject-push-based-startup-hooks.md)

## Context

Users naturally drag SoundCloud URLs (e.g. `https://soundcloud.com/user/track`,
`https://soundcloud.com/user/sets/playlist`, or `on.soundcloud.com` short links)
from a browser into the app window. The desktop app must treat such drops as
"add this track/playlist to the **Next up** play queue", while file drops must
keep working exactly as before (the vendor uses drag-drop to open its
file-upload overlay).

Constraints that shaped the decision:

- The vendor app binds its own document-level `dragover`/`drop` handlers via
  jQuery for the upload-target view, so the drop event is already consumed by
  vendor code before anything we add could see it.
- An earlier approach chained native OLE drag-drop in Rust (wry/tao). It broke
  native UI rendering and was abandoned.
- DOM-level listeners plus `MutationObserver` are banned by project guidelines
  (`AGENTS.md`: no MutationObserver under any circumstances; modify the webpack
  module instead of monitoring vendor processing).
- wry's default `dragDropEnabled: true` injects its own native OLE `IDropTarget`
  handler on Windows (`RegisterDragDrop` over every child HWND +
  `ICoreWebView2Controller4::SetAllowExternalDrop(false)`). That handler swallows
  all OS drag events in Rust and they never reach the DOM, so the vendor's
  HTML5/jQuery drop handlers never fire. HTML5 drag & drop on Windows therefore
  requires `dragDropEnabled: false` (`disable_drag_drop_handler`), which restores
  WebView2's own external-drop handling that forwards drag events into the page.

## Decision

No new event listeners are registered. Instead, the inject script hijacks the
existing vendor binding:

1. Locate jQuery through the webpack member-fingerprint lookup
   `getModule(["expando", "_data", "fn"])` (`lib/jquery.ts`) — never by module ID.
2. Read the existing document-level drop handler from jQuery's event store:
   `jQuery._data(document, "events").drop[0].handler`. Because the vendor binds
   it some time after injection, poll briefly (500 ms interval, bounded
   retries) until the entry appears; give up quietly if it never does.
3. Replace the stored `handler` with a wrapper:
   - If the dropped payload contains a `soundcloud.com` / `on.soundcloud.com`
     URL → `preventDefault()` and enqueue via oEmbed resolution +
     `PlayManager.addExplicitQueueItem`.
   - Otherwise delegate to the original handler unchanged, so file uploads
     keep their native behavior.

Steps 2 and 3 are no longer how the interception works.
[0005](0005-inject-push-based-startup-hooks.md) replaced the event-store lookup
and its retry loop with a `jQuery.event.special.drop.preDispatch` hook, which
needs no knowledge of when or where the vendor binds. Step 1 and the resolution
path below are unchanged.

Resolution path (`lib/dropUrl.ts`):

- Plain track permalinks go straight through the internal
  `Sound.resolve(user, permalink)` resolver.
- Short links (`on.soundcloud.com/{token}`), playlists, and any other
  SoundCloud URL resolve through `soundcloud.com/oembed` (CORS-enabled, runs
  with the user's session so private tracks work) to get kind + id, then the
  api-v2 `/tracks/{id}` / `/playlists/{id}` endpoints using the `client_id`
  read from the web app config module.

## Consequences

**Positive**

- Zero new event listeners: we only swap a function pointer inside jQuery's own
  event store.
- Zero DOM API additions — nothing observed, nothing mutated in the DOM.
- Native upload UI is untouched; non-URL drops behave exactly as before.
- Works for private tracks since all requests use the page session.

**Negative**

- Depends on the vendor keeping its jQuery binding pattern
  (`_data(document, "events").drop`). Mitigated by member fingerprint lookup +
  bounded polling rather than hard-coded module IDs. Removed entirely by
  [0005](0005-inject-push-based-startup-hooks.md), which no longer reads the
  event store.
- The wrapper adds one function indirection per drop event (negligible).

**Project priorities honored**

- 最小コード行数 (minimal LOC): the whole feature is ~40 lines across
  `dropHandler.ts` + `dropUrl.ts`. The Rust side only flips the webview config
  (`dragDropEnabled: false`) so OS drag events reach the DOM at all.
- パフォーマンス優先 (performance first): no polling after the binding is
  found (none at all since
  [0005](0005-inject-push-based-startup-hooks.md)), no DOM observation, O(1)
  work per drop event.
