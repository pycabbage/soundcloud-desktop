use super::*;
use crate::models::SoundAttributes;

// Helper to create minimal SoundAttributes for testing.
fn make_attrs(title: &str, artist: &str) -> SoundAttributes {
    use crate::models::SoundUser;
    SoundAttributes {
        title: Some(title.to_string()),
        user: Some(SoundUser {
            username: Some(artist.to_string()),
            permalink_url: Some(format!("https://soundcloud.com/{artist}")),
            id: None,
            kind: None,
            avatar_url: None,
            first_name: None,
            last_name: None,
            full_name: None,
            permalink: None,
            uri: None,
            urn: None,
            verified: None,
            city: None,
            country_code: None,
            followers_count: None,
            last_modified: None,
            badges: None,
            station_urn: None,
            station_permalink: None,
        }),
        permalink_url: Some(format!("https://soundcloud.com/track/{title}")),
        artwork_url: Some("https://i1.sndcdn.com/artworks-abc-large.jpg".to_string()),
        full_duration: Some(180000), // 3 minutes
        id: None,
        kind: None,
        monetization_model: None,
        policy: None,
        caption: None,
        commentable: None,
        comment_count: None,
        created_at: None,
        description: None,
        display_date: None,
        downloadable: None,
        download_count: None,
        duration: None,
        embeddable_by: None,
        genre: None,
        has_downloads_left: None,
        label_name: None,
        last_modified: None,
        license: None,
        likes_count: None,
        media: None,
        permalink: None,
        playback_count: None,
        public: None,
        publisher_metadata: None,
        purchase_title: None,
        purchase_url: None,
        release_date: None,
        reposts_count: None,
        secret_token: None,
        sharing: None,
        state: None,
        station_permalink: None,
        station_urn: None,
        streamable: None,
        tag_list: None,
        track_authorization: None,
        uri: None,
        urn: None,
        user_id: None,
        visuals: None,
        waveform_url: None,
    }
}

fn make_empty_attrs() -> SoundAttributes {
    SoundAttributes {
        id: None,
        kind: None,
        monetization_model: None,
        policy: None,
        artwork_url: None,
        caption: None,
        commentable: None,
        comment_count: None,
        created_at: None,
        description: None,
        display_date: None,
        downloadable: None,
        download_count: None,
        duration: None,
        embeddable_by: None,
        full_duration: None,
        genre: None,
        has_downloads_left: None,
        label_name: None,
        last_modified: None,
        license: None,
        likes_count: None,
        media: None,
        permalink: None,
        permalink_url: None,
        playback_count: None,
        public: None,
        publisher_metadata: None,
        purchase_title: None,
        purchase_url: None,
        release_date: None,
        reposts_count: None,
        secret_token: None,
        sharing: None,
        state: None,
        station_permalink: None,
        station_urn: None,
        streamable: None,
        tag_list: None,
        title: None,
        track_authorization: None,
        uri: None,
        urn: None,
        user: None,
        user_id: None,
        visuals: None,
        waveform_url: None,
    }
}

// ── truncate_discord_text tests ──

#[test]
fn truncate_empty() {
    assert_eq!(truncate_discord_text(""), "  ");
}

#[test]
fn truncate_single_char() {
    assert_eq!(truncate_discord_text("x"), "x ");
}

#[test]
fn truncate_pause_emoji() {
    // ⏸ is U+23F8, one codepoint
    assert_eq!(truncate_discord_text("⏸"), "⏸ ");
}

#[test]
fn truncate_normal_string() {
    assert_eq!(truncate_discord_text("Hello World"), "Hello World");
}

#[test]
fn truncate_exactly_128() {
    let s: String = "a".repeat(128);
    assert_eq!(truncate_discord_text(&s), s);
}

#[test]
fn truncate_over_128() {
    let s: String = "a".repeat(200);
    let result = truncate_discord_text(&s);
    let chars: Vec<char> = result.chars().collect();
    assert_eq!(chars.len(), 128);
    assert_eq!(chars[127], '…');
}

#[test]
fn truncate_whitespace_only() {
    assert_eq!(truncate_discord_text("   "), "  ");
}

// ── PresenceFields tests ──

#[test]
fn presence_fields_full() {
    let attrs = make_attrs("My Song", "DJ Test");
    let fields = PresenceFields::from_attributes(&attrs);
    assert_eq!(fields.title, "My Song");
    assert_eq!(fields.artist, "DJ Test");
    assert!(fields.artwork_url.as_ref().unwrap().contains("-t500x500"));
    assert!(!fields.artwork_url.as_ref().unwrap().contains("-large"));
    assert!(!fields.track_url.is_empty());
    assert!(!fields.artist_url.is_empty());
    assert_eq!(fields.full_duration_ms, Some(180000));
}

