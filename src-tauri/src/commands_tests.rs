use std::collections::HashMap;

use tokio::sync::{oneshot, Mutex};

use crate::models::{PendingRequests, SoundAttributes};

use super::resolve_pending_request;

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

#[tokio::test]
async fn resolve_matching_request() {
    let (tx, rx) = oneshot::channel::<String>();
    let mut map = HashMap::new();
    map.insert(42u32, tx);
    let pending = PendingRequests(Mutex::new(map));

    let mut attrs = make_empty_attrs();
    attrs.title = Some("Test Song".to_string());

    resolve_pending_request(&pending, Some(42), &attrs).await;

    let result = rx.await.unwrap();
    assert_eq!(result, "Test Song");
    assert!(pending.0.lock().await.is_empty());
}

#[tokio::test]
async fn resolve_no_matching_request() {
    let (tx, _rx) = oneshot::channel::<String>();
    let mut map = HashMap::new();
    map.insert(42u32, tx);
    let pending = PendingRequests(Mutex::new(map));

    let attrs = make_empty_attrs();

    // request_id 99 does not match 42
    resolve_pending_request(&pending, Some(99), &attrs).await;

    // The map still has the entry for 42
    assert!(pending.0.lock().await.contains_key(&42));
}

#[tokio::test]
async fn resolve_none_request_id() {
    let (tx, rx) = oneshot::channel::<String>();
    let mut map = HashMap::new();
    // key 0 matches request_id None (unwrap_or(0))
    map.insert(0u32, tx);
    let pending = PendingRequests(Mutex::new(map));

    let mut attrs = make_empty_attrs();
    attrs.title = Some("Fallback".to_string());

    resolve_pending_request(&pending, None, &attrs).await;

    let result = rx.await.unwrap();
    assert_eq!(result, "Fallback");
}
