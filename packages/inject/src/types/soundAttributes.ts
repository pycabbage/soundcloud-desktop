import type { SoundMedia } from "./soundMedia.js"
import type { SoundPublisherMetadata } from "./soundPublisherMetadata.js"
import type { SoundUser } from "./soundUser.js"
import type { SoundSharing, SoundState } from "./utils.js"
import type { Visual } from "./visual.js"

/**
 * Shape of the Sound Backbone model's `attributes` object.
 *
 * Sourced from:
 *   - Runtime: `JSON.stringify(payload.current.attributes)` captured from the
 *     `change:currentSound` event.
 *   - Static: Sound model definition in `54-8313710f.js`
 *     (`resource_type: "sound"`, serialisation field list, mixin list).
 *
 * Pass this as the generic parameter to `Backbone.Model<SoundAttributes>` so
 * that `sound.get("title")` resolves to `string | undefined`, etc.
 */
export interface SoundAttributes {
  id: number
  kind: "track"
  monetization_model: string
  /** Playback policy: "ALLOW", "BLOCK", or "SNIP". */
  policy: string
  artwork_url: string | null
  caption: string | null
  commentable: boolean
  comment_count: number
  /** ISO 8601 creation timestamp. */
  created_at: string
  description: string | null
  /** ISO 8601 display date (may differ from created_at for scheduled releases). */
  display_date: string
  downloadable: boolean
  download_count: number
  /** Track duration in milliseconds (may be slightly shorter than full_duration). */
  duration: number
  /** Who can embed the track: "all", "me", or "none". */
  embeddable_by: string
  /** True full duration in milliseconds. */
  full_duration: number
  genre: string | null
  has_downloads_left: boolean
  label_name: string | null
  /** ISO 8601 timestamp of the last metadata modification. */
  last_modified: string
  license: string
  likes_count: number
  media: SoundMedia
  permalink: string
  permalink_url: string
  playback_count: number
  public: boolean
  publisher_metadata: SoundPublisherMetadata | null
  purchase_title: string | null
  purchase_url: string | null
  release_date: string | null
  reposts_count: number
  secret_token: string | null
  sharing: SoundSharing
  state: SoundState
  station_permalink: string
  station_urn: string
  streamable: boolean
  tag_list: string
  title: string
  track_authorization: string | null
  uri: string
  urn: string
  user: SoundUser
  user_id: number
  visuals: Visual[] | null
  waveform_url: string | null
}
