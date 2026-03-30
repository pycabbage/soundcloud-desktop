import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { createStore } from "zustand/vanilla"
import { getPlayManager } from "./lib/playManager"
// import { getV2BridgePlayer } from "./lib/v2BridgePlayer"
// import type { PlayManager } from "./types/playManager"
import type { Sound } from "./types/sound"
import type { SoundEventObject } from "./types/soundEventObject"

// import type { V2BridgePlayer } from "./types/v2BridgePlayer"

// const v2BridgePlayer = getV2BridgePlayer()
const playManager = getPlayManager()

// declare global {
//   // var v2BridgePlayer: V2BridgePlayer
//   var playManager: PlayManager
// }

// if (!("v2BridgePlayer" in globalThis))
//   globalThis.v2BridgePlayer = v2BridgePlayer
// if (!("playManager" in globalThis)) globalThis.playManager = playManager

interface IRequest {
  requestId: number
}
listen<IRequest>("get-song-title", async (event) => {
  console.log("event", event)
  await invoke("event_change_current_sound", {
    requestId: event.payload.requestId,
    attributes: playManager.getCurrentSound()?.attributes ?? {},
  })
}).catch(console.error)
console.log("inject script loaded")

async function handlePlay(e: SoundEventObject) {
  const raw =
    e.sound?.currentTime() ?? soundStore.getState().current?.currentTime() ?? 0
  const positionMs = Number.isFinite(raw) ? raw : 0
  await invoke("event_playback_state_changed", { isPlaying: true, positionMs })
}
async function handlePause(e: SoundEventObject) {
  const raw =
    e.sound?.currentTime() ?? soundStore.getState().current?.currentTime() ?? 0
  const positionMs = Number.isFinite(raw) ? raw : 0
  await invoke("event_playback_state_changed", { isPlaying: false, positionMs })
}
async function handleSeeked(e: SoundEventObject) {
  const raw = e.sound.currentTime()
  const positionMs = Number.isFinite(raw) ? raw : 0
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

async function init() {
  if (playManager.hasCurrentSound()) {
    // biome-ignore lint/style/noNonNullAssertion: We check if there is a current sound, so it can't be null
    const currentSound = playManager.getCurrentSound()!
    soundStore.getState().updateSound(currentSound)
    await invoke("event_change_current_sound", {
      attributes: currentSound.attributes,
    })
  }
}

init().catch(console.error)
