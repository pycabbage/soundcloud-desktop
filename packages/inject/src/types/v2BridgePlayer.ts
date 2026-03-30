/**
 * SoundCloud System B — V2BridgePlayer
 *
 * Used inside the embedded V2 iframe (window.self !== window.top).
 * Delegates playback operations to the parent window (System A) via postMessage.
 */

import type { IPlayer } from "./iPlayer.js"
import type { Track } from "./track.js"
import type { V2PlaybackState } from "./v2PlaybackState.js"

/**
 * V2BridgePlayer class — used inside the embedded V2 iframe.
 *
 * Receives state updates via "set-current-track" and "sync-playback-state" messages.
 * Implements the same IPlayer interface as NativePlayer.
 */
export interface V2BridgePlayer extends IPlayer {
  // ---- Static ----
  /** Duration (ms) a track remains in the unavailable set. */
  readonly UNAVAILABILITY_TIME_MS: 30000

  // ---- Instance properties ----
  /** Set of subscriber callbacks. */
  readonly subscribers: Set<() => void>
  /** Set of track URNs currently marked as temporarily unavailable. */
  readonly unavailableTracks: Set<string>
  /** Playback state synced from V2 via postMessage. */
  v2PlaybackState: V2PlaybackState
  /** The current track set by V2 via "set-current-track". */
  currentTrack: Track | null
  /** requestAnimationFrame handle for the frame loop. */
  frame: number | null

  // ---- V2BridgePlayer-only methods ----

  /**
   * Update the playback state received from V2.
   * Notifies subscribers and starts/stops the frame loop as needed.
   */
  syncV2PlaybackState(state: V2PlaybackState): void

  /**
   * Set the current track received from V2.
   * Notifies subscribers.
   */
  setCurrentTrack(track: Track): void

  /**
   * Optimistically update the playback position (e.g. after seek).
   */
  doOptimisticUpdateForPlaybackPosition(time: number): void

  /**
   * Call all subscriber callbacks.
   */
  notifySubscribers(): void

  /**
   * Start/stop the requestAnimationFrame loop based on v2PlaybackState.isPlaying.
   * Calls notifySubscribers() on each frame while playing.
   * Unlike NativePlayer's version, takes no arguments.
   */
  notifySubscribersOnFrame(): void
}
