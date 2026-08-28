import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { createStore } from "zustand/vanilla"

import { installDropUrlHandler } from "./lib/dropHandler"
import { getPlayManager } from "./lib/playManager"
import { getSocialActions } from "./lib/socialActions"
import { getSoundLikes } from "./lib/soundLikes"
import { insertTitlebar } from "./toolbar"
import type { Sound } from "./types/sound"
import type { SoundEventObject } from "./types/soundEventObject"
import type { RepeatMode } from "./types/utils"

import injectStyles from "./inject.scss"

const playManager = getPlayManager()
const socialActions = getSocialActions()
const soundLikes = getSoundLikes()

console.log("inject script loaded")

function getCurrentSound() {
  return playManager.hasCurrentSound() ? playManager.getCurrentSound() : undefined
}

/**
 * Tell the backend whether the playing track is liked, so the taskbar
 * thumbnail toolbar can show Like or Dislike. Null means nothing is playing.
 */
async function reportLikeState() {
  const trackId = getCurrentSound()?.get("id")
  await invoke("event_like_state_changed", {
    isLiked: trackId === undefined ? null : soundLikes.get(trackId) === true,
  })
}

async function handlePlay(e: SoundEventObject) {
  const currentSoundTime =
    e?.sound?.currentTime() ?? soundStore.getState().current?.currentTime() ?? 0
  const positionMs = Number.isFinite(currentSoundTime) ? currentSoundTime : 0
  await invoke("event_playback_state_changed", { isPlaying: true, positionMs })
}
async function handlePause(e: SoundEventObject) {
  const currentSoundTime =
    e?.sound?.currentTime() ?? soundStore.getState().current?.currentTime() ?? 0
  const positionMs = Number.isFinite(currentSoundTime) ? currentSoundTime : 0
  await invoke("event_playback_state_changed", { isPlaying: false, positionMs })
}
async function handleSeeked(e: SoundEventObject) {
  const currentSoundTime =
    e?.sound?.currentTime() ?? soundStore.getState().current?.currentTime() ?? 0
  const positionMs = Number.isFinite(currentSoundTime) ? currentSoundTime : 0
  await invoke("event_seeked", { positionMs })
}

const soundStore = createStore<{
  current?: Sound
  updateSound: (sound?: Sound) => void
}>((set, get) => ({
  updateSound: (sound?: Sound) => {
    const { current } = get()
    if (current) {
      current.off("play", handlePlay)
      current.off("pause", handlePause)
      current.off("seeked", handleSeeked)
    }
    set({ current: sound })
    if (sound) {
      sound.on("play", handlePlay)
      sound.on("pause", handlePause)
      sound.on("seeked", handleSeeked)
    }
  },
}))

playManager.on("change:currentSound", async (payload) => {
  soundStore.getState().updateSound(payload?.current)
  await reportLikeState()
  if (payload?.current) {
    await invoke("event_change_current_sound", {
      attributes: payload.current.attributes,
    })
  }
})

soundLikes.on("change", () => {
  void reportLikeState()
})

void listen("play-pause", () => {
  playManager.toggleCurrent()
})
void listen("next", () => {
  playManager.playNext({ userInitiated: true })
})
void listen("previous", () => {
  playManager.playPrev({ userInitiated: true })
})
void listen("like", () => {
  const sound = getCurrentSound()
  if (sound) socialActions.like(sound)
})

const V2_LAYOUT_FRAME_SELECTOR = "iframe.webiIframe.webiIframeV2Layout"

const injectSheet = new CSSStyleSheet()
injectSheet.replaceSync(injectStyles)

/** Adopts the inject stylesheet and keeps it adopted across vendor resets. */
function adoptInjectStyles(): void {
  Object.defineProperty(document, "adoptedStyleSheets", {
    configurable: true,
    enumerable: true,
    get(this: Document): CSSStyleSheet[] {
      return Reflect.get(Document.prototype, "adoptedStyleSheets", this)
    },
    set(this: Document, sheets: CSSStyleSheet[]) {
      const next = sheets.includes(injectSheet) ? sheets : [...sheets, injectSheet]
      Reflect.set(Document.prototype, "adoptedStyleSheets", next, this)
    },
  })

  document.adoptedStyleSheets = [...document.adoptedStyleSheets, injectSheet]
}

/** Makes the V2 layout track iframe blend into the acrylic background. */
function applyV2FrameStyles(frame: HTMLIFrameElement): void {
  const frameDocument = frame.contentDocument
  const frameWindow = frameDocument?.defaultView
  if (!frameDocument || !frameWindow) return

  const frameSheet = new frameWindow.CSSStyleSheet()
  frameSheet.replaceSync("body{background-color:transparent}")
  frameDocument.adoptedStyleSheets.push(frameSheet)
  frame.style.backgroundColor = "transparent"
}

/** Applies the frame styles on every load of the V2 layout iframe. */
function watchV2LayoutFrame(): void {
  document.addEventListener(
    "load",
    (e) => {
      const { target } = e
      if (target instanceof HTMLIFrameElement && target.matches(V2_LAYOUT_FRAME_SELECTOR)) {
        applyV2FrameStyles(target)
      }
    },
    true
  )

  const frame = document.querySelector<HTMLIFrameElement>(V2_LAYOUT_FRAME_SELECTOR)
  if (frame) applyV2FrameStyles(frame)
}

/**
 * The liked ids back the taskbar Like button. SoundCloud fetches the same
 * collection for its own like buttons, so this is at most one extra request.
 */
async function loadLikedTracks() {
  try {
    await soundLikes.fetch()
    await reportLikeState()
  } catch (err) {
    console.warn("[sc-desktop] could not load liked tracks:", err)
  }
}

/**
 * Hands the currently playing track to the backend and restores the shuffle /
 * repeat preferences it persisted for us.
 */
async function restoreSessionState() {
  try {
    if (playManager.hasCurrentSound()) {
      const currentSound = playManager.getCurrentSound()!
      soundStore.getState().updateSound(currentSound)
      await invoke("event_change_current_sound", {
        attributes: currentSound.attributes,
      })
    }

    const prefs = await invoke<{ shuffle: boolean; repeat_mode: RepeatMode }>("post_init")
    const currentShuffle = playManager.getState("shuffle")
    const { repeatMode: currentRepeatMode } = playManager.getQueueState()

    if (currentShuffle !== prefs.shuffle) {
      playManager.toggleShuffle()
    }
    if (currentRepeatMode !== prefs.repeat_mode) {
      playManager.setRepeatMode(prefs.repeat_mode)
    }
    console.debug("[sc-desktop] Init complete")
  } catch (err) {
    console.warn("[sc-desktop] init setup failed:", err)
  }
}

async function init() {
  insertTitlebar()
  installDropUrlHandler()

  document.querySelector("div#app")?.addEventListener("scroll", () => {
    window.dispatchEvent(new Event("scroll"))
  })

  adoptInjectStyles()
  watchV2LayoutFrame()

  playManager.on("state:shuffle", async (value: boolean) => {
    await invoke("save_shuffle_state", { shuffle: value })
  })

  playManager.on("change:repeatMode", async (mode: RepeatMode) => {
    await invoke("save_repeat_mode", { mode })
  })

  await Promise.all([loadLikedTracks(), restoreSessionState()])
}

void init()
