mod acrylic;
mod commands;
mod discord;
mod models;
mod thumbbar;
mod tray;
mod window;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use tauri::Manager;
use tauri_plugin_store::StoreExt;
use tracing::{info, warn};

use commands::{
    event_change_current_sound, event_like_state_changed, event_playback_state_changed,
    event_seeked, get_settings, post_init, save_autostart, save_discord_enabled, save_repeat_mode,
    save_shuffle_state, save_start_minimized,
};
use discord::{CurrentSoundState, DiscordState, PauseTimeoutHandle, DISCORD_APP_ID};
use models::AppSettings;

pub struct DiscordEnabled(pub Arc<AtomicBool>);

fn read_settings(app: &tauri::AppHandle) -> AppSettings {
    let defaults = AppSettings::default();

    let store = match app.store("settings.json") {
        Ok(store) => store,
        Err(e) => {
            warn!(error = %e, "failed to open settings.json, using defaults");
            return defaults;
        }
    };

    // Persist default values for any keys missing from settings.json
    let mut needs_save = false;
    if !store.has("discord_enabled") {
        store.set("discord_enabled", defaults.discord_enabled);
        needs_save = true;
    }
    if !store.has("start_minimized") {
        store.set("start_minimized", defaults.start_minimized);
        needs_save = true;
    }
    if !store.has("autostart") {
        store.set("autostart", defaults.autostart);
        needs_save = true;
    }
    if needs_save {
        match store.save() {
            Ok(()) => info!("wrote missing default settings to settings.json"),
            Err(e) => warn!(error = %e, "failed to save default settings to settings.json"),
        }
    }

    let settings = AppSettings {
        discord_enabled: store
            .get("discord_enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(defaults.discord_enabled),
        start_minimized: store
            .get("start_minimized")
            .and_then(|v| v.as_bool())
            .unwrap_or(defaults.start_minimized),
        autostart: store
            .get("autostart")
            .and_then(|v| v.as_bool())
            .unwrap_or(defaults.autostart),
    };
    info!(?settings, "loaded settings from settings.json");
    settings
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
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

            #[cfg(all(desktop, not(debug_assertions)))]
            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart_manager = app.autolaunch();
                if settings.autostart {
                    if let Err(e) = autostart_manager.enable() {
                        warn!(error = %e, "failed to enable autostart");
                    } else {
                        info!("autostart enabled");
                    }
                } else if let Err(e) = autostart_manager.disable() {
                    warn!(error = %e, "failed to disable autostart");
                } else {
                    info!("autostart disabled");
                }
            }

            if let Some(window) = app.get_webview_window("main") {
                window.set_decorations(false)?;
            }

            Ok(())
        })
        .on_menu_event(tray::on_menu_event)
        .on_tray_icon_event(tray::on_tray_icon_event)
        .on_window_event(tray::on_window_event)
        .invoke_handler(tauri::generate_handler![
            event_change_current_sound,
            event_like_state_changed,
            event_playback_state_changed,
            event_seeked,
            post_init,
            save_shuffle_state,
            save_repeat_mode,
            get_settings,
            save_discord_enabled,
            save_start_minimized,
            save_autostart,
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

    #[cfg(debug_assertions)]
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--remote-debugging-port=9223",
    );

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
