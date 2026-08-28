// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

fn main() {
    // Held until `main` returns so queued events are flushed on exit.
    let _sentry = soundcloud_desktop_lib::telemetry::init();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("soundcloud_desktop=trace,warn")
            }),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .pretty()
                .with_file(true)
                .with_line_number(true),
        )
        // ERROR becomes an issue plus a log, WARN/INFO become breadcrumbs plus
        // logs, DEBUG/TRACE are dropped.
        .with(sentry::integrations::tracing::layer())
        .init();

    soundcloud_desktop_lib::run()
}
