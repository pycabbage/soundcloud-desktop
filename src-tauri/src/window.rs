use tauri::{
    webview::PageLoadEvent,
    window::{Color, Effect, EffectsBuilder},
};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_window_state::{AppHandleExt, StateFlags};
use tracing::{debug, error};

fn is_allowed_url(url: &str) -> bool {
    (url.starts_with("https://soundcloud.com")
        && !url.starts_with("https://soundcloud.com/company")
        && !url.starts_with("https://soundcloud.com/getstarted"))
        || url.starts_with("https://appleid.apple.com/auth/authorize")
        || url.starts_with("https://accounts.google.com/o/oauth2/v2/auth")
        || url.starts_with("https://www.facebook.com/dialog/oauth")
        || url.starts_with("about:")
}

pub fn create_main_window(
    app: &mut tauri::App,
) -> Result<tauri::WebviewWindow, Box<dyn std::error::Error>> {
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

                if !is_allowed_url(url.as_str()) {
                    debug!("opening external url in default browser: {}", url);
                    app_handle
                        .opener()
                        .open_url(url.as_str(), None::<&str>)
                        .unwrap_or_else(|e| {
                            error!(error = %e, "failed to open url in default browser");
                        });
                    return tauri::webview::NewWindowResponse::Deny;
                }

                let new_window = tauri::WebviewWindowBuilder::new(
                    &app_handle,
                    format!("popup-{}", url.path()),
                    tauri::WebviewUrl::External(url.clone()),
                )
                .window_features(features)
                .title(url.as_str())
                .disable_drag_drop_handler()
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

    window.set_effects(
        EffectsBuilder::new()
            .effect(Effect::Acrylic)
            .color(Color(18, 18, 18, 200))
            .build(),
    )?;

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

    Ok(window)
}
