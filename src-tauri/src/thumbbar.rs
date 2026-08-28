#![cfg(windows)]

//! Windows taskbar thumbnail toolbar.
//!
//! Registers the four media buttons exposed by `ITaskbarList3::ThumbBarAddButtons`
//! on the main window taskbar thumbnail and keeps the two stateful ones
//! (Like/Dislike and Play/Pause) in sync with the current playback state.
//!
//! The COM object and the button icons may only be touched from the thread that
//! owns the window, so every mutation funnels through `AppHandle::run_on_main_thread`.
//! Button state itself lives in a plain `Mutex` and can be written from any thread.

use std::cell::{Cell, RefCell};
use std::ffi::c_void;
use std::sync::atomic::{AtomicIsize, Ordering};
use std::sync::{Mutex, OnceLock};

use tauri::{AppHandle, Emitter};
use tracing::{debug, warn};

use windows::core::w;
use windows::Win32::Foundation::{ERROR_SUCCESS, HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    CreateBitmap, CreateDIBSection, DeleteObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
    DIB_RGB_COLORS,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
};
use windows::Win32::System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_DWORD};
use windows::Win32::UI::HiDpi::GetDpiForWindow;
use windows::Win32::UI::Shell::{
    DefSubclassProc, ITaskbarList3, SetWindowSubclass, TaskbarList, THBF_DISABLED, THBF_ENABLED,
    THBN_CLICKED, THB_FLAGS, THB_ICON, THB_TOOLTIP, THUMBBUTTON,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateIconIndirect, DestroyIcon, RegisterWindowMessageW, HICON, ICONINFO, WM_COMMAND,
    WM_DPICHANGED, WM_SETTINGCHANGE,
};

const SUBCLASS_ID: usize = 0x5343_5442;

// Button ids reported back through WM_COMMAND / THBN_CLICKED.
const BTN_LIKE: u32 = 1;
const BTN_PREV: u32 = 2;
const BTN_PLAY_PAUSE: u32 = 3;
const BTN_NEXT: u32 = 4;

/// Number of buttons on the toolbar. Fixed for the lifetime of the taskbar
/// button: `ThumbBarUpdateButtons` cannot change how many buttons there are.
const BUTTON_COUNT: usize = 4;

// ─── Shared state ─────────────────────────────────────────────────────────────

/// Playback state reflected by the toolbar.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ThumbState {
    /// Play/Pause shows the pause glyph while this is true.
    pub is_playing: bool,
    /// `None` while no track is loaded, which greys the Like button out.
    pub is_liked: Option<bool>,
}

static STATE: Mutex<ThumbState> = Mutex::new(ThumbState {
    is_playing: false,
    is_liked: None,
});

static HWND_HANDLE: AtomicIsize = AtomicIsize::new(0);
static APP: OnceLock<AppHandle> = OnceLock::new();

thread_local! {
    /// Taskbar COM object, created on the window thread once the taskbar
    /// button exists. Cleared and rebuilt whenever the shell recreates it.
    static TASKBAR: RefCell<Option<ITaskbarList3>> = const { RefCell::new(None) };
    static ICONS: RefCell<Option<IconSet>> = const { RefCell::new(None) };
    static BUTTONS_ADDED: Cell<bool> = const { Cell::new(false) };
}

