import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { createStore } from "zustand/vanilla"

import { installDropUrlHandler } from "./lib/dropHandler"
import { getPlayManager } from "./lib/playManager"
import { insertTitlebar } from "./toolbar"
import type { Sound } from "./types/sound"
import type { SoundEventObject } from "./types/soundEventObject"
import type { RepeatMode } from "./types/utils"

import injectStyles from "./inject.scss"

const playManager = getPlayManager()

console.log("inject script loaded")

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
  if (payload?.current) {
    await invoke("event_change_current_sound", {
      attributes: payload.current.attributes,
    })
  }
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

async function init() {
  insertTitlebar()
  installDropUrlHandler()

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

  // IPC-dependent setup must never block the UI init above.
  void (async () => {
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
  })().catch((err: unknown) => {
    console.warn("[sc-desktop] init setup failed:", err)
  })
}

void init()
