import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { getNativePlayer } from "./lib/nativePlayer"
import { getPlayManager } from "./lib/playManager"

const nativePlayer = getNativePlayer()
const playManager = getPlayManager()

interface IRequest {
  requestId: number
}
listen<IRequest>("get-song-title", async (event) => {
  console.log("event", event)
  await invoke("song_title", {
    requestId: event.payload.requestId,
    title: nativePlayer.currentTrack.title,
  })
}).catch(console.error)
console.log("inject script loaded")
