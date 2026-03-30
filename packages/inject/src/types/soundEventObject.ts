import type { Sound } from "./sound.js"

/**
 * Base event object passed to every Sound player event callback.
 * Built in 54-8313710f.js: { type, sound, model, ...rawPlayerEvent }
 */
export interface SoundEventObject {
  type: string
  sound: Sound
  model: Sound
  [key: string]: unknown
}

/** Event object for "playerError" — includes the Error instance. */
export interface SoundErrorEventObject extends SoundEventObject {
  type: "playerError"
  error: Error
}

/** Event object for "qualityChanged" — includes the new quality string. */
export interface SoundQualityChangedEventObject extends SoundEventObject {
  type: "qualityChanged"
  quality: string
}
