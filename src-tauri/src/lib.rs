mod commands;
mod discord;
mod models;
mod tray;
mod window;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use tauri::Manager;
use tauri_plugin_store::StoreExt;
use tracing::{info, warn};

use commands::{
    event_change_current_sound, event_playback_state_changed, event_seeked, post_init,
    save_repeat_mode, save_shuffle_state,
};
use discord::{CurrentSoundState, DiscordState, PauseTimeoutHandle, DISCORD_APP_ID};
use models::AppSettings;

pub struct DiscordEnabled(pub Arc<AtomicBool>);

fn read_settings(app: &tauri::AppHandle) -> AppSettings {
    match app.store("settings.json") {
        Ok(store) => {
            let settings = AppSettings {
                discord_enabled: store
                    .get("discord_enabled")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true),
                start_minimized: store
                    .get("start_minimized")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false),
            };
            info!(?settings, "loaded settings from settings.json");
            settings
        }
        Err(e) => {
            warn!(error = %e, "failed to open settings.json, using defaults");
            AppSettings::default()
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let settings = read_settings(app.handle());

            let discord_enabled = Arc::new(AtomicBool::new(settings.discord_enabled));
            app.manage(DiscordEnabled(discord_enabled.clone()));

            let discord_state = if settings.discord_enabled {
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
            } else {
                info!("discord rich presence disabled by settings");
                DiscordState(std::sync::Mutex::new(None))
            };

            app.manage(discord_state);
            app.manage(CurrentSoundState(std::sync::Mutex::new(None)));
            app.manage(PauseTimeoutHandle(std::sync::Mutex::new(None)));

            tray::setup(app, settings.start_minimized)?;

            Ok(())
        })
        .on_menu_event(tray::on_menu_event)
        .on_tray_icon_event(tray::on_tray_icon_event)
        .on_window_event(tray::on_window_event)
        .invoke_handler(tauri::generate_handler![
            event_change_current_sound,
            event_playback_state_changed,
            event_seeked,
            post_init,
            save_shuffle_state,
            save_repeat_mode,
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
