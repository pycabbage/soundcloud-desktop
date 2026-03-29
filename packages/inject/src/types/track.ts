/**
 * SoundCloud System B — Track and related types
 *
 * These types are used by NativePlayer and V2BridgePlayer (module 83585).
 * Derived from GraphQL fragments (SCAudioTrack, MiniPlayerTrack) and
 * the "set-current-track" V2 bridge message schema in the HAR file.
 */

// ---------------------------------------------------------------------------
// DisabledReason
// ---------------------------------------------------------------------------

/** Reason a track is disabled. Sourced from module 23844 usage. */
export type DisabledReason = "BLACKLISTED" | "ENABLED" | "OVERQUOTA" | "UNKNOWN"

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/** Track authorization / monetization policy from the API. */
export interface Authorization {
  /** Monetization model, e.g. "SUB_HIGH_TIER", "AD_SUPPORTED". */
  monetizationModel: string | null
  /** Access policy: "ALLOW", "BLOCK", or "SNIP". */
  policy: string | null
  /** Block reason, e.g. "GEO". */
  reason: string | null
}

// ---------------------------------------------------------------------------
// Transcoding
// ---------------------------------------------------------------------------

/** Audio format descriptor. */
export interface TranscodingFormat {
  /** Streaming protocol, e.g. "hls" or "progressive". */
  protocol: string
  /** MIME type, e.g. "audio/mpeg" or "audio/ogg; codecs=\"opus\"". */
  mimeType: string
}

/** A single audio transcoding variant. */
export interface Transcoding {
  /** Relative URL path to the transcoding manifest or stream. */
  relativeUrl: string
  /** Unique identifier. */
  uuid: string
  /** Preset identifier, e.g. "mp3_0_1", "opus_0_0". */
  preset: string
  /** Duration of this transcoding in milliseconds. */
  durationMs: number
  /** Whether this is a snippet (preview) transcoding. */
  snipped: boolean
  /** Format descriptor. */
  format: TranscodingFormat
  /** Quality level, e.g. "sq" (standard) or "hq" (high). */
  quality: string
}

// ---------------------------------------------------------------------------
// TrackUser
// ---------------------------------------------------------------------------

/**
 * Track owner/user information.
 * Fields vary slightly between the SCAudioTrack and MiniPlayerTrack
 * GraphQL fragments; all non-universal fields are optional.
 */
export interface TrackUser {
  /** User URN — present in SCAudioTrack fragment. */
  urn?: string
  /** Display name — present in MiniPlayerTrack fragment. */
  username?: string
  /** Profile page URL — present in MiniPlayerTrack fragment. */
  permalinkUrl?: string
  /** Avatar image URL (may contain "{size}" placeholder) — present in MiniPlayerTrack. */
  avatarUrl?: string
}

// ---------------------------------------------------------------------------
// Track
// ---------------------------------------------------------------------------

/**
 * Track object returned by NativePlayer.getCurrentTrack() and
 * stored in Queue.tracks[].
 *
 * Assembled from the SCAudioTrack, SCAudioTrackWithoutUser,
 * MiniPlayerTrack, and MiniPlayerTrackWithoutUser GraphQL fragments,
 * plus the "set-current-track" V2 bridge message schema.
 *
 * @remarks
 * Fields marked optional may be absent when the track originates from the V2 bridge
 * ("set-current-track" message), which only carries display metadata.
 * Audio-specific fields (transcodings, authorization, etc.) are present when
 * the track comes from the GraphQL API (NativePlayer context).
 */
export interface Track {
  // ----- Identity -----

  /** Track URN, e.g. "soundcloud:tracks:123456". */
  urn: string

  // ----- Metadata -----

  /** Track title. */
  title: string

  /** Permalink URL of the track page. */
  permalinkUrl: string

  /** Artwork image URL (may contain "{size}" placeholder). */
  artworkUrl: string

  /** Total duration in milliseconds. */
  fullDuration: number

  /** Track owner information. */
  user: TrackUser

  // ----- Access control -----

  /** Secret token for private tracks. */
  secretToken?: string | null

  /** Whether the track is geo-blocked. */
  isBlocked?: boolean

  /** Authorization / monetization policy. null if not yet loaded. */
  authorization?: Authorization | null

  /** Reason the track is disabled, or "ENABLED" if it is not. */
  disabledReason?: DisabledReason

  // ----- Audio streams -----

  /** Available audio transcodings. */
  transcodings?: Transcoding[]

  /** Snippet transcodings, if any (may be absent). */
  transcodingSnips?: Transcoding[]
}

