use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    webview::PageLoadEvent,
    Emitter, Manager,
};
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};
use tokio::sync::oneshot;
use tracing::{debug, error, info};

use crate::discord::spawn_reconnect_task;
use crate::models::PendingRequests;

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // ── Auto-reconnect background task ─────────────────────────────────────
    spawn_reconnect_task(app.handle().clone());

    // ── Create main window ──────────────────────────────────────────────────
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
                debug!(url = %url, "new window requested");

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

    // ── System tray ─────────────────────────────────────────────────────────
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
}

pub fn on_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    match event.id.as_ref() {
        "quit" => {
            app.exit(0);
        }
        "dbg_get_song_title" => {
            info!("requesting song title from js");
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                debug!("generating request id and waiting for response");

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
                    error!(error = %e, "emit error");
                    return;
                }

                match rx.await {
                    Ok(result) => info!(title = %result, "got song title"),
                    Err(e) => error!(error = %e, "oneshot recv error"),
                }
            });
        }
        _ => {}
    }
}

pub fn on_tray_icon_event(app: &tauri::AppHandle, event: tauri::tray::TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
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
}

pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        window.hide().unwrap();
    }
}