/// The `TaskbarButtonCreated` broadcast, sent once per taskbar button.
fn taskbar_button_created_message() -> u32 {
    static MSG: OnceLock<u32> = OnceLock::new();
    *MSG.get_or_init(|| unsafe { RegisterWindowMessageW(w!("TaskbarButtonCreated")) })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/// Attach the thumbnail toolbar to `hwnd`. Buttons appear once the shell
/// reports that the taskbar button for the window has been created.
pub fn install(app: &AppHandle, hwnd: isize) {
    if hwnd == 0 {
        warn!("no window handle; thumbnail toolbar not installed");
        return;
    }
    if APP.set(app.clone()).is_err() {
        debug!("thumbnail toolbar already installed");
        return;
    }
    HWND_HANDLE.store(hwnd, Ordering::SeqCst);

    let ok =
        unsafe { SetWindowSubclass(HWND(hwnd as *mut _), Some(subclass_proc), SUBCLASS_ID, 0) };
    if !ok.as_bool() {
        warn!("failed to install thumbnail toolbar subclass");
    }
}

/// Reflect a play/pause transition on the toolbar.
pub fn set_playing(app: &AppHandle, is_playing: bool) {
    apply(app, |state| state.is_playing = is_playing);
}

/// Reflect the like state of the current track. `None` disables the button.
pub fn set_liked(app: &AppHandle, is_liked: Option<bool>) {
    apply(app, |state| state.is_liked = is_liked);
}

fn apply(app: &AppHandle, mutate: impl FnOnce(&mut ThumbState)) {
    let changed = {
        let Ok(mut state) = STATE.lock() else {
            warn!("thumbnail toolbar state poisoned");
            return;
        };
        let before = *state;
        mutate(&mut state);
        *state != before
    };
    if !changed {
        return;
    }
    if let Err(e) = app.run_on_main_thread(refresh_buttons) {
        warn!(error = %e, "failed to schedule thumbnail toolbar update");
    }
}

// ─── Window procedure ─────────────────────────────────────────────────────────

unsafe extern "system" fn subclass_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _uidsubclass: usize,
    _dwrefdata: usize,
) -> LRESULT {
    if msg == taskbar_button_created_message() {
        debug!("taskbar button created; adding thumbnail toolbar buttons");
        BUTTONS_ADDED.with(|added| added.set(false));
        TASKBAR.with(|taskbar| *taskbar.borrow_mut() = None);
        refresh_buttons();
    } else if msg == WM_COMMAND && (wparam.0 >> 16) as u32 == THBN_CLICKED {
        on_button_clicked((wparam.0 & 0xFFFF) as u32);
        return LRESULT(0);
    } else if msg == WM_SETTINGCHANGE || msg == WM_DPICHANGED {
        // The glyphs are drawn for a specific DPI and shell theme, both of
        // which these messages announce.
        refresh_buttons();
    }

    unsafe { DefSubclassProc(hwnd, msg, wparam, lparam) }
}

fn on_button_clicked(id: u32) {
    let event = match id {
        BTN_LIKE => "like",
        BTN_PREV => "previous",
        BTN_PLAY_PAUSE => "play-pause",
        BTN_NEXT => "next",
        _ => return,
    };
    debug!(event, "thumbnail toolbar button clicked");
    let Some(app) = APP.get() else { return };
    if let Err(e) = app.emit(event, ()) {
        warn!(error = %e, event, "failed to emit thumbnail toolbar event");
    }
}

// ─── Toolbar plumbing (window thread only) ────────────────────────────────────

fn refresh_buttons() {
    let hwnd = HWND(HWND_HANDLE.load(Ordering::SeqCst) as *mut _);
    if hwnd.0.is_null() {
        return;
    }
    let Some(taskbar) = taskbar_list() else {
        return;
    };
    let Ok(state) = STATE.lock().map(|state| *state) else {
        warn!("thumbnail toolbar state poisoned");
        return;
    };

    let retired = ensure_icons(hwnd);
    let buttons = ICONS.with(|icons| icons.borrow().as_ref().map(|set| build_buttons(state, set)));
    let Some(buttons) = buttons else { return };

    let result = BUTTONS_ADDED.with(|added| {
        if added.get() {
            unsafe { taskbar.ThumbBarUpdateButtons(hwnd, &buttons) }
        } else {
            let result = unsafe { taskbar.ThumbBarAddButtons(hwnd, &buttons) };
            added.set(result.is_ok());
            result
        }
    });
    if let Err(e) = result {
        warn!(error = %e, "failed to update thumbnail toolbar buttons");
    }

    // Only safe once the taskbar no longer references the previous icons.
    if let Some(retired) = retired {
        retired.destroy();
    }
}

