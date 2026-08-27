#![cfg(windows)]

use std::sync::atomic::{AtomicUsize, Ordering};

use tracing::warn;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::Shell::{
    DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass, SUBCLASSPROC,
};
use windows::Win32::UI::WindowsAndMessaging::{DefWindowProcW, WM_NCACTIVATE};

const SUBCLASS_ID: usize = 0x5343_4C44;

static INSTALLED: AtomicUsize = AtomicUsize::new(0);

unsafe extern "system" fn keep_backdrop_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _uidsubclass: usize,
    _dwrefdata: usize,
) -> LRESULT {
    if msg == WM_NCACTIVATE {
        return unsafe { DefWindowProcW(hwnd, WM_NCACTIVATE, WPARAM(1), LPARAM(-1)) };
    }

    unsafe { DefSubclassProc(hwnd, msg, wparam, lparam) }
}

unsafe extern "system" fn subclass_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    uidsubclass: usize,
    dwrefdata: usize,
) -> LRESULT {
    keep_backdrop_proc(hwnd, msg, wparam, lparam, uidsubclass, dwrefdata)
}

pub fn install_keep_active_subclass(hwnd: isize) {
    let count = INSTALLED.fetch_add(1, Ordering::SeqCst);
    if count > 0 {
        return;
    }

    let proc = SUBCLASSPROC::Some(subclass_proc);
    let ok = unsafe { SetWindowSubclass(HWND(hwnd as *mut _), proc, SUBCLASS_ID, 0) };
    if !ok.as_bool() {
        warn!("failed to install WM_NCACTIVATE subclass; acrylic will dim when inactive");
        INSTALLED.store(0, Ordering::SeqCst);
    }
}

#[allow(dead_code)]
pub fn remove_keep_active_subclass(hwnd: isize) {
    if INSTALLED.swap(0, Ordering::SeqCst) == 0 {
        return;
    }
    let ok =
        unsafe { RemoveWindowSubclass(HWND(hwnd as *mut _), Some(subclass_proc), SUBCLASS_ID) };
    if !ok.as_bool() {
        warn!("failed to remove WM_NCACTIVATE subclass");
    }
}

#[cfg(test)]
#[path = "acrylic_tests.rs"]
mod tests;