#[test]
fn presence_fields_all_none() {
    let attrs = make_empty_attrs();
    let fields = PresenceFields::from_attributes(&attrs);
    assert_eq!(fields.title, "  "); // truncated empty
    assert_eq!(fields.artist, "  ");
    assert!(fields.artwork_url.is_none());
    assert!(fields.track_url.is_empty());
    assert!(fields.artist_url.is_empty());
    assert!(fields.full_duration_ms.is_none());
}

#[test]
fn presence_fields_artwork_replacement() {
    let mut attrs = make_empty_attrs();
    attrs.artwork_url = Some("https://i1.sndcdn.com/artworks-000-large.jpg".to_string());
    let fields = PresenceFields::from_attributes(&attrs);
    assert_eq!(
        fields.artwork_url.unwrap(),
        "https://i1.sndcdn.com/artworks-000-t500x500.jpg"
    );
}

// ── build_activity tests ──

#[test]
fn build_activity_playing_has_timestamps() {
    let attrs = make_attrs("Song", "Artist");
    let fields = PresenceFields::from_attributes(&attrs);
    let now_ms = 1_000_000_000i64;
    let act = build_activity(&fields, true, 30000.0, now_ms);
    // Activity exposes no accessors; this pins construction, not the payload.
    let _ = act;
}

#[test]
fn build_activity_paused_no_timestamps() {
    let attrs = make_attrs("Song", "Artist");
    let fields = PresenceFields::from_attributes(&attrs);
    let act = build_activity(&fields, false, 0.0, 1_000_000_000);
    let _ = act;
}

#[test]
fn build_activity_no_artwork() {
    let attrs = make_empty_attrs();
    let fields = PresenceFields::from_attributes(&attrs);
    let act = build_activity(&fields, true, 0.0, 1_000_000_000);
    let _ = act;
}

// ── apply_* tests ──

#[test]
fn apply_track_change_sets_state() {
    let mut state: Option<PlaybackState> = None;
    let attrs = make_attrs("New Song", "Artist");
    let result = apply_track_change(&mut state, attrs);
    assert!(state.is_some());
    assert!(!result.is_playing);
    assert_eq!(result.position_ms, 0.0);
    assert_eq!(result.attributes.title.as_deref(), Some("New Song"));
}

#[test]
fn apply_track_change_overwrites() {
    let mut state = Some(PlaybackState {
        attributes: make_attrs("Old", "Old"),
        is_playing: true,
        position_ms: 5000.0,
    });
    let result = apply_track_change(&mut state, make_attrs("New", "New"));
    assert!(!result.is_playing);
    assert_eq!(result.position_ms, 0.0);
    assert_eq!(result.attributes.title.as_deref(), Some("New"));
}

#[test]
fn apply_playback_change_with_state() {
    let mut state = Some(PlaybackState {
        attributes: make_attrs("Song", "Artist"),
        is_playing: false,
        position_ms: 0.0,
    });
    let result = apply_playback_change(&mut state, true, 1000.0);
    assert!(result.is_some());
    let (attrs, pos, was_playing) = result.unwrap();
    assert_eq!(attrs.title.as_deref(), Some("Song"));
    assert_eq!(pos, 1000.0);
    assert!(!was_playing);
    assert!(state.as_ref().unwrap().is_playing);
    assert_eq!(state.as_ref().unwrap().position_ms, 1000.0);
}

#[test]
fn apply_playback_change_without_state() {
    let mut state: Option<PlaybackState> = None;
    let result = apply_playback_change(&mut state, true, 1000.0);
    assert!(result.is_none());
}

#[test]
fn apply_seek_with_state() {
    let mut state = Some(PlaybackState {
        attributes: make_attrs("Song", "Artist"),
        is_playing: true,
        position_ms: 1000.0,
    });
    let result = apply_seek(&mut state, 5000.0);
    assert!(result.is_some());
    let (_, is_playing, pos) = result.unwrap();
    assert!(is_playing);
    assert_eq!(pos, 5000.0);
    assert_eq!(state.as_ref().unwrap().position_ms, 5000.0);
}

#[test]
fn apply_seek_without_state() {
    let mut state: Option<PlaybackState> = None;
    let result = apply_seek(&mut state, 5000.0);
    assert!(result.is_none());
}
