import type { PlayerChangeEvent } from "./playerChangeEvent.js"
import type { Signal } from "./signal.js"

/**
 * Internal audio player object created by createPlayer() (module 95936).
 * One instance is maintained per track URN inside NativePlayer.players Map.
 */
export interface SCAudioPlayer {
  // ---- Lifecycle ----
  /** Begin or resume playback. */
  play(): Promise<void>
  /** Pause playback. */
  pause(): Promise<void>
  /**
   * Seek to the given position.
   * @param time — target position in milliseconds.
   */
  seek(time: number): Promise<void>
  /** Destroy the player and release all resources. */
  kill(): void

  // ---- State queries ----
  /** Returns true if audio is actively playing. */
  isPlaying(): boolean
  /** Returns true if audio is buffering/loading. */
  isLoading(): boolean
  /** Returns true if playback has reached the end. */
  isEnded(): boolean
  /** Returns true if the player has been killed. */
  isDead(): boolean
  /** Returns the current playback position in milliseconds. */
  getPosition(): number
  /** Returns the total duration in milliseconds. */
  getDuration(): number

  // ---- Event signals ----
  /** Emits on any state change. */
  onChange: Signal<PlayerChangeEvent>
  /** Emits when playback ends naturally. */
  onEnded: Signal<void>
  /** Emits when playback starts. */
  onPlay: Signal<void>
  /** Emits when playback pauses. */
  onPause: Signal<void>
  /** Emits on a fatal playback error. */
  onError: Signal<Error>
}