fn taskbar_list() -> Option<ITaskbarList3> {
    TASKBAR.with(|slot| {
        if let Some(taskbar) = slot.borrow().as_ref() {
            return Some(taskbar.clone());
        }
        // Tauri already puts the main thread in an STA; this is a no-op there.
        let _ = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
        let created: windows::core::Result<ITaskbarList3> =
            unsafe { CoCreateInstance(&TaskbarList, None, CLSCTX_INPROC_SERVER) };
        let taskbar = match created {
            Ok(taskbar) => taskbar,
            Err(e) => {
                warn!(error = %e, "failed to create ITaskbarList3");
                return None;
            }
        };
        if let Err(e) = unsafe { taskbar.HrInit() } {
            warn!(error = %e, "ITaskbarList3::HrInit failed");
            return None;
        }
        *slot.borrow_mut() = Some(taskbar.clone());
        Some(taskbar)
    })
}

fn build_buttons(state: ThumbState, icons: &IconSet) -> [THUMBBUTTON; BUTTON_COUNT] {
    let (like_icon, like_tip, like_enabled) = match state.is_liked {
        Some(true) => (icons.heart, "Dislike", true),
        Some(false) => (icons.heart_outline, "Like", true),
        None => (icons.heart_outline, "Like", false),
    };
    let (play_icon, play_tip) = if state.is_playing {
        (icons.pause, "Pause")
    } else {
        (icons.play, "Play")
    };

    [
        thumb_button(BTN_LIKE, like_icon, like_tip, like_enabled),
        thumb_button(BTN_PREV, icons.prev, "Previous", true),
        thumb_button(BTN_PLAY_PAUSE, play_icon, play_tip, true),
        thumb_button(BTN_NEXT, icons.next, "Next", true),
    ]
}

fn thumb_button(id: u32, icon: HICON, tooltip: &str, enabled: bool) -> THUMBBUTTON {
    let mut button = THUMBBUTTON {
        dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
        iId: id,
        hIcon: icon,
        dwFlags: if enabled { THBF_ENABLED } else { THBF_DISABLED },
        ..Default::default()
    };
    // szTip is a fixed 260 wchar buffer; zip stops before the terminator is lost.
    for (slot, unit) in button
        .szTip
        .iter_mut()
        .zip(tooltip.encode_utf16().chain(std::iter::once(0)))
    {
        *slot = unit;
    }
    button
}

// ─── Icons ────────────────────────────────────────────────────────────────────

struct IconSet {
    size: i32,
    light_theme: bool,
    play: HICON,
    pause: HICON,
    prev: HICON,
    next: HICON,
    heart: HICON,
    heart_outline: HICON,
}

impl IconSet {
    fn destroy(self) {
        for icon in [
            self.play,
            self.pause,
            self.prev,
            self.next,
            self.heart,
            self.heart_outline,
        ] {
            if !icon.is_invalid() {
                let _ = unsafe { DestroyIcon(icon) };
            }
        }
    }
}

/// Rebuild the icon set when the DPI or the shell theme changed.
/// Returns the superseded set so the caller can free it after the update.
fn ensure_icons(hwnd: HWND) -> Option<IconSet> {
    let size = icon_size_for_dpi(unsafe { GetDpiForWindow(hwnd) });
    let light_theme = taskbar_uses_light_theme();

    ICONS.with(|slot| {
        if slot
            .borrow()
            .as_ref()
            .is_some_and(|set| set.size == size && set.light_theme == light_theme)
        {
            return None;
        }
        // Glyphs read as the foreground of the thumbnail flyout, so they follow
        // the shell theme rather than the in-app theme.
        let color = if light_theme {
            [0, 0, 0]
        } else {
            [255, 255, 255]
        };
        let set = IconSet {
            size,
            light_theme,
            play: create_glyph_icon(Glyph::Play, size, color),
            pause: create_glyph_icon(Glyph::Pause, size, color),
            prev: create_glyph_icon(Glyph::Prev, size, color),
            next: create_glyph_icon(Glyph::Next, size, color),
            heart: create_glyph_icon(Glyph::Heart, size, color),
            heart_outline: create_glyph_icon(Glyph::HeartOutline, size, color),
        };
        slot.borrow_mut().replace(set)
    })
}

