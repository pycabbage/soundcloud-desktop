use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use tauri::Manager;
use tracing::{error, info, warn};

use crate::models::{PlaybackState, SoundAttributes};
use crate::DiscordEnabled;

// ─── Types (app state wrappers) ──────────────────────────────────────────────

pub struct DiscordState(pub std::sync::Mutex<Option<DiscordIpcClient>>);
pub struct CurrentSoundState(pub std::sync::Mutex<Option<PlaybackState>>);
pub struct PauseTimeoutHandle(pub std::sync::Mutex<Option<tokio::task::JoinHandle<()>>>);

// ─── Constants ───────────────────────────────────────────────────────────────

pub const DISCORD_APP_ID: &str = "1488035816130351224";
/// Clear Discord presence after being paused for this many seconds (10 minutes).
pub const DISCORD_PAUSE_TIMEOUT_SECS: u64 = 600;

// ─── Layer A: Pure functions ─────────────────────────────────────────────────

/// Clamp text to Discord's 2–128 character range.
///
/// - Trims whitespace; empty → `"  "` (two spaces).
/// - Single char → padded with a trailing space (Discord requires ≥ 2).
/// - Over 128 chars → truncated to 127 + `"…"`.
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

/// Pre-computed fields ready for building a Discord activity.
pub struct PresenceFields {
    pub title: String,
    pub artist: String,
    pub artwork_url: Option<String>,
    pub track_url: String,
    pub artist_url: String,
    pub full_duration_ms: Option<u64>,
}

impl PresenceFields {
    pub fn from_attributes(attrs: &SoundAttributes) -> Self {
        let title = truncate_discord_text(attrs.title.as_deref().unwrap_or(""));
        let artist = truncate_discord_text(
            attrs
                .user
                .as_ref()
                .and_then(|u| u.username.as_deref())
                .unwrap_or(""),
        );
        let artwork_url = attrs
            .artwork_url
            .as_deref()
            .map(|u| u.replace("-large", "-t500x500"));
        let track_url = attrs.permalink_url.as_deref().unwrap_or("").to_string();
        let artist_url = attrs
            .user
            .as_ref()
            .and_then(|u| u.permalink_url.as_deref())
            .unwrap_or("")
            .to_string();
        let full_duration_ms = attrs.full_duration;

        Self {
            title,
            artist,
            artwork_url,
            track_url,
            artist_url,
            full_duration_ms,
        }
    }
}

/// Build a Discord Rich Presence activity from pre-computed fields.
///
/// `now_ms` is injected (milliseconds since UNIX epoch) so callers can test
/// timestamp arithmetic without depending on the system clock.
pub fn build_activity<'a>(
    fields: &'a PresenceFields,
    is_playing: bool,
    position_ms: f64,
    now_ms: i64,
) -> activity::Activity<'a> {
    let mut act = activity::Activity::new()
        .activity_type(activity::ActivityType::Listening)
        .status_display_type(activity::StatusDisplayType::Details)
        .details(&fields.title)
        .state(&fields.artist);

    if !fields.track_url.is_empty() {
        act = act.details_url(&fields.track_url);
    }
    if !fields.artist_url.is_empty() {
        act = act.state_url(&fields.artist_url);
    }

    // Assets: artwork image; show "⏸" as large_text only when paused.
    if let Some(ref url) = fields.artwork_url {
        let mut assets = activity::Assets::new().large_image(url);
        if !is_playing {
            assets = assets.large_text(truncate_discord_text("⏸"));
        }
        act = act.assets(assets);
    }

    // Timestamps for the seekbar — only when actively playing with a known duration.
    if is_playing {
        if let Some(full_duration) = fields.full_duration_ms {
            let start_ms = now_ms - (position_ms as i64);
            let end_ms = start_ms + (full_duration as i64);
            act = act.timestamps(activity::Timestamps::new().start(start_ms).end(end_ms));
        }
    }

    act
}

// ─── State mutation helpers (operate on &mut Option<PlaybackState>) ──────────

/// Set a new track. Returns the new `PlaybackState` (is_playing=false, position=0).
fn apply_track_change(
    state: &mut Option<PlaybackState>,
    attributes: SoundAttributes,
) -> PlaybackState {
    let new_state = PlaybackState {
        attributes,
        is_playing: false,
        position_ms: 0.0,
    };
    *state = Some(new_state.clone());
    new_state
}

/// Update playback. Returns `Some((attributes, position_ms, was_playing))` if state exists.
fn apply_playback_change(
    state: &mut Option<PlaybackState>,
    is_playing: bool,
    position_ms: f64,
) -> Option<(SoundAttributes, f64, bool)> {
    let s = state.as_mut()?;
    let was_playing = s.is_playing;
    s.is_playing = is_playing;
    s.position_ms = position_ms;
    Some((s.attributes.clone(), position_ms, was_playing))
}

/// Update seek position. Returns `Some((attributes, is_playing, position_ms))` if state exists.
fn apply_seek(
    state: &mut Option<PlaybackState>,
    position_ms: f64,
) -> Option<(SoundAttributes, bool, f64)> {
    let s = state.as_mut()?;
    s.position_ms = position_ms;
    Some((s.attributes.clone(), s.is_playing, position_ms))
}

// ─── Layer B: Discord IPC operations ─────────────────────────────────────────

