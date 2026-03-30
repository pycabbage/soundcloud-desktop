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
