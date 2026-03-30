use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::Deserialize;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    webview::PageLoadEvent,
    Emitter, Manager, State,
};
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};
use tokio::sync::{oneshot, Mutex};

const DISCORD_APP_ID: &str = "1488035816130351224";
/// Clear Discord presence after being paused for this many seconds (10 minutes).
const DISCORD_PAUSE_TIMEOUT_SECS: u64 = 600;

struct PendingRequests(Mutex<HashMap<u32, oneshot::Sender<String>>>);
struct DiscordState(std::sync::Mutex<Option<DiscordIpcClient>>);

/// Snapshot of the currently playing track and its playback state.
#[derive(Clone)]
struct PlaybackState {
    attributes: SoundAttributes,
    is_playing: bool,
    /// Current playback position in milliseconds (from `Sound.currentTime()`).
    position_ms: f64,
    /// Precomputed Discord `start` timestamp (Unix seconds).
    /// Computed once when playback transitions from paused → playing, and on seek.
    /// Not updated on checkpoint `play` events (true → true) to avoid timer resets.
    discord_start_s: Option<i64>,
}

/// Managed state holding the last known playback state. `None` when nothing is playing.
struct CurrentSoundState(std::sync::Mutex<Option<PlaybackState>>);

/// Managed state holding the handle of the active pause-timeout task.
/// Aborted when playback resumes or a new track starts.
struct PauseTimeoutHandle(std::sync::Mutex<Option<tokio::task::JoinHandle<()>>>);

// ─── SoundCloud model types ───────────────────────────────────────────────────

#[derive(Clone, Deserialize)]
struct SoundUserBadges {
    pro: Option<bool>,
    creator_mid_tier: Option<bool>,
    pro_unlimited: Option<bool>,
    verified: Option<bool>,
}

#[derive(Clone, Deserialize)]
struct SoundUser {
    id: Option<u64>,
    kind: Option<String>,
    avatar_url: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    full_name: Option<String>,
    permalink: Option<String>,
    permalink_url: Option<String>,
    uri: Option<String>,
    urn: Option<String>,
    username: Option<String>,
    verified: Option<bool>,
    city: Option<String>,
    country_code: Option<String>,
    followers_count: Option<u32>,
    last_modified: Option<String>,
    badges: Option<SoundUserBadges>,
    station_urn: Option<String>,
    station_permalink: Option<String>,
}

#[derive(Clone, Deserialize)]
struct SoundPublisherMetadata {
    id: Option<u64>,
    urn: Option<String>,
    contains_music: Option<bool>,
}

#[derive(Clone, Deserialize)]
struct SoundTranscodingFormat {
    protocol: Option<String>,
    mime_type: Option<String>,
}

#[derive(Clone, Deserialize)]
struct SoundTranscoding {
    url: Option<String>,
    preset: Option<String>,
    duration: Option<u64>,
    snipped: Option<bool>,
    format: Option<SoundTranscodingFormat>,
    quality: Option<String>,
    is_legacy_transcoding: Option<bool>,
}

#[derive(Clone, Deserialize)]
struct SoundMedia {
    transcodings: Option<Vec<SoundTranscoding>>,
}

#[derive(Clone, Deserialize)]
struct SoundAttributes {
    id: Option<u64>,
    kind: Option<String>,
    monetization_model: Option<String>,
    policy: Option<String>,
    artwork_url: Option<String>,
    caption: Option<String>,
    commentable: Option<bool>,
    comment_count: Option<u32>,
    created_at: Option<String>,
    description: Option<String>,
    display_date: Option<String>,
    downloadable: Option<bool>,
    download_count: Option<u32>,
    duration: Option<u64>,
    embeddable_by: Option<String>,
    full_duration: Option<u64>,
    genre: Option<String>,
    has_downloads_left: Option<bool>,
    label_name: Option<String>,
    last_modified: Option<String>,
    license: Option<String>,
    likes_count: Option<u32>,
    media: Option<SoundMedia>,
    permalink: Option<String>,
    permalink_url: Option<String>,
    playback_count: Option<u32>,
    public: Option<bool>,
    publisher_metadata: Option<SoundPublisherMetadata>,
    purchase_title: Option<String>,
    purchase_url: Option<String>,
    release_date: Option<String>,
    reposts_count: Option<u32>,
    secret_token: Option<String>,
    sharing: Option<String>,
    state: Option<String>,
    station_permalink: Option<String>,
    station_urn: Option<String>,
    streamable: Option<bool>,
    tag_list: Option<String>,
    title: Option<String>,
    track_authorization: Option<String>,
    uri: Option<String>,
    urn: Option<String>,
    user: Option<SoundUser>,
    user_id: Option<u64>,
    visuals: Option<serde_json::Value>,
    waveform_url: Option<String>,
}