fn icon_size_for_dpi(dpi: u32) -> i32 {
    let dpi = if dpi == 0 { 96 } else { dpi };
    (16 * dpi as i32 / 96).clamp(16, 64)
}

fn taskbar_uses_light_theme() -> bool {
    let mut value: u32 = 0;
    let mut size = size_of::<u32>() as u32;
    let status = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            w!("Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"),
            w!("SystemUsesLightTheme"),
            RRF_RT_REG_DWORD,
            None,
            Some(&mut value as *mut u32 as *mut c_void),
            Some(&mut size),
        )
    };
    status == ERROR_SUCCESS && value != 0
}

/// Build an alpha-blended `HICON` from a rasterised glyph.
fn create_glyph_icon(glyph: Glyph, size: i32, color: [u8; 3]) -> HICON {
    let pixels = rasterize(glyph, size as u32, color);

    let header = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: size,
            // A negative height requests a top-down bitmap, matching `rasterize`.
            biHeight: -size,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        },
        ..Default::default()
    };

    let mut bits: *mut c_void = std::ptr::null_mut();
    let color_bitmap =
        unsafe { CreateDIBSection(None, &header, DIB_RGB_COLORS, &mut bits, None, 0) };
    let Ok(color_bitmap) = color_bitmap else {
        warn!("failed to create thumbnail toolbar icon bitmap");
        return HICON(std::ptr::null_mut());
    };
    unsafe { std::ptr::copy_nonoverlapping(pixels.as_ptr(), bits as *mut u8, pixels.len()) };

    // Per-pixel alpha drives transparency, so the AND mask stays fully opaque.
    let mask_stride = (size as usize).div_ceil(16) * 2;
    let mask_bits = vec![0u8; mask_stride * size as usize];
    let mask_bitmap =
        unsafe { CreateBitmap(size, size, 1, 1, Some(mask_bits.as_ptr() as *const c_void)) };

    let info = ICONINFO {
        fIcon: true.into(),
        hbmMask: mask_bitmap,
        hbmColor: color_bitmap,
        ..Default::default()
    };
    let icon = unsafe { CreateIconIndirect(&info) };

    let _ = unsafe { DeleteObject(color_bitmap.into()) };
    let _ = unsafe { DeleteObject(mask_bitmap.into()) };

    match icon {
        Ok(icon) => icon,
        Err(e) => {
            warn!(error = %e, "failed to create thumbnail toolbar icon");
            HICON(std::ptr::null_mut())
        }
    }
}

// ─── Glyph rasterisation ──────────────────────────────────────────────────────

/// Glyphs drawn on the toolbar buttons.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Glyph {
    Play,
    Pause,
    Prev,
    Next,
    Heart,
    HeartOutline,
}

/// Samples per axis taken inside each pixel to anti-alias the glyph edges.
const SUPERSAMPLE: u32 = 4;

/// Half-extents of `(u² + v² - 1)³ - u²v³ = 0` and the vertical offset that
/// centres it, so the curve exactly fills the -1..1 box.
const HEART_EXTENT_X: f32 = 1.139;
const HEART_EXTENT_Y: f32 = 1.118;
const HEART_CENTER_V: f32 = 0.118;

/// Keeps the glyphs off the very edge of the icon.
const GLYPH_SCALE: f32 = 0.92;

