import type { SoundTranscoding } from "./soundTranscoding.js"

/** Sound.attributes.media — container for available transcodings. */
export interface SoundMedia {
  transcodings: SoundTranscoding[]
}
