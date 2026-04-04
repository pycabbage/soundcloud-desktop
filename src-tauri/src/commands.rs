use tauri::{Manager, State};
use tracing::info;

use crate::discord::{
    handle_playback_changed, handle_seeked, handle_track_changed, CurrentSoundState, DiscordState,
    PauseTimeoutHandle,
};
use tauri_plugin_store::StoreExt;

use crate::models::{PendingRequests, PlaybackPrefs, SoundAttributes};

/// Resolve a pending debug request by sending the track title to the waiting oneshot.
async fn resolve_pending_request(
    pending: &PendingRequests,
    request_id: Option<u32>,
    attributes: &SoundAttributes,
) {
    let mut map = pending.0.lock().await;
    let title = attributes.title.clone().unwrap_or_default();
    let track_id = attributes.id;
    info!(title, track_id, request_id, "event: change_current_sound");
    if let Some(tx) = map.remove(&request_id.unwrap_or(0)) {
        let _ = tx.send(title);
    }
}

#[tauri::command]
pub async fn event_change_current_sound(
    request_id: Option<u32>,
    attributes: SoundAttributes,
    pending: State<'_, PendingRequests>,
    discord: State<'_, DiscordState>,
    current_sound: State<'_, CurrentSoundState>,
    pause_timeout: State<'_, PauseTimeoutHandle>,
) -> Result<(), String> {
    resolve_pending_request(&pending, request_id, &attributes).await;
    handle_track_changed(&discord, &current_sound, &pause_timeout, attributes);
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

#[cfg(test)]
#[path = "commands_tests.rs"]
mod tests;
