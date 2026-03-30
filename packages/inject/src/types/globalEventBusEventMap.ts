import type {
  SoundErrorEventObject,
  SoundEventObject,
  SoundQualityChangedEventObject,
} from "./soundEventObject.js"

/**
 * Events emitted on the global event bus (module 10).
 *
 * Every Sound player event is forwarded as "audio:" + eventName.
 * The payload is identical to the corresponding SoundEventMap callback arg.
 * Cast session events are also dispatched on the global bus.
 */
export interface GlobalEventBusEventMap {
  // Audio forwarding (mirrors SoundEventMap with "audio:" prefix)
  "audio:play": (event: SoundEventObject) => void
  "audio:pause": (event: SoundEventObject) => void
  "audio:playStart": (event: SoundEventObject) => void
  "audio:finish": (event: SoundEventObject) => void
  "audio:time": (event: SoundEventObject) => void
  "audio:seeked": (event: SoundEventObject) => void
  "audio:buffering:start": (event: SoundEventObject) => void
  "audio:buffering:end": (event: SoundEventObject) => void
  "audio:playerError": (event: SoundErrorEventObject) => void
  "audio:qualityChanged": (event: SoundQualityChangedEventObject) => void
  "audio:dead": (event: SoundEventObject) => void

  // Google Cast session events
  "googleCast:start": () => void
  "googleCast:end": () => void
  "googleCast:audioHijack": () => void
  "googleCast:audioRestored": () => void
}
