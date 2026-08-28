import type { DestroyManager } from "../types/destroyManager.js"
import { panic } from "./utils"
import { getModule, getWebpackRequire } from "./webpack"

/** The facade that owns the like/repost/follow toggle collections. */
export function getSocialActions() {
  return (
    (getModule(["like", "repost", "follow", "addToPlayHistory"], false, getWebpackRequire()) as
      | DestroyManager
      | undefined) || panic("Could not find the social actions module")
  )
}
