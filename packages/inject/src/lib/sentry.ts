import * as Sentry from "@sentry/react"

/**
 * Starts the browser SDK. The DSN, release and environment are baked in at
 * bundle time by `scripts/build.ts`.
 *
 * SoundCloud's own errors are reported too, deliberately.
 */
export function initSentry(): void {
  Sentry.init({
    dsn: __SENTRY_DSN__,
    release: __SENTRY_RELEASE__,
    environment: __SENTRY_ENVIRONMENT__,
    enableLogs: true,
    attachStacktrace: true,
    // The Rust SDK tracks app sessions; a browser session would double-count.
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== "BrowserSession"),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
  })
}

/** Applies the Session Replay opt-in, on startup and on every toggle. */
export async function setSessionReplayEnabled(enabled: boolean): Promise<void> {
  const existing = Sentry.getReplay()

  if (!enabled) {
    await existing?.stop()
    return
  }

  // `startBuffering` keeps the error-only mode; `start` would record always.
  if (existing) {
    existing.startBuffering()
    return
  }

  // Replay records the SoundCloud UI itself, so everything is masked and only
  // the buffer around an error is ever sent.
  Sentry.addIntegration(
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    })
  )
}
