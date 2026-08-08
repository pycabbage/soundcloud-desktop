/**
 * SoundCloud System B — Track
 *
 * These types are used by NativePlayer and V2BridgePlayer (module 83585).
 * Derived from GraphQL fragments (SCAudioTrack, MiniPlayerTrack) and
 * the "set-current-track" V2 bridge message schema in the HAR file.
 */

import type { Authorization } from "./authorization.js"
import type { TrackUser } from "./trackUser.js"
import type { Transcoding } from "./transcoding.js"
import type { DisabledReason } from "./utils.js"

/**
 * Track object returned by NativePlayer.getCurrentTrack() and
 * stored in Queue.tracks[].
 *
 * Assembled from the SCAudioTrack, SCAudioTrackWithoutUser,
 * MiniPlayerTrack, and MiniPlayerTrackWithoutUser GraphQL fragments,
 * plus the "set-current-track" V2 bridge message schema.
 *
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
