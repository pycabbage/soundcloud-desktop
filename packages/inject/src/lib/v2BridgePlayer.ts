import type { V2BridgePlayer } from "../types/v2BridgePlayer"
import { panic } from "./utils"
import { getModule } from "./webpack"

export function getV2BridgePlayer() {
  return (
    (getModule(["v2PlaybackState", "syncV2PlaybackState"]) as
      | V2BridgePlayer
      | undefined) || panic("Could not find the v2 bridge player module")
  )
}
