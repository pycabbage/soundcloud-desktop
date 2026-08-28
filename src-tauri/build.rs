fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "event_change_current_sound",
            "event_playback_state_changed",
            "event_seeked",
            "post_init",
            "save_shuffle_state",
            "save_repeat_mode",
            "get_settings",
            "save_discord_enabled",
            "save_start_minimized",
            "save_autostart",
        ]),
    ))
    .unwrap();
}
