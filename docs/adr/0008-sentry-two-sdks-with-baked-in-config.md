# 0008 — Sentry via two first-party SDKs with bundle-time configuration

## Status

Accepted

## Context

The app fails rarely enough that reproducing a fault by hand is impractical, so
errors have to be collected from real sessions. Both halves of the app can fail:
the Rust backend that drives Discord presence, the tray and the Win32 thumbnail
toolbar, and the inject script that patches SoundCloud's webpack modules.

Sentry has no Tauri SDK and none is planned, so the two halves have to be
instrumented separately. Three properties of this app shape how:

- The WebView loads `soundcloud.com`, not a local frontend. The page is served
  without a `Content-Security-Policy` header or meta tag, so the browser SDK can
  reach Sentry's ingest endpoint directly.
- The inject bundle is handed to `webview.eval()` on `PageLoadEvent::Finished`.
  Code entered that way has no script URL, so every frame it produces is
  anonymous: Sentry cannot group two unrelated faults apart, cannot map a frame
  back to source, and cannot distinguish our frames from SoundCloud's.
- The bundle runs inside a third party's application. Anything that records the
  DOM records that third party's UI, including whatever the signed-in user has
  on screen.

A community plugin exists that routes browser events through the Rust process
over Tauri IPC. It would merge breadcrumbs and attach OS and device context to
browser events, but its own source notes that the Rust envelope parser rejects
the `debug_meta` that source-map debug IDs add, so events fall back to raw
forwarding and lose the enrichment exactly where source maps are in play.

## Decision

Two official SDKs report to one project, sharing a DSN and a release string.

### Rust

`sentry` with `default-features = false`, selecting `rustls` over the default
`native-tls` so Linux builds need no OpenSSL headers. `sentry::integrations::tracing`
layers onto the existing `tracing` subscriber, mapping `ERROR` to an issue plus a
log, `WARN`/`INFO` to breadcrumbs plus logs, and dropping `DEBUG`/`TRACE`.
`ClientInitGuard` is held in `main` for the process lifetime.

### Browser

`@sentry/react`, initialised as the first statement of the inject entry point so
that a failing webpack-module lookup is already covered. `Bun.build`'s `define`
substitutes the DSN, release and environment at bundle time; nothing is read
from the page at runtime.

The release string is `CARGO_PKG_NAME@CARGO_PKG_VERSION` on both sides. The
`BrowserSession` integration is filtered out, because the Rust SDK already
tracks sessions at the application level and both would count the same session.

### Vendor errors

Nothing is filtered by origin. The inject script patches SoundCloud's internal
webpack modules, so a fault in vendor code is more often evidence about our
patching than about SoundCloud, and a mature service is unlikely to be the
source of a novel error on its own. Frames are told apart after the fact by
`stack.filename` rather than dropped at capture time.

### Naming eval'd frames

`Bun.build`'s `footer` appends `//# sourceURL=app:///inject/index.js`. Sentry
normalises this to `~/inject/index.js`, which is the path CI uploads the source
map under. Bun writes a content-derived `debugId` into both the bundle and the
map, so no separate injection step is needed.

### Session Replay

Opt-in, off by default, behind a checkbox in the titlebar Settings menu. When
enabled it runs in buffer mode — `replaysSessionSampleRate: 0`,
`replaysOnErrorSampleRate: 1` — so only the window around a fault is sent, with
text, inputs and media masked. The setting is read once at startup and applied
through `Sentry.addIntegration`, and toggling it takes effect without a reload.

## Consequences

### Positive

- Both halves land in one issue stream on one release, so a browser fault and
  the backend state around it are visible together.
- Every dependency is first-party Sentry; nothing sits between the app and the
  ingest endpoint.
- Bundle-time configuration means no runtime lookup and no ordering hazard
  between the backend and the injected script.
- Replay never records a third party's UI without the user having asked for it.

### Negative

- The DSN appears in two files. It is a public ingest key that changes only if
  the Sentry project is recreated, and a mismatch would fail immediately.
- Browser events carry no Rust context and the two breadcrumb trails stay
  separate.
- Hard native crashes are not captured. `sentry`'s panic integration covers
  panics that unwind; a process that dies on an access violation — WebView2, or
  the Win32 calls in `acrylic.rs` and `thumbbar.rs` — leaves no event at all.
  A minidump reporter would close this, at the cost of a crash handler from a
  crate that does not meet this project's bar for a dependency.
- Releases are now minified, because CI sets `NODE_ENV=production`. Readable
  stack traces depend on the source map upload, which depends on
  `SENTRY_AUTH_TOKEN` being set.

## Alternatives rejected

| Alternative | Reason |
| --- | --- |
| Community Tauri plugin routing browser events through Rust | Its enrichment is lost for any event carrying source-map debug IDs, which is every event worth symbolicating |
| Separate Sentry projects per half | Splits release health and forces cross-project work to correlate a fault with the backend state around it |
| Filtering vendor frames at capture time | Discards the frames most likely to show what our webpack patching broke |
| Session Replay always on | Records a third party's UI, including signed-in content, without the user choosing it |
| Debug IDs matched at runtime instead of release + path | Needs the id inside the bundle before the bundle exists; release plus path is exact here because each version ships one bundle |

## Project priorities honored

- **最小コード行数**: configuration is three `define` entries and one
  `ClientOptions` chain; no config file, no reader, no generated code.
- **パフォーマンス優先**: no polling and no runtime configuration fetch. Replay
  is off unless asked for, and buffers rather than streams when it is on.
