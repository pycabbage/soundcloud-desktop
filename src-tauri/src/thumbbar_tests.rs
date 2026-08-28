use super::*;

/// Render the alpha channel of a glyph as ASCII so the shapes can be eyeballed
/// with `cargo test --lib -- thumbbar --nocapture`.
fn ascii(glyph: Glyph, size: u32) -> String {
    let pixels = rasterize(glyph, size, [255, 255, 255]);
    let ramp = [' ', '.', ':', '*', '#'];
    let mut out = String::new();
    for y in 0..size {
        for x in 0..size {
            let alpha = pixels[((y * size + x) * 4 + 3) as usize];
            out.push(ramp[(alpha as usize * (ramp.len() - 1)) / 255]);
        }
        out.push('\n');
    }
    out
}

fn alpha_at(pixels: &[u8], size: u32, x: u32, y: u32) -> u8 {
    pixels[((y * size + x) * 4 + 3) as usize]
}

#[test]
fn print_glyphs() {
    for glyph in [
        Glyph::Play,
        Glyph::Pause,
        Glyph::Prev,
        Glyph::Next,
        Glyph::Heart,
        Glyph::HeartOutline,
    ] {
        println!("{glyph:?}\n{}", ascii(glyph, 16));
    }
}

#[test]
fn rasterize_produces_bgra_buffer() {
    let size = 16;
    let pixels = rasterize(Glyph::Play, size, [255, 255, 255]);
    assert_eq!(pixels.len(), (size * size * 4) as usize);
}

#[test]
fn glyph_centre_is_opaque_and_corners_are_clear() {
    let size = 16;
    for glyph in [Glyph::Play, Glyph::Prev, Glyph::Next, Glyph::Heart] {
        let pixels = rasterize(glyph, size, [255, 255, 255]);
        assert_eq!(
            alpha_at(&pixels, size, size / 2, size / 2),
            255,
            "{glyph:?} should be opaque at its centre"
        );
        for (x, y) in [(0, 0), (size - 1, 0), (0, size - 1), (size - 1, size - 1)] {
            assert_eq!(
                alpha_at(&pixels, size, x, y),
                0,
                "{glyph:?} should not touch the corners"
            );
        }
    }
}

#[test]
fn pause_leaves_a_gap_between_the_bars() {
    let size = 16;
    let pixels = rasterize(Glyph::Pause, size, [255, 255, 255]);
    let middle = size / 2;
    assert_eq!(alpha_at(&pixels, size, middle - 1, middle), 0);
    assert_eq!(alpha_at(&pixels, size, 4, middle), 255);
    assert_eq!(alpha_at(&pixels, size, 11, middle), 255);
}

#[test]
fn heart_outline_is_hollow() {
    let size = 16;
    let filled = rasterize(Glyph::Heart, size, [255, 255, 255]);
    let outline = rasterize(Glyph::HeartOutline, size, [255, 255, 255]);
    let centre = size / 2;
    assert_eq!(alpha_at(&filled, size, centre, centre), 255);
    assert_eq!(alpha_at(&outline, size, centre, centre), 0);
    // The outline still needs a visible stroke at the widest part of the heart.
    assert!(alpha_at(&outline, size, 2, 6) > 0);
}

#[test]
fn next_mirrors_prev() {
    let size = 16;
    let prev = rasterize(Glyph::Prev, size, [255, 255, 255]);
    let next = rasterize(Glyph::Next, size, [255, 255, 255]);
    for y in 0..size {
        for x in 0..size {
            assert_eq!(
                alpha_at(&prev, size, x, y),
                alpha_at(&next, size, size - 1 - x, y),
                "mismatch at ({x}, {y})"
            );
        }
    }
}

#[test]
fn colour_channels_are_premultiplied() {
    let size = 16;
    let pixels = rasterize(Glyph::Heart, size, [255, 255, 255]);
    for pixel in pixels.as_chunks::<4>().0 {
        let alpha = pixel[3];
        assert!(pixel[0] <= alpha && pixel[1] <= alpha && pixel[2] <= alpha);
    }
}

#[test]
fn black_glyphs_only_carry_alpha() {
    let size = 16;
    let pixels = rasterize(Glyph::Play, size, [0, 0, 0]);
    let opaque = pixels
        .as_chunks::<4>()
        .0
        .iter()
        .filter(|p| p[3] == 255)
        .count();
    assert!(opaque > 0);
    for pixel in pixels.as_chunks::<4>().0 {
        assert_eq!([pixel[0], pixel[1], pixel[2]], [0, 0, 0]);
    }
}

#[test]
fn icon_size_follows_dpi() {
    assert_eq!(icon_size_for_dpi(96), 16);
    assert_eq!(icon_size_for_dpi(144), 24);
    assert_eq!(icon_size_for_dpi(192), 32);
    // Unreported and extreme DPI values still produce a usable icon.
    assert_eq!(icon_size_for_dpi(0), 16);
    assert_eq!(icon_size_for_dpi(48), 16);
    assert_eq!(icon_size_for_dpi(960), 64);
}

#[test]
fn tooltip_is_written_as_a_terminated_wide_string() {
    let button = thumb_button(BTN_LIKE, HICON(std::ptr::null_mut()), "Dislike", true);
    let text: String = char::decode_utf16(button.szTip.iter().copied().take_while(|c| *c != 0))
        .map(|c| c.unwrap_or('?'))
        .collect();
    assert_eq!(text, "Dislike");
    assert_eq!(button.iId, BTN_LIKE);
    assert_eq!(button.dwFlags, THBF_ENABLED);
}

#[test]
fn disabled_buttons_use_the_disabled_flag() {
    let button = thumb_button(BTN_LIKE, HICON(std::ptr::null_mut()), "Like", false);
    assert_eq!(button.dwFlags, THBF_DISABLED);
}

#[test]
fn buttons_follow_the_playback_state() {
    let icons = IconSet {
        size: 16,
        light_theme: false,
        play: HICON(std::ptr::without_provenance_mut(1)),
        pause: HICON(std::ptr::without_provenance_mut(2)),
        prev: HICON(std::ptr::without_provenance_mut(3)),
        next: HICON(std::ptr::without_provenance_mut(4)),
        heart: HICON(std::ptr::without_provenance_mut(5)),
        heart_outline: HICON(std::ptr::without_provenance_mut(6)),
    };

    let paused_unliked = build_buttons(
        ThumbState {
            is_playing: false,
            is_liked: Some(false),
        },
        &icons,
    );
    assert_eq!(paused_unliked[0].hIcon, icons.heart_outline);
    assert_eq!(paused_unliked[0].dwFlags, THBF_ENABLED);
    assert_eq!(paused_unliked[2].hIcon, icons.play);

    let playing_liked = build_buttons(
        ThumbState {
            is_playing: true,
            is_liked: Some(true),
        },
        &icons,
    );
    assert_eq!(playing_liked[0].hIcon, icons.heart);
    assert_eq!(playing_liked[2].hIcon, icons.pause);

    let no_track = build_buttons(ThumbState::default(), &icons);
    assert_eq!(no_track[0].dwFlags, THBF_DISABLED);

    // Order is fixed: Like, Prev, Play/Pause, Next.
    let ids: Vec<u32> = no_track.iter().map(|b| b.iId).collect();
    assert_eq!(ids, vec![BTN_LIKE, BTN_PREV, BTN_PLAY_PAUSE, BTN_NEXT]);
}
