import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { getPlayManager } from "./lib/playManager"
import { getV2BridgePlayer } from "./lib/v2BridgePlayer"
import type { PlayManager } from "./types/playManager"
import type { V2BridgePlayer } from "./types/v2BridgePlayer"

const v2BridgePlayer = getV2BridgePlayer()
const playManager = getPlayManager()

declare global {
  var v2BridgePlayer: V2BridgePlayer
  var playManager: PlayManager
}

if (!("v2BridgePlayer" in globalThis))
  globalThis.v2BridgePlayer = v2BridgePlayer
if (!("playManager" in globalThis)) globalThis.playManager = playManager

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

playManager.on("change:currentSound", async (payload) => {
  console.log("[event] change:currentSound", payload)
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
    const currentSound = playManager.getCurrentSound()!
    await invoke("event_change_current_sound", {
      attributes: currentSound.attributes,
    })
  }
}

init().catch(console.error)
