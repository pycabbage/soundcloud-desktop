use tauri::{Manager, State};
use tracing::info;

use crate::discord::{
    handle_playback_changed, handle_seeked, handle_track_changed, CurrentSoundState, DiscordState,
    PauseTimeoutHandle,
};
use crate::models::{PendingRequests, SoundAttributes};

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

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use tokio::sync::{oneshot, Mutex};

    use crate::models::{PendingRequests, SoundAttributes};

    use super::resolve_pending_request;

    fn make_empty_attrs() -> SoundAttributes {
        SoundAttributes {
            id: None, kind: None, monetization_model: None, policy: None,
            artwork_url: None, caption: None, commentable: None, comment_count: None,
            created_at: None, description: None, display_date: None,
            downloadable: None, download_count: None, duration: None,
            embeddable_by: None, full_duration: None, genre: None,
            has_downloads_left: None, label_name: None, last_modified: None,
            license: None, likes_count: None, media: None, permalink: None,
            permalink_url: None, playback_count: None, public: None,
            publisher_metadata: None, purchase_title: None, purchase_url: None,
            release_date: None, reposts_count: None, secret_token: None,
            sharing: None, state: None, station_permalink: None, station_urn: None,
            streamable: None, tag_list: None, title: None,
            track_authorization: None, uri: None, urn: None, user: None,
            user_id: None, visuals: None, waveform_url: None,
        }
    }

    #[tokio::test]
    async fn resolve_matching_request() {
        let (tx, rx) = oneshot::channel::<String>();
        let mut map = HashMap::new();
        map.insert(42u32, tx);
        let pending = PendingRequests(Mutex::new(map));

        let mut attrs = make_empty_attrs();
        attrs.title = Some("Test Song".to_string());

        resolve_pending_request(&pending, Some(42), &attrs).await;

        let result = rx.await.unwrap();
        assert_eq!(result, "Test Song");
        assert!(pending.0.lock().await.is_empty());
    }

    #[tokio::test]
    async fn resolve_no_matching_request() {
        let (tx, _rx) = oneshot::channel::<String>();
        let mut map = HashMap::new();
        map.insert(42u32, tx);
        let pending = PendingRequests(Mutex::new(map));

        let attrs = make_empty_attrs();

        // request_id 99 does not match 42
        resolve_pending_request(&pending, Some(99), &attrs).await;

        // The map still has the entry for 42
        assert!(pending.0.lock().await.contains_key(&42));
    }

    #[tokio::test]
    async fn resolve_none_request_id() {
        let (tx, rx) = oneshot::channel::<String>();
        let mut map = HashMap::new();
        // key 0 matches request_id None (unwrap_or(0))
        map.insert(0u32, tx);
        let pending = PendingRequests(Mutex::new(map));

        let mut attrs = make_empty_attrs();
        attrs.title = Some("Fallback".to_string());

        resolve_pending_request(&pending, None, &attrs).await;

        let result = rx.await.unwrap();
        assert_eq!(result, "Fallback");
    }
}
