use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_media::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Create Window
            let window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|c| c.label == "main")
                .expect("main window config not found");
            tauri::WebviewWindowBuilder::from_config(
                app,
                window_config,
            )?
            .on_new_window(move |url, features| {
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
            })
            .build()?;

            // Setup system tray menu
            let title_i = MenuItem::with_id(app, "title", "SoundCloud Desktop", false, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&title_i, &quit_i])?;
            let tray = app.tray_by_id("main").unwrap();
            tray.set_menu(Some(menu))?;

            Ok(())
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => {
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
            _ => {}
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                window.hide().unwrap();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
