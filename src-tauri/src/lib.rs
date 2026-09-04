mod acrylic;
mod commands;
mod discord;
mod models;
pub mod telemetry;
mod thumbbar;
mod tray;
mod window;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use tauri::Manager;
use tracing::{info, warn};

use commands::{
    event_change_current_sound, event_like_state_changed, event_playback_state_changed,
    event_seeked, get_settings, post_init, quit_app, save_autostart, save_discord_enabled,
    save_repeat_mode, save_session_replay_enabled, save_shuffle_state, save_start_minimized,
    show_version_dialog,
};
use discord::{CurrentSoundState, DiscordState, PauseTimeoutHandle, DISCORD_APP_ID};
use models::AppSettings;

pub struct DiscordEnabled(pub Arc<AtomicBool>);

fn read_settings(app: &tauri::AppHandle) -> AppSettings {
    AppSettings::persist_missing_defaults(app);
    let settings = AppSettings::load(app);
    info!(?settings, "loaded settings from settings.json");
    settings
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
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
            save_session_replay_enabled,
            show_version_dialog,
            quit_app,
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
