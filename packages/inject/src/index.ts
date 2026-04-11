import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { createStore } from "zustand/vanilla"
import injectStyles from "./inject.scss"
import { getPlayManager } from "./lib/playManager"
import { insertTitlebar } from "./toolbar"
import type { Sound } from "./types/sound"
import type { SoundEventObject } from "./types/soundEventObject"
import type { RepeatMode } from "./types/utils"

const playManager = getPlayManager()
let prefsInitialized = false

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
  console.log("[event] change:currentSound", payload)

  soundStore.getState().updateSound(payload?.current)
  if (payload?.current) {
    console.log("current sound attributes", payload.current.attributes)
    await invoke("event_change_current_sound", {
      attributes: payload.current.attributes,
    })
  }
})

playManager.on("state:globalPlayLock", (val) =>
  console.log("[event] state:globalPlayLock", val)
)
playManager.on("state:fallbackEnabled", (val) =>
  console.log("[event] state:fallbackEnabled", val)
)
playManager.on("state:shuffle", async (value: boolean) => {
  if (!prefsInitialized) {
    console.debug("[sc-desktop] Ignoring shuffle event during init:", value)
    return
  }
  console.debug("[sc-desktop] Saving shuffle state:", value)
  await invoke("save_shuffle_state", { shuffle: value })
})

playManager.on("change:repeatMode", async (mode: RepeatMode) => {
  if (!prefsInitialized) {
    console.debug("[sc-desktop] Ignoring repeatMode event during init:", mode)
    return
  }
  console.debug("[sc-desktop] Saving repeat mode:", mode)
  await invoke("save_repeat_mode", { mode })
})

listen("play-pause", () => {
  console.debug("[sc-desktop] Received play-pause event from main process")
  playManager.toggleCurrent()
})
listen("next", () => {
  console.debug("[sc-desktop] Received next event from main process")
  playManager.playNext()
})
listen("previous", () => {
  console.debug("[sc-desktop] Received previous event from main process")
  playManager.playPrev()
})

async function init() {
  if (playManager.hasCurrentSound()) {
    // biome-ignore lint/style/noNonNullAssertion: We check if there is a current sound, so it can't be null
    const currentSound = playManager.getCurrentSound()!
    soundStore.getState().updateSound(currentSound)
    await invoke("event_change_current_sound", {
      attributes: currentSound.attributes,
    })
  }

  const prefs = await invoke<{ shuffle: boolean; repeat_mode: RepeatMode }>(
    "post_init"
  )
  const currentShuffle = playManager.getState("shuffle")
  const { repeatMode: currentRepeatMode } = playManager.getQueueState()

  if (currentShuffle !== prefs.shuffle) {
    console.debug(
      "[sc-desktop] Restoring shuffle:",
      currentShuffle,
      "→",
      prefs.shuffle
    )
    playManager.toggleShuffle()
  }
  if (currentRepeatMode !== prefs.repeat_mode) {
    console.debug(
      "[sc-desktop] Restoring repeat mode:",
      currentRepeatMode,
      "→",
      prefs.repeat_mode
    )
    playManager.setRepeatMode(prefs.repeat_mode)
  }

  // Inject styles
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(injectStyles)
  document.adoptedStyleSheets.push(sheet)

  insertTitlebar()

  prefsInitialized = true
  console.debug("[sc-desktop] Init complete, event listeners now active")
}

init().catch(console.error)
