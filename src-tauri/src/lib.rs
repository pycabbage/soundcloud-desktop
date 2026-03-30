use std::collections::HashMap;

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

struct PendingRequests(Mutex<HashMap<u32, oneshot::Sender<String>>>);

struct DiscordState(std::sync::Mutex<Option<DiscordIpcClient>>);

#[derive(Deserialize)]
struct SoundUserBadges {
    pro: Option<bool>,
    creator_mid_tier: Option<bool>,
    pro_unlimited: Option<bool>,
    verified: Option<bool>,
}

#[derive(Deserialize)]
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

#[derive(Deserialize)]
struct SoundPublisherMetadata {
    id: Option<u64>,
    urn: Option<String>,
    contains_music: Option<bool>,
}

#[derive(Deserialize)]
struct SoundTranscodingFormat {
    protocol: Option<String>,
    mime_type: Option<String>,
}

#[derive(Deserialize)]
struct SoundTranscoding {
    url: Option<String>,
    preset: Option<String>,
    duration: Option<u64>,
    snipped: Option<bool>,
    format: Option<SoundTranscodingFormat>,
    quality: Option<String>,
    is_legacy_transcoding: Option<bool>,
}

#[derive(Deserialize)]
struct SoundMedia {
    transcodings: Option<Vec<SoundTranscoding>>,
}

#[derive(Deserialize)]
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

#[tauri::command]
async fn event_change_current_sound(
    request_id: Option<u32>,
    attributes: SoundAttributes,
    pending: State<'_, PendingRequests>,
    discord: State<'_, DiscordState>,
) -> Result<(), String> {
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

    // Update Discord Rich Presence
    if let Some(title) = &attributes.title {
        if !title.is_empty() {
            let act = activity::Activity::new().details(title);
            if let Ok(mut guard) = discord.0.lock() {
                if let Some(client) = guard.as_mut() {
                    if let Err(e) = client.set_activity(act) {
                        eprintln!("Discord presence update error: {e}");
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn event_playback_state_changed(is_playing: bool) {
    if is_playing {
        println!("Playback: playing");
    } else {
        println!("Playback: paused");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let discord_state = {
        let mut client = DiscordIpcClient::new("1488035816130351224");
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
        .plugin(tauri_plugin_media::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Create Window
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
                        // window.open() をインターセプト
                        println!("New window requested: {}", url);

                        // 新しいウィンドウを生成して返す例
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
                        // 全JS実行後にevalされる
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

            // Open devtools in debug mode
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }

            // Setup system tray menu
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

            // Restore window state (position, size, etc.) on startup
            window.restore_state(StateFlags::all()).unwrap();

            Ok(())
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "dbg_get_song_title" => {
                // debug log
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
