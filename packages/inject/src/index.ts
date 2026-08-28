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

// Covers likes toggled from SoundCloud's own buttons as well as ours, since
// both end up mutating this collection.
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

  document.querySelector("div#app")?.addEventListener("scroll", () => {
    window.dispatchEvent(new Event("scroll"))
  })

  // Inject styles first so the layout is correct even if a later IPC await
  // stalls during startup. The vendor app can reset adoptedStyleSheets or
  // rebuild body content while booting, so re-apply until it sticks.
  const injectStylesheet = (): void => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(injectStyles)
    document.adoptedStyleSheets.push(sheet)

    const v2Frame = document.querySelector<HTMLIFrameElement>(
      "iframe.webiIframe.webiIframeV2Layout"
    )
    if (v2Frame?.contentDocument?.defaultView) {
      const frameSheet = new v2Frame.contentDocument.defaultView.CSSStyleSheet()
      frameSheet.replaceSync("body{background-color:transparent}")
      v2Frame.contentDocument.adoptedStyleSheets.push(frameSheet)
      v2Frame.style.backgroundColor = "transparent"
    }
  }

  injectStylesheet()

  // Re-apply if the vendor boot wipes our stylesheet (checked a few times).
  for (const delay of [1000, 3000, 8000]) {
    setTimeout(() => {
      if (!document.adoptedStyleSheets.some((s) => s.cssRules.length > 0)) {
        injectStylesheet()
        console.debug("[sc-desktop] re-applied inject styles")
      }
    }, delay)
  }

  playManager.on("state:shuffle", async (value: boolean) => {
    await invoke("save_shuffle_state", { shuffle: value })
  })

  playManager.on("change:repeatMode", async (mode: RepeatMode) => {
    await invoke("save_repeat_mode", { mode })
  })

  // These wait on the vendor app or on IPC, so they only start once the UI
  // setup above is done, and they run concurrently with each other. Each one
  // reports its own failure, so a slow or broken one never holds up the rest.
  await Promise.all([installDropUrlHandler(), loadLikedTracks(), restoreSessionState()])
}

void init()
