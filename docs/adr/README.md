# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs): short documents that
capture a significant architectural choice, the context that motivated it, and its
consequences, so future contributors understand *why* the code looks the way it does.

We use a Nyx-style lightweight format with four sections:

- **Status** — proposed | accepted | deprecated | superseded
- **Context** — the forces and constraints at play
- **Decision** — what we chose and why
- **Consequences** — resulting benefits, trade-offs, and follow-ups

## Index

| Number | Title | Status |
| ------ | ----- | ------ |
| 0001 | [TS-only URL drop interception via vendor handler patch](0001-inject-url-drop-queue.md) | accepted (partly superseded by 0005) |
| 0002 | [Member-fingerprint webpack module lookup](0002-webpack-member-fingerprint.md) | accepted |
| 0003 | [Vendor ThemeStore subscription over MutationObserver](0003-theme-vendor-store.md) | accepted |
| 0004 | [Acrylic kept active while inactive via WM_NCACTIVATE interception](0004-acrylic-active-while-inactive.md) | accepted |
| 0005 | [Push-based startup hooks instead of polling in the inject script](0005-inject-push-based-startup-hooks.md) | accepted |
| 0006 | [Like state driven through the vendor toggle collection](0006-like-state-via-toggle-collection.md) | accepted |
| 0007 | [Windows thumbnail toolbar with procedurally drawn glyphs](0007-windows-thumbnail-toolbar.md) | accepted |
| 0008 | [Sentry via two first-party SDKs with bundle-time configuration](0008-sentry-two-sdks-with-baked-in-config.md) | accepted |

## Conventions

- Files are named `NNNN-short-title.md`, numbered sequentially; never reuse numbers.
- Statuses: `proposed`, `accepted`, `deprecated`, `superseded`.
- New ADRs must justify the design against this project's core priorities:
  **minimal lines of code** and **performance first**, especially where the inject
  script hooks SoundCloud's internal webpack modules.
