//! Sentry wiring for the Rust half of the app. The browser half is configured
//! at bundle time in `packages/inject/scripts/build.ts`.

/// Starts the Rust SDK. The returned guard flushes pending events when dropped,
/// so the caller must hold it for the lifetime of the process.
pub fn init() -> sentry::ClientInitGuard {
    sentry::init(
        sentry::ClientOptions::new()
            // Public ingest key, not a secret. Mirrored in the inject build.
            .dsn("https://f78ee57daddf5e3c3bfc83dee8abff2b@o4504452056875008.ingest.us.sentry.io/4511989617983488")
            // Must match `__SENTRY_RELEASE__` in the inject bundle.
            .release(concat!(env!("CARGO_PKG_NAME"), "@", env!("CARGO_PKG_VERSION")))
            .environment(if cfg!(debug_assertions) {
                "development"
            } else {
                "production"
            })
            .auto_session_tracking(true)
            .attach_stacktrace(true),
    )
}
