/**
 * Enum-like union types shared across System A and System B,
 * plus track utility function type signatures (module 23844).
 */

// ---------------------------------------------------------------------------
// System A — RepeatMode
// Source: module 91 in 55-ef1f6ed4.js
// ---------------------------------------------------------------------------

/** Repeat mode values for System A (PlayManager). */
export type RepeatMode = "all" | "none" | "one"

// ---------------------------------------------------------------------------
// System B — RepeatMode
// ---------------------------------------------------------------------------

/**
 * Repeat mode values for System B (NativePlayer / V2BridgePlayer).
 * Note: "repeat_all" is intentionally absent — it is not implemented.
 */
export type RepeatModeB = "repeat_none" | "repeat_one"

// ---------------------------------------------------------------------------
// Sound state
// ---------------------------------------------------------------------------

/** Processing/lifecycle state of a track. */
export type SoundState = "processing" | "failed" | "finished" | "unknown"

/** Sharing visibility setting. */
export type SoundSharing = "public" | "private"

/** Track access type for follower-exclusive content. */
export type TrackShareAccess = "PRIVATE_FOLLOWS" | string

// ---------------------------------------------------------------------------
// Track — DisabledReason
// ---------------------------------------------------------------------------

/** Reason a track is disabled. Sourced from module 23844 usage. */
export type DisabledReason = "BLACKLISTED" | "ENABLED" | "OVERQUOTA" | "UNKNOWN"

// ---------------------------------------------------------------------------
// Track utility function type signatures (module 23844)
// ---------------------------------------------------------------------------

import type { Track } from "./track.js"

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
