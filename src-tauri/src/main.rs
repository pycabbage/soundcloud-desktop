// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tracing_subscriber::fmt()
        .pretty()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("soundcloud_desktop=trace,warn")
            }),
        )
        .with_file(true)
        .with_line_number(true)
        .init();
    soundcloud_desktop_lib::run()
}
