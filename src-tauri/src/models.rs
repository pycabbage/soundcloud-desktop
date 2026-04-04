#![allow(dead_code)]

use serde::Deserialize;

/// Snapshot of the currently playing track and its playback state.
#[derive(Clone)]
pub struct PlaybackState {
    pub attributes: SoundAttributes,
    pub is_playing: bool,
    /// Current playback position in milliseconds (from `Sound.currentTime()`).
    pub position_ms: f64,
}

#[derive(Debug, serde::Serialize)]
pub struct PlaybackPrefs {
    pub shuffle: bool,
    pub repeat_mode: String,
}

// ─── SoundCloud model types ───────────────────────────────────────────────────

#[derive(Clone, Deserialize)]
pub struct SoundUserBadges {
    pub pro: Option<bool>,
    pub creator_mid_tier: Option<bool>,
    pub pro_unlimited: Option<bool>,
    pub verified: Option<bool>,
}

#[derive(Clone, Deserialize)]
pub struct SoundUser {
    pub id: Option<u64>,
    pub kind: Option<String>,
    pub avatar_url: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub full_name: Option<String>,
    pub permalink: Option<String>,
    pub permalink_url: Option<String>,
    pub uri: Option<String>,
    pub urn: Option<String>,
    pub username: Option<String>,
    pub verified: Option<bool>,
    pub city: Option<String>,
    pub country_code: Option<String>,
    pub followers_count: Option<u32>,
    pub last_modified: Option<String>,
    pub badges: Option<SoundUserBadges>,
    pub station_urn: Option<String>,
    pub station_permalink: Option<String>,
}

#[derive(Clone, Deserialize)]
pub struct SoundPublisherMetadata {
    pub id: Option<u64>,
    pub urn: Option<String>,
    pub contains_music: Option<bool>,
}

#[derive(Clone, Deserialize)]
pub struct SoundTranscodingFormat {
    pub protocol: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Clone, Deserialize)]
pub struct SoundTranscoding {
    pub url: Option<String>,
    pub preset: Option<String>,
    pub duration: Option<u64>,
    pub snipped: Option<bool>,
    pub format: Option<SoundTranscodingFormat>,
    pub quality: Option<String>,
    pub is_legacy_transcoding: Option<bool>,
}

#[derive(Clone, Deserialize)]
pub struct SoundMedia {
    pub transcodings: Option<Vec<SoundTranscoding>>,
}

#[derive(Clone, Deserialize)]
pub struct SoundAttributes {
    pub id: Option<u64>,
    pub kind: Option<String>,
    pub monetization_model: Option<String>,
    pub policy: Option<String>,
    pub artwork_url: Option<String>,
    pub caption: Option<String>,
    pub commentable: Option<bool>,
    pub comment_count: Option<u32>,
    pub created_at: Option<String>,
    pub description: Option<String>,
    pub display_date: Option<String>,
    pub downloadable: Option<bool>,
    pub download_count: Option<u32>,
    pub duration: Option<u64>,
    pub embeddable_by: Option<String>,
    pub full_duration: Option<u64>,
    pub genre: Option<String>,
    pub has_downloads_left: Option<bool>,
    pub label_name: Option<String>,
    pub last_modified: Option<String>,
    pub license: Option<String>,
    pub likes_count: Option<u32>,
    pub media: Option<SoundMedia>,
    pub permalink: Option<String>,
    pub permalink_url: Option<String>,
    pub playback_count: Option<u32>,
    pub public: Option<bool>,
    pub publisher_metadata: Option<SoundPublisherMetadata>,
    pub purchase_title: Option<String>,
    pub purchase_url: Option<String>,
    pub release_date: Option<String>,
    pub reposts_count: Option<u32>,
    pub secret_token: Option<String>,
    pub sharing: Option<String>,
    pub state: Option<String>,
    pub station_permalink: Option<String>,
    pub station_urn: Option<String>,
    pub streamable: Option<bool>,
    pub tag_list: Option<String>,
    pub title: Option<String>,
    pub track_authorization: Option<String>,
    pub uri: Option<String>,
    pub urn: Option<String>,
    pub user: Option<SoundUser>,
    pub user_id: Option<u64>,
    pub visuals: Option<serde_json::Value>,
    pub waveform_url: Option<String>,
}