// ─── Discord helpers ──────────────────────────────────────────────────────────

/// Clamp text to Discord's 128-character limit. Pads to the required 2-character minimum.
fn truncate_discord_text(s: &str) -> String {
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
fn update_discord_presence(
    client: &mut DiscordIpcClient,
    attrs: &SoundAttributes,
    is_playing: bool,
    discord_start_s: Option<i64>,
) -> bool {
    let title = attrs.title.as_deref().unwrap_or("");
    let artist = attrs
        .user
        .as_ref()
        .and_then(|u| u.username.as_deref())
        .unwrap_or("");

    let details = truncate_discord_text(title);
    // State always shows the artist name so it is always a clickable link.
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

    // large_text is only shown when paused (renders as visible label line in Discord's
    // Listening card). During playback it is omitted to avoid a duplicate artist line.
    let pause_text = if !is_playing {
        Some(truncate_discord_text("⏸"))
    } else {
        None
    };
    if let Some(ref url) = image_url {
        let mut assets = activity::Assets::new().large_image(url);
        if let Some(ref text) = pause_text {
            assets = assets.large_text(text);
        }
        act = act.assets(assets);
    }

    if is_playing {
        if let Some(start) = discord_start_s {
            let full_duration_s = attrs.full_duration.unwrap_or(0) as i64 / 1000;
            let end = start + full_duration_s;
            act = act.timestamps(activity::Timestamps::new().start(start).end(end));
        }
    }

    if !permalink_url.is_empty() {
        act = act.buttons(vec![activity::Button::new(
            "Open on SoundCloud",
            permalink_url,
        )]);
    }

    match client.set_activity(act) {
        Ok(()) => true,
        Err(e) => {
            eprintln!("Discord presence update error: {e}");
            false
        }
    }
}

/// Lock the Discord client, update presence, and mark it `None` on failure so the
/// auto-reconnect task can pick it up.
fn set_discord_presence(
    discord: &DiscordState,
    attrs: &SoundAttributes,
    is_playing: bool,
    discord_start_s: Option<i64>,
) {
    if let Ok(mut guard) = discord.0.lock() {
        let failed = if let Some(client) = guard.as_mut() {
            !update_discord_presence(client, attrs, is_playing, discord_start_s)
        } else {
            false
        };
        if failed {
            *guard = None;
        }
    }
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
async fn event_change_current_sound(
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
        println!(
            "Received result for request {}: {}",
            request_id.unwrap_or(0),
            title
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
        discord_start_s: None,
    };

    {
        let mut guard = current_sound.0.lock().unwrap();
        *guard = Some(new_state.clone());
    }

    set_discord_presence(&discord, &new_state.attributes, false, None);

    Ok(())
}

#[tauri::command]
async fn event_playback_state_changed(
    app: tauri::AppHandle,
    is_playing: bool,
    position_ms: Option<f64>,
) -> Result<(), String> {
    let position_ms = position_ms.unwrap_or(0.0);
    if is_playing {
        println!("Playback: playing at {position_ms:.0}ms");
    } else {
        println!("Playback: paused at {position_ms:.0}ms");
    }

    let discord = app.state::<DiscordState>();
    let current_sound = app.state::<CurrentSoundState>();
    let pause_timeout = app.state::<PauseTimeoutHandle>();

    // Update the in-memory state; capture the attributes and start timestamp for the presence update.
    let presence_opt = {
        let mut guard = current_sound.0.lock().unwrap();
        if let Some(ref mut state) = *guard {
            let was_playing = state.is_playing;
            state.is_playing = is_playing;
            state.position_ms = position_ms;

            // Only (re)compute discord_start_s when transitioning from paused → playing.
            // Checkpoint events arrive as true → true; we leave start unchanged to prevent
            // the Discord timer from resetting every 15 seconds.
            if is_playing && !was_playing {
                let now_s = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64;
                // If position is very small (< 2 s) this is a fresh track start; treat as 0
                // to avoid a 1-second bias from the audio engine having already buffered ahead.
                let position_s = if position_ms < 2000.0 {
                    0
                } else {
                    (position_ms / 1000.0) as i64
                };
                state.discord_start_s = Some(now_s - position_s);
            }

            Some((state.attributes.clone(), state.discord_start_s))
        } else {
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
                            Ok(()) => println!("Discord presence cleared after pause timeout"),
                            Err(e) => {
                                eprintln!("Discord clear activity error: {e}");
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
    if let Some((attrs, discord_start_s)) = presence_opt {
        set_discord_presence(&discord, &attrs, is_playing, discord_start_s);
    }

    Ok(())
}

#[tauri::command]
async fn event_seeked(
    position_ms: Option<f64>,
    discord: State<'_, DiscordState>,
    current_sound: State<'_, CurrentSoundState>,
) -> Result<(), String> {
    let position_ms = position_ms.unwrap_or(0.0);
    println!("Seeked to: {position_ms:.0}ms");

    // Update position and recompute start timestamp; capture state for the presence update.
    let state_opt = {
        let mut guard = current_sound.0.lock().unwrap();
        if let Some(ref mut state) = *guard {
            state.position_ms = position_ms;
            if state.is_playing {
                let now_s = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64;
                let position_s = (position_ms / 1000.0) as i64;
                state.discord_start_s = Some(now_s - position_s);
            }
            Some((state.attributes.clone(), state.is_playing, state.discord_start_s))
        } else {
            None
        }
    };

    if let Some((attrs, is_playing, discord_start_s)) = state_opt {
        set_discord_presence(&discord, &attrs, is_playing, discord_start_s);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let discord_state = {
        let mut client = DiscordIpcClient::new(DISCORD_APP_ID);
        match client.connect() {
            Ok(()) => {
                println!("Discord Rich Presence connected");
                DiscordState(std::sync::Mutex::new(Some(client)))
            }
            Err(e) => {
                eprintln!("Failed to connect to Discord: {e}");
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
        .setup(|app| {
            // ── Auto-reconnect background task ─────────────────────────────
            // Polls every 5 seconds and reconnects to Discord if the client
            // has been marked None (either by startup failure or a dropped connection).
            let app_handle = app.handle().clone();
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

                    println!("Discord Rich Presence reconnected");

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
                            state.discord_start_s,
                        );
                    }

                    if let Ok(mut guard) = discord.0.lock() {
                        *guard = Some(client);
                    };
                }
            });

            // ── Create main window ─────────────────────────────────────────
            let window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|c| c.label == "main")
                .expect("main window config not found");
            let window = tauri::WebviewWindowBuilder::from_config(app, window_config)?
                .on_new_window({
                    let app_handle = app.handle().clone();
                    move |url, features| {
                        println!("New window requested: {}", url);

                        let new_window = tauri::WebviewWindowBuilder::new(
                            &app_handle,
                            format!("popup-{}", url.path()),
                            tauri::WebviewUrl::External(url.clone()),
                        )
                        .window_features(features)
                        .title(url.as_str())
                        .on_document_title_changed(|window, title| {
                            let _ = window.set_title(&title);
                        })
                        .build()
                        .unwrap();

                        tauri::webview::NewWindowResponse::Create { window: new_window }
                    }
                })
                .on_page_load(|webview, payload| {
                    if payload.event() == PageLoadEvent::Finished {
                        webview
                            .eval(include_str!("../../packages/inject/dist/index.js"))
                            .unwrap();
                    }
                })
                .build()?;

            window.on_window_event({
                let app_handle = app.handle().clone();
                move |event| match event {
                    tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                        app_handle.save_window_state(StateFlags::all()).unwrap();
                    }
                    _ => {}
                }
            });

            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }

            // ── System tray ────────────────────────────────────────────────
            let menu = Menu::with_items(
                app,
                &[
                    &MenuItem::with_id(app, "title", "SoundCloud Desktop", false, None::<&str>)?,
                    &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
                    &MenuItem::with_id(
                        app,
                        "dbg_get_song_title",
                        "[Debug] Get Song Title",
                        true,
                        None::<&str>,
                    )?,
                ],
            )?;
            let tray = app.tray_by_id("main").unwrap();
            tray.set_menu(Some(menu))?;

            window.restore_state(StateFlags::all()).unwrap();

            Ok(())
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "dbg_get_song_title" => {
                println!("Requesting song title from JS...");
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    println!("Generating request ID and waiting for response...");

                    let request_id: u32 = rand::random();
                    let (tx, rx) = oneshot::channel::<String>();

                    {
                        let pending = app.state::<PendingRequests>();
                        pending.0.lock().await.insert(request_id, tx);
                    }

                    if let Err(e) = app.emit(
                        "get-song-title",
                        serde_json::json!({ "requestId": request_id }),
                    ) {
                        eprintln!("emit error: {e}");
                        return;
                    }

                    match rx.await {
                        Ok(result) => println!("Got song title: {result}"),
                        Err(e) => eprintln!("oneshot recv error: {e}"),
                    }
                });
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    match window.is_visible() {
                        Ok(true) => {
                            let _ = window.hide();
                        }
                        Ok(false) => {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        Err(_) => {}
                    }
                }
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                window.hide().unwrap();
            }
        })
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
