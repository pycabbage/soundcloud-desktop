use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;
use tracing::{info, warn};

async fn check_for_update<R: Runtime>(app: &AppHandle<R>) -> Result<Option<tauri_plugin_updater::Update>, String> {
    let mut builder = app.updater_builder();
    if let Ok(endpoint) = std::env::var("TAURI_UPDATE_ENDPOINT") {
        info!(endpoint, "overriding updater endpoint from env");
        let url = url::Url::parse(&endpoint).map_err(|e| format!("invalid update endpoint URL: {e}"))?;
        builder = builder.endpoints(vec![url]).map_err(|e| e.to_string())?;
    }
    builder.build().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())
}

async fn download_and_install(update: &tauri_plugin_updater::Update) -> Result<(), String> {
    update
        .download_and_install(
            |chunk_length, content_length| {
                info!("downloaded {} of {:?}", chunk_length, content_length);
            },
            || {
                info!("download finished, preparing install");
            },
        )
        .await
        .map_err(|e| e.to_string())
}

pub async fn handle_check_updates<R: Runtime>(app: AppHandle<R>, manual: bool) {
    match check_for_update(&app).await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            info!("update available: v{version}");

            let _ = app
                .notification()
                .builder()
                .title("SoundCloud Desktop")
                .body(format!("Update v{version} is available. Installing..."))
                .show();

            match download_and_install(&update).await {
                Ok(()) => {
                    info!("update installed successfully");
                }
                Err(e) => {
                    warn!("update install failed: {e}");
                    let _ = app
                        .notification()
                        .builder()
                        .title("SoundCloud Desktop")
                        .body("Update failed. Please try again later.")
                        .show();
                }
            }
        }
        Ok(None) => {
            info!("no update available");
            if manual {
                let _ = app
                    .notification()
                    .builder()
                    .title("SoundCloud Desktop")
                    .body("You're already on the latest version.")
                    .show();
            }
        }
        Err(e) => {
            warn!("update check failed: {e}");
            if manual {
                let _ = app
                    .notification()
                    .builder()
                    .title("SoundCloud Desktop")
                    .body("Could not check for updates.")
                    .show();
            }
        }
    }
}

#[cfg(test)]
#[path = "updater_tests.rs"]
mod tests;