/// Rasterise `glyph` into a top-down 32bpp BGRA buffer with premultiplied alpha,
/// which is what `CreateIconIndirect` expects from a DIB section.
pub(crate) fn rasterize(glyph: Glyph, size: u32, color: [u8; 3]) -> Vec<u8> {
    let mut pixels = vec![0u8; (size * size * 4) as usize];
    let samples = (SUPERSAMPLE * SUPERSAMPLE) as f32;

    for y in 0..size {
        for x in 0..size {
            let mut hits = 0u32;
            for sy in 0..SUPERSAMPLE {
                for sx in 0..SUPERSAMPLE {
                    let fx = normalize(x, sx, size);
                    let fy = normalize(y, sy, size);
                    if glyph_contains(glyph, fx / GLYPH_SCALE, fy / GLYPH_SCALE) {
                        hits += 1;
                    }
                }
            }
            let alpha = (hits as f32 / samples * 255.0).round() as u8;
            let offset = ((y * size + x) * 4) as usize;
            pixels[offset] = premultiply(color[2], alpha);
            pixels[offset + 1] = premultiply(color[1], alpha);
            pixels[offset + 2] = premultiply(color[0], alpha);
            pixels[offset + 3] = alpha;
        }
    }
    pixels
}

/// Map a subsample of pixel `index` onto the -1..1 glyph box.
fn normalize(index: u32, subsample: u32, size: u32) -> f32 {
    let offset = (subsample as f32 + 0.5) / SUPERSAMPLE as f32;
    (index as f32 + offset) / size as f32 * 2.0 - 1.0
}

fn premultiply(channel: u8, alpha: u8) -> u8 {
    ((channel as u32 * alpha as u32 + 127) / 255) as u8
}

/// True when the point is inside the glyph. `x` and `y` run from -1.0 to 1.0
/// with `y` pointing down, matching the pixel order of the icon bitmap.
fn glyph_contains(glyph: Glyph, x: f32, y: f32) -> bool {
    match glyph {
        Glyph::Play => in_triangle((-0.5, -0.78), (-0.5, 0.78), (0.76, 0.0), x, y),
        Glyph::Pause => {
            y.abs() <= 0.76 && ((-0.58..=-0.18).contains(&x) || (0.18..=0.58).contains(&x))
        }
        Glyph::Prev => {
            (y.abs() <= 0.76 && (-0.82..=-0.54).contains(&x))
                || in_triangle((0.76, -0.78), (0.76, 0.78), (-0.44, 0.0), x, y)
        }
        Glyph::Next => glyph_contains(Glyph::Prev, -x, y),
        Glyph::Heart => in_heart(x, y, 1.0),
        Glyph::HeartOutline => in_heart(x, y, 1.0) && !in_heart(x, y, 0.62),
    }
}

fn in_triangle(a: (f32, f32), b: (f32, f32), c: (f32, f32), x: f32, y: f32) -> bool {
    let side = |p: (f32, f32), q: (f32, f32)| (q.0 - p.0) * (y - p.1) - (q.1 - p.1) * (x - p.0);
    let (d1, d2, d3) = (side(a, b), side(b, c), side(c, a));
    let negative = d1 < 0.0 || d2 < 0.0 || d3 < 0.0;
    let positive = d1 > 0.0 || d2 > 0.0 || d3 > 0.0;
    !(negative && positive)
}

/// The classic implicit heart, scaled about the centre of the glyph box.
fn in_heart(x: f32, y: f32, scale: f32) -> bool {
    let u = x / scale * HEART_EXTENT_X;
    let v = -y / scale * HEART_EXTENT_Y + HEART_CENTER_V;
    let radial = u * u + v * v - 1.0;
    radial * radial * radial - u * u * v * v * v <= 0.0
}

#[cfg(test)]
#[path = "thumbbar_tests.rs"]
mod tests;
