use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_window_state::{StateFlags, WindowExt};
use tracing::{debug, info};

use crate::discord::spawn_reconnect_task;

pub fn setup(
    app: &mut tauri::App,
    start_minimized: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    spawn_reconnect_task(app.handle().clone());

    let window = crate::window::create_main_window(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "title", "SoundCloud Desktop", false, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "play_pause", "Play/Pause", true, None::<&str>)?,
            &MenuItem::with_id(app, "next", "Next", true, None::<&str>)?,
            &MenuItem::with_id(app, "previous", "Previous", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "show_window", "Show Window", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "check_updates", "Check for Updates", true, None::<&str>)?,
            &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
        ],
    )?;
    let tray = app.tray_by_id("main").unwrap();
    tray.set_menu(Some(menu))?;

    window.restore_state(StateFlags::all()).unwrap();

    if start_minimized {
        window.hide().unwrap();
        info!("window hidden (start_minimized = true)");
    }

    Ok(())
}

pub fn on_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    match event.id.as_ref() {
        "quit" => {
            app.exit(0);
        }
        "check_updates" => {
            let app_handle = app.clone();
            tokio::spawn(async move {
                crate::updater::handle_check_updates(app_handle, true).await;
            });
        }
        "play_pause" => {
            debug!("Play/Pause menu item clicked");
            if let Err(e) = app.emit("play-pause", ()) {
                info!(error = %e, "failed to emit play-pause");
            }
        }
        "next" => {
            debug!("Next menu item clicked");
            if let Err(e) = app.emit("next", ()) {
                info!(error = %e, "failed to emit next");
            }
        }
        "previous" => {
            debug!("Previous menu item clicked");
            if let Err(e) = app.emit("previous", ()) {
                info!(error = %e, "failed to emit previous");
            }
        }
        "show_window" => {
            debug!("Show Window menu item clicked");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
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

pub fn update_tray_tooltip(app: &tauri::AppHandle, title: &str, artist: &str) {
    if let Some(tray) = app.tray_by_id("main") {
        let tooltip = format!("Soundcloud Desktop: {} - {}", title, artist);
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

pub fn reset_tray_tooltip(app: &tauri::AppHandle) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some("Soundcloud Desktop"));
    }
}
