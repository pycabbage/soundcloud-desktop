use discord_rich_presence::DiscordIpc;
use tauri::{Manager, State};
use tracing::{error, info, warn};

use crate::discord::{set_discord_presence, DISCORD_PAUSE_TIMEOUT_SECS};
use crate::models::{
    CurrentSoundState, DiscordState, PauseTimeoutHandle, PendingRequests, PlaybackState,
    SoundAttributes,
};

#[tauri::command]
pub async fn event_change_current_sound(
    request_id: Option<u32>,
    attributes: SoundAttributes,
    pending: State<'_, PendingRequests>,
    discord: State<'_, DiscordState>,
    current_sound: State<'_, CurrentSoundState>,
    pause_timeout: State<'_, PauseTimeoutHandle>,
) -> Result<(), String> {
    // Resolve any pending debug request.
    {
        let mut map = pending.0.lock().await;
        let title = attributes.title.clone().unwrap_or_default();
        let track_id = attributes.id;
        info!(
            title,
            track_id,
            request_id,
            "event: change_current_sound"
        );
        if let Some(tx) = map.remove(&request_id.unwrap_or(0)) {
            let _ = tx.send(title);
        }
    }

    // A new track cancels any active pause timeout.
    {
        let mut handle_guard = pause_timeout.0.lock().unwrap();
        if let Some(handle) = handle_guard.take() {
            handle.abort();
        }
    }

    // New track: default to not playing; the subsequent play event will update the state.
    let new_state = PlaybackState {
        attributes,
        is_playing: false,
        position_ms: 0.0,
    };

    {
        let mut guard = current_sound.0.lock().unwrap();
        *guard = Some(new_state.clone());
    }

    set_discord_presence(&discord, &new_state.attributes, false, 0.0);

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

    // Update the in-memory state; capture the attributes for the presence update.
    let presence_opt = {
        let mut guard = current_sound.0.lock().unwrap();
        if let Some(ref mut state) = *guard {
            let was_playing = state.is_playing;
            state.is_playing = is_playing;
            state.position_ms = position_ms;

            let transition_kind = match (was_playing, is_playing) {
                (false, true) => "paused→playing",
                (true, false) => "playing→paused",
                (true, true) => "playing→playing (checkpoint?)",
                (false, false) => "paused→paused",
            };
            info!(
                was_playing,
                is_playing,
                position_ms,
                transition = transition_kind,
                "event: playback_state_changed"
            );

            Some((state.attributes.clone(), position_ms))
        } else {
            warn!(
                is_playing,
                position_ms,
                "event: playback_state_changed — no current sound in state"
            );
            None
        }
    };

    // Manage the pause-timeout task.
    {
        let mut handle_guard = pause_timeout.0.lock().unwrap();
        // Always cancel the existing task first.
        if let Some(handle) = handle_guard.take() {
            handle.abort();
        }
        // Spawn a new timeout only when pausing.
        if !is_playing {
            let app_clone = app.clone();
            let handle = tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(DISCORD_PAUSE_TIMEOUT_SECS))
                    .await;
                let discord = app_clone.state::<DiscordState>();
                if let Ok(mut guard) = discord.0.lock() {
                    if let Some(client) = guard.as_mut() {
                        match client.clear_activity() {
                            Ok(()) => info!("discord presence cleared after pause timeout"),
                            Err(e) => {
                                error!(error = %e, "discord clear activity failed");
                                *guard = None;
                            }
                        }
                    }
                };
            });
            *handle_guard = Some(handle);
        }
    }

    // Update Discord presence.
    if let Some((attrs, pos_ms)) = presence_opt {
        set_discord_presence(&discord, &attrs, is_playing, pos_ms);
    }

    Ok(())
}

#[tauri::command]
pub async fn event_seeked(
    position_ms: Option<f64>,
    discord: State<'_, DiscordState>,
    current_sound: State<'_, CurrentSoundState>,
) -> Result<(), String> {
    let position_ms = position_ms.unwrap_or(0.0);

    // Update position and recompute start timestamp; capture state for the presence update.
    let state_opt = {
        let mut guard = current_sound.0.lock().unwrap();
        if let Some(ref mut state) = *guard {
            state.position_ms = position_ms;
            if state.is_playing {
                info!(position_ms, "event: seeked (playing)");
            } else {
                info!(position_ms, "event: seeked (paused)");
            }
            Some((state.attributes.clone(), state.is_playing, position_ms))
        } else {
            warn!(position_ms, "event: seeked — no current sound in state");
            None
        }
    };

    if let Some((attrs, is_playing, pos_ms)) = state_opt {
        set_discord_presence(&discord, &attrs, is_playing, pos_ms);
    }

    Ok(())
}
