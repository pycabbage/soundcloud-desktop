/**
 * SoundCloud System B — NativePlayer
 *
 * Module 83585 exports a singleton (A) that is either:
 *   - NativePlayer  — on normal soundcloud.com pages (window.self === window.top)
 *   - V2BridgePlayer — inside the embedded V2 iframe (window.self !== window.top)
 *
 * Both classes implement the IPlayer interface.
 */

import type { AudioErrorReporterEvent } from "./audioErrorReporterEvent.js"
import type { AudioPerformanceReporterEvent } from "./audioPerformanceReporterEvent.js"
import type { AudioReporterEvent } from "./audioReporterEvent.js"
import type { IPlayer } from "./iPlayer.js"
import type { PlayerOptions } from "./playerOptions.js"
import type { Queue } from "./queue.js"
import type { SCAudioPlayer } from "./scAudioPlayer.js"
import type { Track } from "./track.js"
import type { RepeatModeB } from "./utils.js"

/**
 * NativePlayer class — used on normal soundcloud.com pages.
 *
 * Implements IPlayer with additional internal state and methods.
 * One SCAudioPlayer instance is maintained per track URN in this.players.
 * Playback state changes are broadcast to subscribers via notifySubscribers().
 */
export interface NativePlayer extends IPlayer {
  // ---- Static ----
  /** Duration (ms) a track remains in the unavailable set after a fatal error. */
  readonly UNAVAILABILITY_TIME_MS: 30000

  // ---- Instance properties ----
  /** Set of subscriber callbacks. */
  readonly subscribers: Set<() => void>
  /** Map from track URN to SCAudioPlayer instance. */
  readonly players: Map<string, SCAudioPlayer>
  /** Set of track URNs currently marked as temporarily unavailable. */
  readonly unavailableTracks: Set<string>
  /** The track queue. */
  readonly queue: Queue
  /** Constructor options. */
  readonly playerOptions: PlayerOptions
  /** Current repeat mode. */
  repeatMode: RepeatModeB
  /** Whether auth token refresh is enabled. */
  refreshTokenEnabled: boolean
  /** Auth token for stream URL requests. */
  authToken: string | undefined
  /** Supported DRM protocol identifiers. */
  supportedDrmProtocols: string[] | undefined
  /** Audio analytics reporter. */
  audioReporter: ((event: AudioReporterEvent) => void) | undefined
  /** Audio performance analytics reporter. */
  audioPerformanceReporter:
    | ((event: AudioPerformanceReporterEvent) => void)
    | undefined
  /** Audio error analytics reporter. */
  audioErrorReporter: ((event: AudioErrorReporterEvent) => void) | undefined

  // ---- NativePlayer-only methods ----

  /**
   * Set the repeat mode.
   * "repeat_one" causes the track to restart on end.
   * "repeat_none" causes playNext() to be called on end.
   */
  setRepeatMode(mode: RepeatModeB): void

  /**
   * Pre-create player instances for the given tracks without starting playback.
   * Improves first-play latency.
   */
  preloadPlayersForTracks(tracks: Track[]): void

  /**
   * Kill player instances for tracks that are not currently playing.
   * Used to free resources when the queue changes.
   */
  cleanPlayersForTracks(tracks: Track[]): void

  /**
   * Returns true if the given track (or current track) has ended.
   */
  isTrackEnded(track?: Track): boolean

  /**
   * Get the SCAudioPlayer for the current track.
   * @param createIfMissing — if true, create the player if it doesn't exist.
   */
  getCurrentPlayer(createIfMissing?: boolean): SCAudioPlayer | null

  /**
   * Get the SCAudioPlayer for a specific track.
   * @param track — the track to look up.
   * @param createIfMissing — if true, create the player if it doesn't exist.
   */
  getPlayer(track: Track, createIfMissing?: boolean): SCAudioPlayer | null

  /**
   * Prepare for a track change by killing the current player
   * if the new track's URN differs from the current track's URN.
   */
  prepareCurrentTrackChange(newTrack: Track): void

  /**
   * Mark a track as temporarily unavailable for 30 seconds.
   * Called after a fatal playback error.
   */
  makeTrackUnavailable(track: Track): void

  /**
   * Call all subscriber callbacks.
   */
  notifySubscribers(): void

  /**
   * Subscribe to player state changes for a specific track.
   * Called internally when a new player is created for a track.
   */
  notifySubscribersOnPlayerChange(track: Track): void

  /**
   * Start a requestAnimationFrame loop that calls notifySubscribers()
   * on each frame while the track is actively playing.
   * Stops automatically when actuallyPlaying becomes false.
   */
  notifySubscribersOnFrame(track: Track): void

  /**
   * Subscribe to player.onEnded for a track.
   * On end: if repeat_one → seek(0); otherwise → pause() + playNext().
   */
  handleTrackEnd(track: Track): void

  /**
   * Subscribe to player.onChange for a track.
   * When dead === true, removes the player from the Map.
   * If fatalError is set, calls makeTrackUnavailable(track).
   */
  handlePlayerDeath(track: Track): void
}
