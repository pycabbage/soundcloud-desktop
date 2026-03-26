import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { getNativePlayer } from "./lib/nativePlayer"
import { getPlayManager } from "./lib/playManager"

const nativePlayer = getNativePlayer()
const playManager = getPlayManager()

interface IRequest {
  id: number
}
listen<IRequest>("get-song-title", async (event) => {
  console.log("event", event)
  await invoke("song_title", {
    id: event.payload.id,
    title: nativePlayer.currentTrack.title,
  })
})
