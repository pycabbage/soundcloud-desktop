import type { Track } from "./track.js"

/**
 * Simple ordered track queue used by NativePlayer.
 * Not related to System A's PlayQueue (which is a Backbone.Collection).
 */
export interface Queue {
  /** Ordered array of Track objects. */
  tracks: Track[]
  /** Index of the currently active track. */
  index: number

  /**
   * Replace the queue contents.
   * @param tracks — new track list.
   * @param startIndex — initial cursor position. Defaults to 0.
   */
  setTracks(tracks: Track[], startIndex?: number): void

  /**
   * Returns a copy of the tracks array.
   */
  getTracks(): Track[]

  /**
   * Returns the track at the current index, or null if empty.
   */
  getCurrentTrack(): Track | null

  /**
   * Returns the track at index - 1, or null if at the start.
   */
  getPreviousTrack(): Track | null

  /**
   * Returns the track at index + 1, or null if at the end.
   */
  getNextTrack(): Track | null

  /**
   * Decrement the index by 1 (if a previous track exists).
   */
  back(): void

  /**
   * Increment the index by 1 (if a next track exists).
   */
  forward(): void
}