/// Build and send presence. Returns `false` if the connection is broken.
fn send_presence(
    client: &mut DiscordIpcClient,
    fields: &PresenceFields,
    is_playing: bool,
    position_ms: f64,
) -> bool {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before UNIX epoch")
        .as_millis() as i64;

    // When pausing, clear first to drop stale timestamps.
    if !is_playing {
        let _ = client.clear_activity();
    }

    let act = build_activity(fields, is_playing, position_ms, now_ms);
    match client.set_activity(act) {
        Ok(()) => true,
        Err(e) => {
            error!(error = %e, "discord set_activity failed");
            false
        }
    }
}

/// Clear Discord activity. Returns `false` if the connection is broken.
fn clear_presence(client: &mut DiscordIpcClient) -> bool {
    match client.clear_activity() {
        Ok(()) => true,
        Err(e) => {
            error!(error = %e, "discord clear_activity failed");
            false
        }
    }
}

/// Lock `DiscordState`, send presence, and mark `None` on failure for reconnect.
fn update_presence_locked(
    discord: &DiscordState,
    attrs: &SoundAttributes,
    is_playing: bool,
    position_ms: f64,
) {
    if let Ok(mut guard) = discord.0.lock() {
        let failed = if let Some(client) = guard.as_mut() {
            let fields = PresenceFields::from_attributes(attrs);
            !send_presence(client, &fields, is_playing, position_ms)
        } else {
            false
        };
        if failed {
            *guard = None;
        }
    }
}

// ─── Pause timeout helpers ───────────────────────────────────────────────────

fn cancel_pause_timeout(pause_timeout: &PauseTimeoutHandle) {
    let mut handle_guard = pause_timeout.0.lock().unwrap();
    if let Some(handle) = handle_guard.take() {
        handle.abort();
    }
}

fn start_pause_timeout(pause_timeout: &PauseTimeoutHandle, app_handle: tauri::AppHandle) {
    let mut handle_guard = pause_timeout.0.lock().unwrap();
    let handle = tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(DISCORD_PAUSE_TIMEOUT_SECS)).await;
        let discord = app_handle.state::<DiscordState>();
        if let Ok(mut guard) = discord.0.lock() {
            if let Some(client) = guard.as_mut() {
                if !clear_presence(client) {
                    *guard = None;
                } else {
                    info!("discord presence cleared after pause timeout");
                }
            }
        };
    });
    *handle_guard = Some(handle);
}

// ─── Layer C: Event handlers (public API) ────────────────────────────────────

/// Handle new track event.
pub fn handle_track_changed(
    discord: &DiscordState,
    current_sound: &CurrentSoundState,
    pause_timeout: &PauseTimeoutHandle,
    attributes: SoundAttributes,
) {
    cancel_pause_timeout(pause_timeout);

    let new_state = {
        let mut guard = current_sound.0.lock().unwrap();
        apply_track_change(&mut guard, attributes)
    };

    info!(
        title = new_state.attributes.title.as_deref().unwrap_or(""),
        "handle_track_changed"
    );

    update_presence_locked(discord, &new_state.attributes, false, 0.0);
}

/// Handle playback state change (play/pause).
pub fn handle_playback_changed(
    discord: &DiscordState,
    current_sound: &CurrentSoundState,
    pause_timeout: &PauseTimeoutHandle,
    is_playing: bool,
    position_ms: f64,
    app_handle: tauri::AppHandle,
) {
    cancel_pause_timeout(pause_timeout);

    let result = {
        let mut guard = current_sound.0.lock().unwrap();
        apply_playback_change(&mut guard, is_playing, position_ms)
    };

    let Some((attrs, pos_ms, was_playing)) = result else {
        warn!("handle_playback_changed: no current sound in state");
        return;
    };

    let transition = match (was_playing, is_playing) {
        (false, true) => "paused→playing",
        (true, false) => "playing→paused",
        (true, true) => "playing→playing",
        (false, false) => "paused→paused",
    };
    info!(transition, position_ms, "handle_playback_changed");

    if !is_playing {
        start_pause_timeout(pause_timeout, app_handle);
    }

    update_presence_locked(discord, &attrs, is_playing, pos_ms);
}

/// Handle seek event.
pub fn handle_seeked(discord: &DiscordState, current_sound: &CurrentSoundState, position_ms: f64) {
    let result = {
        let mut guard = current_sound.0.lock().unwrap();
        apply_seek(&mut guard, position_ms)
    };

    let Some((attrs, is_playing, pos_ms)) = result else {
        warn!("handle_seeked: no current sound in state");
        return;
    };

    info!(position_ms, is_playing, "handle_seeked");
    update_presence_locked(discord, &attrs, is_playing, pos_ms);
}

// ─── Reconnect task ──────────────────────────────────────────────────────────

/// Spawn the background task that reconnects to Discord every 5 seconds when disconnected.
pub fn spawn_reconnect_task(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;

            let enabled = app_handle
                .state::<DiscordEnabled>()
                .0
                .load(Ordering::Relaxed);
            if !enabled {
                continue;
            }

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

            // Restore presence from current state.
            let state_opt = app_handle
                .state::<CurrentSoundState>()
                .0
                .lock()
                .ok()
                .and_then(|g| g.clone());

            if let Some(ref state) = state_opt {
                let fields = PresenceFields::from_attributes(&state.attributes);
                let _ = send_presence(&mut client, &fields, state.is_playing, state.position_ms);
            }

            if let Ok(mut guard) = discord.0.lock() {
                *guard = Some(client);
            };
        }
    });
}

#[cfg(test)]
#[path = "discord_tests.rs"]
mod tests;
