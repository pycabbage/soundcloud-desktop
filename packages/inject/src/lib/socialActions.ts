import type { DestroyManager } from "../types/destroyManager.js"
import { panic } from "./utils"
import { getModule, getWebpackRequire } from "./webpack"

/**
 * Social actions facade — the same object PlayManager receives as its
 * `destroyManager`. It owns the like/repost/follow toggle collections, so
 * likes have to go through it to stay in sync with the rest of the app.
 */
export function getSocialActions() {
  return (
    (getModule(["like", "repost", "follow", "addToPlayHistory"], false, getWebpackRequire()) as
      | DestroyManager
      | undefined) || panic("Could not find the social actions module")
  )
}
