# 0007 — Windows thumbnail toolbar with procedurally drawn glyphs

## Status

Accepted

## Context

Hovering the taskbar button on Windows shows a thumbnail flyout, and
`ITaskbarList3::ThumbBarAddButtons` lets an app put media controls in it. The
app wants four: Like, Previous, Play/Pause, Next — two of them stateful, since
Play/Pause swaps between two glyphs and Like between a filled and an outlined
heart, greying out when no track is loaded.

The Win32 API constrains the shape of the solution:

- `ITaskbarList3` is an apartment-threaded COM object and the icons are GDI
  handles owned by the window. Both may only be touched from the thread that
  owns the window, while playback state arrives from Tauri commands on
  arbitrary threads.
- `ThumbBarAddButtons` may be called only once per taskbar button, and
  `ThumbBarUpdateButtons` cannot change how many buttons there are. The button
  count is fixed for the lifetime of the taskbar button.
- The shell can destroy and recreate the taskbar button — on Explorer restart,
  for instance — which invalidates the COM object and the "buttons were added"
  state. It announces this with the `TaskbarButtonCreated` broadcast message.
- Icons are bitmaps at a fixed pixel size drawn for one DPI, and they are
  composited over the flyout, so they read as its foreground and must follow the
  **shell** theme rather than the in-app theme. Both can change while running.

Shipping the six glyphs as image assets would mean six files per size, per
theme — an asset matrix to keep in sync with every DPI the shell may report, and
a build step to go with it.

## Decision

`src-tauri/src/thumbbar.rs` owns the toolbar end to end.

### Threading

Button state lives in a plain `Mutex<ThumbState>` writable from any thread.
Every mutation that has to reach Win32 is funnelled through
`AppHandle::run_on_main_thread`, so the COM object and the icons are only ever
touched on the window thread. The COM pointer and icon set live in thread-local
storage, which makes that invariant structural rather than a convention.

### Message handling

A Win32 subclass on the main window handles three things:

- `TaskbarButtonCreated` — drop the cached COM object, clear the
  "buttons added" flag and rebuild, so a recreated taskbar button gets its
  toolbar back.
- `WM_COMMAND` with `THBN_CLICKED` — map the button id to a Tauri event
  (`like`, `previous`, `play-pause`, `next`) that the inject script already
  listens for, which is the same path the tray menu uses.
- `WM_DPICHANGED` and `WM_SETTINGCHANGE` — the two messages that announce a
  change to the DPI or the shell theme the glyphs were drawn for, so the icon
  set is rebuilt.

Everything else goes to `DefSubclassProc` untouched.

### Glyphs

Icons are rasterised at runtime from implicit functions rather than loaded from
assets. Each glyph is defined as a predicate over the -1..1 box: triangles and
rectangles for the transport controls, and the classic implicit heart
`(u² + v² − 1)³ − u²v³ = 0` for Like, with the outline variant taking the
difference of two scales. Pixels are supersampled 4×4 for anti-aliasing and
written as top-down 32bpp BGRA with premultiplied alpha, which is what
`CreateIconIndirect` expects from a DIB section.

The set is rebuilt whenever the icon size or the shell theme changes, and the
superseded icons are destroyed only after the taskbar has been handed the new
ones — while the update is in flight the shell still references the old handles.

## Consequences

### Positive

- Any DPI and either shell theme are handled by the same code path: the glyph is
  a function, so a new size is a new rasterisation rather than a new asset.
- No image assets, no asset build step, no per-size/per-theme file matrix.
- Recovers by itself from an Explorer restart.
- Buttons reuse the existing Tauri event names, so the toolbar, the tray menu
  and the in-page controls all converge on one handler in the inject script.

### Negative

- Glyph shapes are expressed as coordinates and inequalities, which is harder to
  adjust by eye than editing an SVG. `thumbbar_tests.rs` compensates by
  rendering the alpha channel as ASCII (`cargo test --lib -- thumbbar
  --nocapture`) so the shapes can be inspected.
- Rasterisation is O(size² × 16) per glyph. It runs only when the DPI or theme
  changes, never per update.
- Windows-only by construction; the module is behind `#![cfg(windows)]`.

## Alternatives rejected

| Alternative | Reason |
| --- | --- |
| Ship PNG/ICO assets per size and theme | Asset matrix to maintain and a build step, for six fixed shapes |
| Draw glyphs with GDI+ paths | A drawing dependency and more code than the inequalities it would replace |
| Update the toolbar from any thread | COM apartment and GDI ownership rules make it undefined behaviour |

## Project priorities honored

- **最小コード行数**: one module covers registration, state, message handling
  and rendering, with no assets and no build-time generation.
- **パフォーマンス優先**: no timers and no polling — updates are driven by
  playback events and shell messages. Rasterisation happens on DPI or theme
  changes only, and per update the toolbar does one `ThumbBarUpdateButtons`
  call.
