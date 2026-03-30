import type { SoundUserBadges } from "./soundUserBadges.js"

/**
 * User sub-object embedded in Sound.attributes — System A (REST API).
 * Distinct from `TrackUser` in trackUser.ts (System B / GraphQL).
 */
export interface SoundUser {
  id: number
  kind: "user"
  avatar_url: string | null
  first_name: string
  last_name: string
  full_name: string
  permalink: string
  permalink_url: string
  uri: string
  urn: string
  username: string
  verified: boolean
  city: string | null
  country_code: string | null
  followers_count: number
  last_modified: string
  badges: SoundUserBadges
  station_urn: string
  station_permalink: string
}
