# 0004 — Keep acrylic backdrop active while inactive via WM_NCACTIVATE interception

## Status

Accepted

## Context

The window applies the DWM system backdrop (`Effect::Acrylic` →
`DwmSetWindowAttribute(DWMWA_SYSTEMBACKDROP_TYPE, DWMSBT_TRANSIENTWINDOW)`).
Windows deactivates the backdrop whenever the window loses activation — this is
DWM behaviour tied to the activation state, not something configurable.

Options considered:

- `SetWindowCompositionAttribute(ACCENT_ENABLE_ACRYLICBLURBEHIND)` fallback:
  undocumented API and has known performance concerns on some configurations.
  Rejected.
- Hand-rolled DirectComposition + DWM implementation: large performance impact
  and hard to get right. Rejected.
- Keep `DWMSBT_TRANSIENTWINDOW`, but swallow deactivation notifications so DWM
  never sees the flip. Chosen.

## Decision

A Win32 subclass (`SetWindowSubclass`) is installed on the main WebView2 host
HWND at startup (`src-tauri/src/acrylic.rs`). When `WM_NCACTIVATE` arrives with
`wParam = FALSE`, the subclass answers
`DefWindowProcW(hwnd, WM_NCACTIVATE, TRUE, -1)` instead of passing the real
message down. Every other message is forwarded to `DefSubclassProc` untouched,
so tao's own focus bookkeeping (`Focused` events etc.) keeps working.

Installation/removal is guarded by an atomic counter, making it idempotent.

Whether DWM consults only the `WM_NCACTIVATE` path for backdrop deactivation is
undocumented; in practice (verified on Windows 11 build 26200) the acrylic stays
active while the window is inactive.

## Consequences

**Positive**

- Documented-API-only solution: `SetWindowSubclass` / `DefWindowProcW`, plus the
  already-used `DWMSBT_TRANSIENTWINDOW`. No undocumented accent APIs, no
  DirectComposition surface management.
- Focus reporting to the app is unaffected: tao still receives real activation
  changes because `DefSubclassProc` sees nothing different; only what DWM's
  default proc observes is faked.
- Minimal LOC: one small module + one install call after `set_effects`.

**Negative / accepted trade-offs**

- DWM draws all activation-linked visuals (frame, border, drop shadow) from the
  same faked state, so the drop shadow remains visible while inactive.
- Suppressing it was tried with `DWMWA_NCRENDERING_POLICY`
  (`DWMNCRP_DISABLED` while inactive, restored to `DWMNCRP_USEWINDOWSTYLE` on
  activation). Result: while inactive the frame downgraded to a legacy,
  Windows 7-like border rather than just hiding the shadow. Reverted;
  the inactive shadow is accepted as a side effect of this technique.
- Best-effort by nature: if a future Windows build stops keying the backdrop off
  the faked path, the acrylic will simply dim again (graceful degradation).

**Project priorities honored**

- 最小コード行数 (minimal LOC): single ~100-line module, no build-time or
  per-frame cost; the subclass does one comparison per message.
- パフォーマンス優先 (performance first): no compositor surfaces, no timers, no
  polling — zero ongoing overhead beyond the standard message pump.

## Alternatives rejected

| Alternative | Reason |
| --- | --- |
| `ACCENT_ENABLE_ACRYLICBLURBEHIND` | Undocumented; performance concerns |
| DirectComposition + custom DWM | Heavy performance cost, high complexity |
| Live with vanilla behaviour | Acrylic vanishing while inactive defeats the design intent |