// ---------------------------------------------------------------------------
// Track utility function signatures (module 23844)
// ---------------------------------------------------------------------------

/** Returns true if the track has no transcodings. */
export type HasNoTranscodings = (track: Track) => boolean

/** Returns true if the track is disabled (disabledReason !== "ENABLED"). */
export type IsDisabled = (track: Track) => boolean

/** Returns true if the track is blocked by authorization policy. */
export type IsBlocked = (track: Track) => boolean

/** Returns true if the track is snipped (preview-only). */
export type IsSnipped = (track: Track) => boolean

/** Returns true if the track requires a high-tier subscription. */
export type IsSubHighTier = (track: Track) => boolean

/**
 * Returns true if the track is playable:
 * !hasNoTranscodings && !isDisabled && !isBlocked && !isSnipped
 */
export type IsPlayable = (track: Track) => boolean

/** Returns true if the track is geo-blocked. */
export type IsGeoBlocked = (track: Track) => boolean

// ---------------------------------------------------------------------------
// Ad visual types (module 92 / CrossfadeIframeManager)
// ---------------------------------------------------------------------------

/**
 * Image-based ad visual.
 * Used for `companion_display` and `leave_behind` in AudioAdPayload.
 */
export interface AdVisualImage {
  /** Click destination URL. */
  landing_page: string
  /** DFP ad URN, e.g. "dfp:ads:1-3". */
  ad_urn: string
  /** Image URL (JPEG). */
  ad_visual: string
  /** Pixel tracking URLs. */
  tracking: {
    impression: string[]
    ad_click: string[]
  }
}

/**
 * HTML-based ad visual.
 * Used for `html_companion_display` and `html_leave_behind` in AudioAdPayload.
 */
export interface AdVisualHtml {
  /** Click destination URL. */
  landing_page: string
  /** DFP ad URN. */
  ad_urn: string
  /** Ad width in pixels. */
  width: number
  /** Ad height in pixels. */
  height: number
  /** Raw HTML markup for the ad. */
  html_resource: string
  /** Pixel tracking URLs. */
  tracking: {
    impression: string[]
    ad_click: string[]
  }
}

/**
 * Audio ad payload in "set-current-ad" V2ToWebiMessage.
 * Constructed by CrossfadeIframeManager._handleAdManagerChangeSound().
 * null when no ad is currently active.
 */
export interface AudioAdPayload {
  /** Audio metadata. */
  audio: {
    /** Ad audio duration in milliseconds. */
    duration: number
    /** Advertiser name, or undefined if not set. */
    advertiser: string | undefined
  }
  /** Image companion display (null if unavailable). */
  companion_display: AdVisualImage | null
  /** HTML companion display (null if unavailable). */
  html_companion_display: AdVisualHtml | null
  /** Image leave-behind (null if unavailable). */
  leave_behind: AdVisualImage | null
  /** HTML leave-behind (null if unavailable). */
  html_leave_behind: AdVisualHtml | null
}

/**
 * Digital Services Act (DSA) configuration.
 * Received in "set-current-ad" messages for EU ad transparency compliance.
 */
export interface DsaConfig {
  /** User age. */
  age: number
  /** ISO 3166-1 alpha-2 country code, e.g. "DE". */
  country_code: string
  /** Whether listening history is used for ad targeting. */
  listening_history: boolean
}

// ---------------------------------------------------------------------------
// V2 bridge message types (modules 29637 / 40445)
// ---------------------------------------------------------------------------

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

/**
 * Messages sent from the Webi host to the V2 iframe.
 * Dispatched by V2BridgePlayer methods via window.parent.postMessage.
 */
export type WebiToV2Message =
  | { kind: "play-track-urn"; trackUrn: string }
  | { kind: "play" }
  | { kind: "pause" }
  | { kind: "seek"; time: number }
  | { kind: "adjust-volume"; volume: number }
  | { kind: "set-muted"; muted: boolean }
  | { kind: "navigate"; href: string; openInNewTab?: boolean; hard?: boolean }
  | { kind: "ready" }
  | { kind: "route-change" }
  | { kind: "refresh-webi-module"; module: string }

/**
 * Playback state synced from V2 to Webi via "sync-playback-state" messages.
 * Also used internally by V2BridgePlayer.
 */
export interface V2PlaybackState {
  isPlayable: boolean
  isPlaying: boolean
  isLoading: boolean
  isMuted: boolean
  /** Volume level, 0–1. */
  volume: number
  /** Timestamp (Date.now()) of the last state update. */
  lastUpdate: number
  /** Current playback position in milliseconds. */
  playbackPosition: number
}
