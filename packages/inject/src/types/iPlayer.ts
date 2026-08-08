import type { AudioErrorReporterEvent } from "./audioErrorReporterEvent.js"
import type { AudioPerformanceReporterEvent } from "./audioPerformanceReporterEvent.js"
import type { AudioReporterEvent } from "./audioReporterEvent.js"
import type { Track } from "./track.js"

/**
 * Public interface implemented by both NativePlayer and V2BridgePlayer.
 *
 * This is the stable API surface available on the module 83585 singleton (A).
 * NativePlayer has additional methods beyond this interface.
 */
export interface IPlayer {
  // ---- Subscription ----
  /**
   * Subscribe to state change notifications.
   * The callback is called whenever any playback state changes.
   * @returns An unsubscribe function.
   */
  subscribe(callback: () => void): () => void

  // ---- Playback ----
  /**
   * Load tracks into the queue and begin playback.
   * @param tracks — the ordered track list.
   * @param startUrn — URN of the track to start from. Defaults to first.
   */
  playTracks(tracks: Track[], startUrn?: string): Promise<void>

  /** Advance to the next track in the queue. */
  playNext(): Promise<void>

  /** Resume or start playback of the current track. */
  play(): Promise<void>

  /** Pause playback of the current track. */
  pause(): Promise<void>

  /**
   * Seek to the given position in the current track.
   * @param time — target position in milliseconds.
   */
  seek(time: number): Promise<void>

  // ---- State queries ----
  /**
   * Returns the elapsed playback time in milliseconds.
   * @param track — if provided, returns elapsed time for that specific track.
   */
  getElapsedTime(track?: Track): number

  /**
   * Returns the total duration of the given track in milliseconds.
   * Falls back to track.fullDuration if the player is not ready.
   * @param track — if provided, returns duration for that specific track.
   */
  getDuration(track?: Track): number

  /**
   * Returns the currently active track, or null if the queue is empty.
   */
  getCurrentTrack(): Track | null

  /**
   * Returns true if the given track (or current track) is playable.
   * Checks for live transcodings, disabled state, and blocked status.
   */
  isTrackPlayable(track?: Track): boolean

  /** Alias for isTrackPlayable() with no arguments. */
  isAudioPlayable(): boolean

  /**
   * Returns true if the given track (or current track) is playing.
   */
  isTrackPlaying(track?: Track): boolean

  /** Alias for isTrackPlaying() with no arguments. */
  isAudioPlaying(): boolean

  /**
   * Returns true if the given track (or current track) is loading/buffering.
   */
  isTrackLoading(track?: Track): boolean

  /** Alias for isTrackLoading() with no arguments. */
  isAudioLoading(): boolean

  /**
   * Returns true if the given track's URN is in the temporarily-unavailable set.
   * Tracks are marked unavailable for 30 seconds after a fatal error.
   */
  isTrackTemporarilyUnavailable(track?: Track): boolean

  // ---- Volume ----
  /** Returns the current volume level (0–1). */
  getVolume(): number

  /**
   * Set the volume level.
   * @param volume — target volume, 0–1.
   */
  setVolume(volume: number): void | Promise<void>

  /** Returns true if audio is muted. */
  isMuted(): boolean

  /**
   * Set the muted state.
   * @param muted — true to mute, false to unmute.
   */
  setMuted(muted: boolean): void | Promise<void>

  // ---- Configuration ----
  /** Set the auth token for stream URL requests. */
  setAuthToken(token: string): void

  /** Set the audio analytics reporter. */
  setAudioReporter(reporter: (event: AudioReporterEvent) => void): void

  /** Set the audio performance analytics reporter. */
  setAudioPerformanceReporter(reporter: (event: AudioPerformanceReporterEvent) => void): void

  /** Set the audio error analytics reporter. */
  setAudioErrorReporter(reporter: (event: AudioErrorReporterEvent) => void): void

  /** Enable or disable auth token refresh. */
  setRefreshTokenEnabled(enabled: boolean): void

  /** Set the list of supported DRM protocol identifiers. */
  setSupportedDrmProtocols(protocols: string[]): void
}
