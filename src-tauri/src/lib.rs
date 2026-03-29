use tokio::sync::{oneshot, Mutex};
use std::collections::HashMap;
use tauri::{
    Emitter, Manager, State, menu::{Menu, MenuItem}, tray::{MouseButton, MouseButtonState, TrayIconEvent}, webview::PageLoadEvent
};

struct PendingRequests(Mutex<HashMap<u32, oneshot::Sender<String>>>);

#[tauri::command]
async fn song_title(
    request_id: u32,
    title: String,
    pending: State<'_, PendingRequests>,
) -> Result<(), String> {
    let mut map = pending.0.lock().await;
    if let Some(tx) = map.remove(&request_id) {
        println!("Received result for request {}: {}", request_id, title);
        let _ = tx.send(title);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PendingRequests(Mutex::new(HashMap::new())))
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
            let window = tauri::WebviewWindowBuilder::from_config(
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
            .on_page_load(|webview, payload| {
                if payload.event() == PageLoadEvent::Finished {
                    // 全JS実行後にevalされる
                    webview.eval(include_str!("../../packages/inject/dist/index.js")).unwrap();
                }
            })
            .build()?;

            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }


            // Setup system tray menu
            let menu = Menu::with_items(app, &[
                &MenuItem::with_id(app, "title", "SoundCloud Desktop", false, None::<&str>)?,
                &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
                &MenuItem::with_id(app, "dbg_get_song_title", "[Debug] Get Song Title", true, None::<&str>)?,
            ])?;
            let tray = app.tray_by_id("main").unwrap();
            tray.set_menu(Some(menu))?;

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

                    if let Err(e) = app.emit("get-song-title", serde_json::json!({ "requestId": request_id })) {
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
        .invoke_handler(tauri::generate_handler![song_title])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
