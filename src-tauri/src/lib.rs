mod commands;
mod discord;
mod models;
mod tray;

use std::collections::HashMap;

use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use tauri::Manager;
use tokio::sync::Mutex;
use tracing::{info, warn};

use commands::{event_change_current_sound, event_playback_state_changed, event_seeked};
use discord::{CurrentSoundState, DiscordState, PauseTimeoutHandle, DISCORD_APP_ID};
use models::PendingRequests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let discord_state = {
        let mut client = DiscordIpcClient::new(DISCORD_APP_ID);
        match client.connect() {
            Ok(()) => {
                info!("discord rich presence connected");
                DiscordState(std::sync::Mutex::new(Some(client)))
            }
            Err(e) => {
                warn!(error = %e, "failed to connect to discord (will retry)");
                DiscordState(std::sync::Mutex::new(None))
            }
        }
    };

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .manage(PendingRequests(Mutex::new(HashMap::new())))
        .manage(discord_state)
        .manage(CurrentSoundState(std::sync::Mutex::new(None)))
        .manage(PauseTimeoutHandle(std::sync::Mutex::new(None)))
        .plugin(tauri_plugin_media::init())
        .plugin(tauri_plugin_opener::init())
        .setup(tray::setup)
        .on_menu_event(tray::on_menu_event)
        .on_tray_icon_event(tray::on_tray_icon_event)
        .on_window_event(tray::on_window_event)
        .invoke_handler(tauri::generate_handler![
            event_change_current_sound,
            event_playback_state_changed,
            event_seeked,
        ]);
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(false) = window.is_visible() {
                    window.unminimize().ok();
                    window.show().ok();
                }
                window.set_focus().ok();
            }
        }));
    }
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
