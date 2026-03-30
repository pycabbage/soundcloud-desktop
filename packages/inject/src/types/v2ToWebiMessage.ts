import type { AudioAdPayload } from "./audioAdPayload.js"
import type { DsaConfig } from "./dsaConfig.js"
import type { Track } from "./track.js"
import type { V2PlaybackState } from "./v2PlaybackState.js"

/**
 * Messages sent from the V2 (old UI) iframe to the Webi (new UI) host.
 * Received via window "message" event and dispatched by V2Bridge.
 */
export type V2ToWebiMessage =
  | { kind: "navigate"; href: string }
  | { kind: "refresh" }
  | { kind: "set-current-track"; track: Track }
  | { kind: "sync-playback-state"; playbackState: V2PlaybackState }
  | {
      kind: "set-current-ad"
      audioAd: AudioAdPayload | null
      dsaConfig: DsaConfig | null
      index: number
      total: number
    }
  | { kind: "end-ad-break" }
  | { kind: "leave-behind-dismissed" }
  | { kind: "onetrust-loaded" }
  | { kind: "initiate-upload"; files: File[] }
  | { kind: "unverified-upload-attempt" }
