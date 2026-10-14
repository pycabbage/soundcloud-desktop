# 0009 — Uncover the V2 layout iframe via the vendor's `crossfade-iframe-active` body class

## Status

accepted

## Context

`#app` is absolutely positioned over the whole window below the titlebar. On
classic (System A) pages it hosts everything, so this is correct. On V2 layout
pages, however, the vendor empties the outer app and renders the page inside
the crossfade iframe (`iframe.webiIframeV2Layout`). `#app` keeps covering the
window and, painting after the fixed iframe in DOM order, swallows every click
and drop aimed at the V2 page — the page becomes visible but inert.

The intended fix was to let `#app` collapse whenever the V2 page is shown. The
first attempt detected the V2 page from inside the iframe: a `:has(main)`
custom property injected into the iframe document, mirrored onto `#app` as a
`--app-bottom` CSS variable by an attribute-scoped `MutationObserver`. It never
worked, for reasons verified against the live page:

- The inject script runs before the vendor inserts the iframe, so the
  `iframe?.addEventListener("load", …)` attached to nothing and never fired.
- A sheet constructed with the top document's `CSSStyleSheet` cannot be pushed
  into the iframe's `adoptedStyleSheets` (`NotAllowedError`, cross-document
  sharing).
- The marker selector `main#MuiBox-root` matched nothing: the actual element is
  `<main id="main" class="MuiBox-root …">`.
- Even with the sheet in place, the trigger was dead: the iframe does not
  reload on SoundCloud's SPA navigations (its `load` fires once, when there is
  no `main` yet), and the iframe body's `style`/`class` attributes never change
  (measured: 24 childList mutations per navigation, 0 attribute mutations).
- `--app-bottom: inherit` cannot inject the `bottom: inherit` keyword through
  `var()`: a custom property holding `inherit` means "inherit the parent's
  `--app-bottom`", which is unset, so the declaration fell back to `48px`.

Meanwhile the vendor already exposes the exact state we need on the top
document: its crossfade controller adds `crossfade-iframe-active` to
`document.body` when it shows the iframe (`navigateCrossfadeIframe`) and
removes it when it hides the iframe (`hideCrossfadeIframe`). No Next.js route
tracking and no DOM observation is needed on our side.

## Decision

Drop the iframe-side detection, the observer, the `--app-bottom` variable, and
the associated JS entirely. One stylesheet rule consumes the vendor signal:

```scss
body.crossfade-iframe-active #app {
  bottom: auto;
}
```

`bottom: auto` lets the absolutely positioned `#app` shrink to its content,
which on V2 pages is just the fixed header and player bar — both fixed to the
viewport and unaffected. The iframe becomes the topmost element over the rest
of the window again.

Collapsing `#app` does have one side effect: URL drops over the V2 area now
land on the iframe's document instead of the outer app, where the jQuery drop
hook (0001) waits. The vendor's standby page does not handle drops, so a drop
would navigate the iframe away. To keep the drop-queuing feature parity, each
V2 frame load now also installs a small `dragover`/`drop` pair on the iframe's
document that queues SoundCloud URLs and cancels the dispatch, mirroring the
outer handler.

## Consequences

### Positive

- Zero JS for the coverage fix: no iframe probing, no stylesheet injection, no
  observer, no state mirroring. The vendor toggles a class; CSS follows.
- Reacts to every show/hide of the iframe, including the transitions an
  observer design would have missed (SPA navigations reload neither the top
  document nor the iframe).
- The MutationObserver ban (AGENTS.md) holds without exceptions.

### Negative

- Coupled to the vendor class name `crossfade-iframe-active`. A rename would
  silently disable the rule, leaving the V2 page inert — the same risk class
  as any vendor-coupled hook (0003, 0006).
- On V2 pages a future vendor change that fills the outer `#app` with real
  content would be clipped to the collapsed height. Today the outer app is
  empty there, so nothing regresses.

### Neutral

- URL drops on classic pages still flow through the jQuery hook; drops on the
  V2 area flow through the new iframe-document listeners. Both paths share the
  same URL extraction and queueing helpers.

## Project priorities honored

- **最小コード行数**: ~60 lines of detection, mirroring, and observer code are
  replaced by one CSS rule plus a ~15-line drop handler sharing existing
  helpers.
- **パフォーマンス優先**: no observation of vendor DOM churn; the browser's
  own cascade reacts to the class toggle exactly when the vendor makes it.
