import type { PlayManager } from "../types/playManager"
import { panic } from "./utils"
import { getModule, getWebpackRequire } from "./webpack"

export function getPlayManager() {
  return (
    (getModule(
      ["getCurrentSound", "cycleRepeatMode", "toggleShuffle"],
      false,
      getWebpackRequire()
    ) as PlayManager | undefined) || panic("Could not find the play manager module")
  )
}
