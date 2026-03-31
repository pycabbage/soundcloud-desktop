use std::time::{SystemTime, UNIX_EPOCH};

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use tauri::Manager;
use tracing::{debug, error, info};

use crate::models::{CurrentSoundState, DiscordState, SoundAttributes};

pub const DISCORD_APP_ID: &str = "1488035816130351224";
/// Clear Discord presence after being paused for this many seconds (10 minutes).
pub const DISCORD_PAUSE_TIMEOUT_SECS: u64 = 600;

/// Clamp text to Discord's 128-character limit. Pads to the required 2-character minimum.
pub fn truncate_discord_text(s: &str) -> String {
    let s = s.trim();
    let chars: Vec<char> = s.chars().collect();
    match chars.len() {
        0 => "  ".to_string(),
        1 => format!("{s} "),
        2..=128 => s.to_string(),
        _ => {
            let truncated: String = chars[..127].iter().collect();
            format!("{truncated}…")
        }
    }
}

/// Build and send a Discord Rich Presence activity for the given playback state.
/// Returns `false` if `set_activity` fails (connection was lost).
pub fn update_discord_presence(
    client: &mut DiscordIpcClient,
    attrs: &SoundAttributes,
    is_playing: bool,
    position_ms: f64,
) -> bool {
    let title = attrs.title.as_deref().unwrap_or("");
    let artist = attrs
        .user
        .as_ref()
        .and_then(|u| u.username.as_deref())
        .unwrap_or("");

    let details = truncate_discord_text(title);
    let state_text = truncate_discord_text(artist);

    // Upgrade thumbnail from the small 100×100 variant to 500×500.
    let image_url: Option<String> = attrs
        .artwork_url
        .as_deref()
        .map(|u| u.replace("-large", "-t500x500"));

    let permalink_url = attrs.permalink_url.as_deref().unwrap_or("");

    let artist_url = attrs
        .user
        .as_ref()
        .and_then(|u| u.permalink_url.as_deref())
        .unwrap_or("");

    let mut act = activity::Activity::new()
        .activity_type(activity::ActivityType::Listening)
        .status_display_type(activity::StatusDisplayType::Details)
        .details(&details)
        .state(&state_text);

    if !permalink_url.is_empty() {
        act = act.details_url(permalink_url);
    }
    if !artist_url.is_empty() {
        act = act.state_url(artist_url);
    }

    // Assets: artwork image; show "⏸" as large_text only when paused
    if let Some(ref url) = image_url {
        let mut assets = activity::Assets::new().large_image(url);
        if !is_playing {
            assets = assets.large_text(truncate_discord_text("⏸"));
        }
        act = act.assets(assets);
    }

    // Timestamps for seekbar (playing only)
    if is_playing {
        if let Some(full_duration) = attrs.full_duration {
            let now_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock before UNIX epoch")
                .as_millis() as i64;
            let start_ms = now_ms - (position_ms as i64);
            let end_ms = start_ms + (full_duration as i64);
            act = act.timestamps(activity::Timestamps::new().start(start_ms).end(end_ms));
        }
    }

    debug!(
        title,
        artist,
        is_playing,
        position_ms,
        "update_discord_presence: calling set_activity"
    );

    // When pausing, clear the old activity first so Discord drops stale timestamps.
    if !is_playing {
        let _ = client.clear_activity();
    }

    match client.set_activity(act) {
        Ok(()) => true,
        Err(e) => {
            error!(error = %e, "discord presence update failed");
            false
        }
    }
}

/// Lock the Discord client, update presence, and mark it `None` on failure so the
/// auto-reconnect task can pick it up.
pub fn set_discord_presence(
    discord: &DiscordState,
    attrs: &SoundAttributes,
    is_playing: bool,
    position_ms: f64,
) {
    if let Ok(mut guard) = discord.0.lock() {
        let failed = if let Some(client) = guard.as_mut() {
            !update_discord_presence(client, attrs, is_playing, position_ms)
        } else {
            false
        };
        if failed {
            *guard = None;
        }
    }
}

/// Spawn the background task that reconnects to Discord every 5 seconds when disconnected.
pub fn spawn_reconnect_task(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;

            let discord = app_handle.state::<DiscordState>();
            let needs_reconnect = discord.0.lock().map(|g| g.is_none()).unwrap_or(false);

            if !needs_reconnect {
                continue;
            }

            let mut client = DiscordIpcClient::new(DISCORD_APP_ID);
            if client.connect().is_err() {
                continue;
            }

            info!("discord rich presence reconnected");

            // Restore the last known presence after reconnecting.
            let state_opt = app_handle
                .state::<CurrentSoundState>()
                .0
                .lock()
                .ok()
                .and_then(|g| g.clone());

            if let Some(ref state) = state_opt {
                update_discord_presence(
                    &mut client,
                    &state.attributes,
                    state.is_playing,
                    state.position_ms,
                );
            }

            if let Ok(mut guard) = discord.0.lock() {
                *guard = Some(client);
            };
        }
    });
}
