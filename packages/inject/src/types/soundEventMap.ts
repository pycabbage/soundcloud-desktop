import type { Sound } from "./sound.js"
import type {
  SoundErrorEventObject,
  SoundEventObject,
  SoundQualityChangedEventObject,
} from "./soundEventObject.js"

/**
 * Callback signatures for all Sound model events.
 *
 * The internal scaudioPlayer bridge subscribes to RxJS-style signals
 * and re-fires them as Backbone events via sound.trigger(name, eventObj).
 * Every callback receives a SoundEventObject as its first argument.
 *
 * Position queries:
 *   sound.on("time", e => { const posMs = e.sound.currentTime(); })
 */
export interface SoundEventMap {
  // Player lifecycle events
  play: (event: SoundEventObject) => void
  pause: (event: SoundEventObject) => void
  playStart: (event: SoundEventObject) => void
  finish: (event: SoundEventObject) => void
  time: (event: SoundEventObject) => void
  seeked: (event: SoundEventObject) => void
  "buffering:start": (event: SoundEventObject) => void
  "buffering:end": (event: SoundEventObject) => void
  playerError: (event: SoundErrorEventObject) => void
  qualityChanged: (event: SoundQualityChangedEventObject) => void
  dead: (event: SoundEventObject) => void

  // Model / state events
  "change:playable": (playable: boolean) => void
  "change:user": () => void
  // NOTE: "change:explicit" is fired by QueueItem (module 182), not by Sound directly.
  //   Listen on a QueueItem instance, not on Sound.
  error: (model: Sound, error: Error) => void
}
