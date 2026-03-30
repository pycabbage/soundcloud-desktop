import type { Sound } from "./sound.js"

/**
 * Minimal interface for the Backbone Playlist model (module 66).
 * Assigned to Sound.playlist when a sound belongs to a playlist context.
 */
export interface SoundPlaylist {
  /** "playlist" — fixed resource type. */
  readonly resource_type: "playlist"
  /** Numeric playlist identifier. */
  id: number
  /** Read a Backbone model attribute by key. */
  get(key: string): unknown
  /** Returns the playlist's URN string. */
  getUrn(): string
  /** Returns the shareable permalink URL. */
  getShareURL(): string
  /** Returns the zero-based index of the given sound in the playlist. */
  getSoundIndex(sound: Sound): number
}
