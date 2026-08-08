use std::sync::atomic::Ordering;

use tauri::{Manager, State};
use tracing::info;

use crate::discord::{
    handle_playback_changed, handle_seeked, handle_track_changed, CurrentSoundState, DiscordState,
    PauseTimeoutHandle,
};
use tauri_plugin_store::StoreExt;

use crate::models::{AppSettings, PlaybackPrefs, SoundAttributes};
use crate::DiscordEnabled;

#[tauri::command]
pub async fn event_change_current_sound(
    app: tauri::AppHandle,
    attributes: SoundAttributes,
    discord: State<'_, DiscordState>,
    current_sound: State<'_, CurrentSoundState>,
    pause_timeout: State<'_, PauseTimeoutHandle>,
) -> Result<(), String> {
    let title = attributes.title.clone().unwrap_or_default();
    let track_id = attributes.id;
    info!(title, track_id, "event: change_current_sound");
    handle_track_changed(&discord, &current_sound, &pause_timeout, attributes.clone());
    let title = attributes.title.as_deref().unwrap_or("Unknown");
    let artist = attributes
        .user
        .as_ref()
        .and_then(|u| u.username.as_deref())
        .unwrap_or("Unknown Artist");
    crate::tray::update_tray_tooltip(&app, title, artist);
    Ok(())
}

#[tauri::command]
pub async fn event_playback_state_changed(
    app: tauri::AppHandle,
    is_playing: bool,
    position_ms: Option<f64>,
) -> Result<(), String> {
    let position_ms = position_ms.unwrap_or(0.0);

    let discord = app.state::<DiscordState>();
    let current_sound = app.state::<CurrentSoundState>();
    let pause_timeout = app.state::<PauseTimeoutHandle>();

    handle_playback_changed(
        &discord,
        &current_sound,
        &pause_timeout,
        is_playing,
        position_ms,
        app.clone(),
    );

    Ok(())
}

#[tauri::command]
pub async fn event_seeked(
    position_ms: Option<f64>,
    discord: State<'_, DiscordState>,
    current_sound: State<'_, CurrentSoundState>,
) -> Result<(), String> {
    let position_ms = position_ms.unwrap_or(0.0);

    handle_seeked(&discord, &current_sound, position_ms);

    Ok(())
}

#[tauri::command]
pub async fn post_init(app: tauri::AppHandle) -> Result<PlaybackPrefs, String> {
    let store = app.store("state.json").map_err(|e| e.to_string())?;
    let shuffle = store
        .get("shuffle")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let repeat_mode = store
        .get("repeat_mode")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_else(|| "none".to_string());
    info!(shuffle, repeat_mode, "event: post_init");
    let current_sound_state = app.state::<CurrentSoundState>();
    let sound_state = current_sound_state.0.lock().unwrap();
    let tooltip_info = sound_state.as_ref().map(|state| {
        let title = state.attributes.title.as_deref().unwrap_or("Unknown");
        let artist = state
            .attributes
            .user
            .as_ref()
            .and_then(|u| u.username.as_deref())
            .unwrap_or("Unknown Artist");
        (title.to_string(), artist.to_string())
    });
    drop(sound_state);
    match tooltip_info {
        Some((title, artist)) => crate::tray::update_tray_tooltip(&app, &title, &artist),
        None => crate::tray::reset_tray_tooltip(&app),
    }
    Ok(PlaybackPrefs {
        shuffle,
        repeat_mode,
    })
}

#[tauri::command]
pub async fn save_shuffle_state(app: tauri::AppHandle, shuffle: bool) -> Result<(), String> {
    info!(shuffle, "event: save_shuffle_state");
    let store = app.store("state.json").map_err(|e| e.to_string())?;
    store.set("shuffle", shuffle);
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_repeat_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    info!(mode, "event: save_repeat_mode");
    let store = app.store("state.json").map_err(|e| e.to_string())?;
    store.set("repeat_mode", mode);
    store.save().map_err(|e| e.to_string())
}

// ─── Settings commands ────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    let defaults = AppSettings::default();
    Ok(AppSettings {
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
    })
}

#[tauri::command]
pub async fn save_discord_enabled(
    app: tauri::AppHandle,
    enabled: bool,
    discord_enabled_state: State<'_, DiscordEnabled>,
    discord_state: State<'_, DiscordState>,
) -> Result<(), String> {
    use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
    use crate::discord::DISCORD_APP_ID;
    use tracing::warn;

    info!(enabled, "event: save_discord_enabled");

    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("discord_enabled", enabled);
    store.save().map_err(|e| e.to_string())?;

    let prev = discord_enabled_state.0.swap(enabled, Ordering::Relaxed);
    if prev == enabled {
        return Ok(());
    }

    let mut client_guard = discord_state.0.lock().map_err(|e| e.to_string())?;
    if enabled {
        let mut client = DiscordIpcClient::new(DISCORD_APP_ID);
        match client.connect() {
            Ok(()) => {
                info!("discord rich presence connected");
                *client_guard = Some(client);
            }
            Err(e) => {
                warn!(error = %e, "failed to connect to discord (reconnect task will retry)");
            }
        }
    } else if let Some(mut client) = client_guard.take() {
        if let Err(e) = client.close() {
            warn!(error = %e, "error closing discord connection");
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn save_start_minimized(
    app: tauri::AppHandle,
    start_minimized: bool,
) -> Result<(), String> {
    info!(start_minimized, "event: save_start_minimized");
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("start_minimized", start_minimized);
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_autostart(app: tauri::AppHandle, autostart: bool) -> Result<(), String> {
    info!(autostart, "event: save_autostart");

    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("autostart", autostart);
    store.save().map_err(|e| e.to_string())?;

    #[cfg(desktop)]
    {
        use tauri_plugin_autostart::ManagerExt;
        let autostart_manager = app.autolaunch();
        if autostart {
            autostart_manager.enable().map_err(|e| e.to_string())?;
        } else {
            autostart_manager.disable().map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<(), String> {
    crate::updater::handle_check_updates(app, true).await;
    Ok(())
}
