import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { getPlayManager } from "./lib/playManager"
import { getV2BridgePlayer } from "./lib/v2BridgePlayer"
import type { V2BridgePlayer } from "./types/nativePlayer"
import type { PlayManager } from "./types/playManager"

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
  await invoke("song_title", {
    requestId: event.payload.requestId,
    title: v2BridgePlayer.currentTrack?.title,
  })
}).catch(console.error)
console.log("inject script loaded")

playManager.on("change:currentSound", async (payload) => {
  console.log("[event] change:currentSound", payload)
  if (payload?.current) {
    // await invoke("song_title", {
    //   title: payload.current,
    // })
  }
})
playManager.on("state:globalPlayLock", (val) =>
  console.log("[event] state:globalPlayLock", val)
)
playManager.on("state:fallbackEnabled", (val) =>
  console.log("[event] state:fallbackEnabled", val)
)
