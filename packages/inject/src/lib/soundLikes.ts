import type { ToggleCollection } from "../types/toggleCollection.js"
import { panic } from "./utils"
import { findModule, getWebpackRequire } from "./webpack"

/** Read endpoint that picks the sound likes collection out of its siblings. */
const SOUND_LIKES_ENDPOINT = "soundLikesIds"

interface ToggleCollectionClass {
  new (): ToggleCollection
}

function isSoundLikesClass(exports: object): exports is ToggleCollectionClass {
  if (!("prototype" in exports)) return false
  const { prototype } = exports
  return (
    typeof prototype === "object" &&
    prototype !== null &&
    "readEndpoint" in prototype &&
    prototype.readEndpoint === SOUND_LIKES_ENDPOINT
  )
}

/** The shared `me/track_likes/ids` collection of every liked track id. */
export function getSoundLikes() {
  const SoundLikes = findModule<ToggleCollectionClass>(isSoundLikesClass, getWebpackRequire())
  return SoundLikes ? new SoundLikes() : panic("Could not find the sound likes collection")
}
