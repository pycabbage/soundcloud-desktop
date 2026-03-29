/**
 * SoundCloud System B — NativePlayer, V2BridgePlayer, Queue, and related types
 *
 * Module 83585 exports a singleton (A) that is either:
 *   - NativePlayer  — on normal soundcloud.com pages (window.self === window.top)
 *   - V2BridgePlayer — inside the embedded V2 iframe (window.self !== window.top)
 *
 * Both classes implement the IPlayer interface.
 * RepeatMode values differ from System A: "repeat_none" | "repeat_one".
 */

import type { Track, V2PlaybackState, WebiToV2Message } from "./track.js"

// ---------------------------------------------------------------------------
// Audio reporter event types (module 95 — Player event generators)
// ---------------------------------------------------------------------------

/**
 * Event object passed to the audioReporter callback.
 * Fired on "play", "pause", and periodic "checkpoint" events
 * by the AudioEventGenerator inside the Player.
 */
export interface AudioReporterEvent {
  /** Event type. */
  type: "play" | "pause" | "checkpoint"
  /** Current playhead position in milliseconds. */
  position: number
  /** Track duration in milliseconds. */
  duration: number
  /** Stream preset identifier, e.g. "mp3_0_1". */
  preset: string
  /** Quality level, e.g. "sq" or "hq". */
  quality: string
  /** Player type name, e.g. "HLS" or "Progressive". */
  playerType: string
  /** Application state string. */
  appState: string
}

/**
 * Event object passed to the audioPerformanceReporter callback.
 * Fired on play latency, seek, rebuffering, and other performance events
 * by the AudioPerformanceEventGenerator inside the Player.
 */
export interface AudioPerformanceReporterEvent {
  /** Performance event type. */
  type:
    | "play"
    | "seek"
    | "seekStart"
    | "rebufferingStart"
    | "rebufferingEnd"
    | "rageSkip"
    | "longInitialBuffering"
    | "uninterruptedPlay"
  /** Measured latency in milliseconds. */
  latency: number
  /** Streaming protocol, e.g. "hls". */
  protocol: string
  /** Player type name. */
  playerType: string
  /** Stream host domain. */
  host: string
  /** Bitrate in kbps. */
  bitrate: number
  /** Stream format string. */
  format: string
  /** Stream preset identifier. */
  preset: string
  /** Quality level. */
  quality: string
  /** Preloaded data, if any. */
  preloaded: unknown
  /** Application state string. */
  appState: string
}

/**
 * Event object passed to the audioErrorReporter callback.
 * Fired on fatal playback errors by the ErrorEventGenerator inside the Player.
 */
export interface AudioErrorReporterEvent {
  /** Error code string from PlayerFatalError.getCode(). */
  errorCode: string
  /** Collected log data. */
  log: unknown
  /** Random 20-character log session identifier. */
  logId: string
  /** Track identifier. */
  trackId: unknown
  /** Streaming protocol, or undefined if not yet known. */
  protocol: string | undefined
  /** Player type name. Defaults to "MaestroUnknown" if not available. */
  playerType: string
  /** Stream host domain, or undefined. */
  host: string | undefined
  /** Bitrate in kbps, or undefined. */
  bitrate: number | undefined
  /** Stream format string, or undefined. */
  format: string | undefined
  /** Stream preset identifier, or undefined. */
  preset: string | undefined
  /** Quality level, or undefined. */
  quality: string | undefined
  /** Stream URL, or undefined. */
  url: string | undefined
  /** Application state string. */
  appState: string
}

// ---------------------------------------------------------------------------
// RepeatMode (System B)
// ---------------------------------------------------------------------------

/**
 * Repeat mode values for System B (NativePlayer / V2BridgePlayer).
 * Note: "repeat_all" is intentionally absent — it is not implemented.
 */
export type RepeatModeB = "repeat_none" | "repeat_one"

// ---------------------------------------------------------------------------
// SCAudio Player interface (module 95936 / createPlayer factory)
// ---------------------------------------------------------------------------

/**
 * Change event payload emitted on SCAudioPlayer.onChange.
 */
export interface PlayerChangeEvent {
  actuallyPlaying?: boolean
  playing?: boolean
  seek?: boolean
  seeking?: boolean
  stalled?: boolean
  ended?: boolean
  dead?: boolean
  /** Fatal error object with a getCode() method, or null when cleared. */
  fatalError?: { getCode(): string } | null
  positionJumped?: boolean
}

/**
 * RxJS-style observable signal used by SCAudioPlayer.
 * subscribe() returns a disposable handle.
 */
export interface Signal<T> {
  subscribe(callback: (value: T) => void): { remove(): void }
}

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

// ---------------------------------------------------------------------------
// PlayerOptions
// ---------------------------------------------------------------------------

/** Options passed to the NativePlayer constructor. */
export interface PlayerOptions {
  /** Force snippet (preview) playback even for full-access tracks. */
  forceSnippet?: boolean
}

// ---------------------------------------------------------------------------
// Queue class (module 83585 — internal to NativePlayer)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// IPlayer — shared interface
// ---------------------------------------------------------------------------

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
  setAudioPerformanceReporter(
    reporter: (event: AudioPerformanceReporterEvent) => void
  ): void

  /** Set the audio error analytics reporter. */
  setAudioErrorReporter(
    reporter: (event: AudioErrorReporterEvent) => void
  ): void

  /** Enable or disable auth token refresh. */
  setRefreshTokenEnabled(enabled: boolean): void

  /** Set the list of supported DRM protocol identifiers. */
  setSupportedDrmProtocols(protocols: string[]): void
}

// ---------------------------------------------------------------------------
// NativePlayer
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// V2BridgePlayer
// ---------------------------------------------------------------------------

/**
 * V2BridgePlayer class — used inside the embedded V2 iframe.
 *
 * Delegates playback operations to the parent window (System A) via postMessage.
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

// ---------------------------------------------------------------------------
// Module 83585 singleton type
// ---------------------------------------------------------------------------

/**
 * The type of the singleton exported as module 83585's `A` property.
 *
 * On normal soundcloud.com pages: NativePlayer
 * Inside the V2 iframe: V2BridgePlayer
 */
export type PlayerSingleton = NativePlayer | V2BridgePlayer

// ---------------------------------------------------------------------------
// V2Bridge class (module 29637)
// ---------------------------------------------------------------------------

/**
 * V2Bridge — manages the postMessage channel between the Webi (new UI)
 * host window and the V2 (old UI) embedded iframe.
 *
 * Used internally by V2BridgePlayer to send control messages to System A.
 */
export interface V2Bridge {
  /** Trusted origins for postMessage communication. */
  readonly TRUSTED_V2_ORIGINS: readonly string[]

  /**
   * Initialize the bridge.
   * Only effective when window.self !== window.top (inside the V2 iframe).
   * Attaches the "message" event listener.
   */
  initialize(webiEmbedId: string): void

  /** Remove the "message" event listener. */
  teardown(): void

  /**
   * Send a message to the parent V2 window.
   */
  sendMessageToV2(message: object): Promise<void>

  /**
   * Navigate within V2.
   * @param href — target URL.
   * @param openInNewTab — open in a new browser tab.
   * @param hard — perform a hard (full-page) navigation.
   */
  navigateInV2(
    href: string,
    openInNewTab?: boolean,
    hard?: boolean
  ): Promise<void>

  /**
   * Signal that the Webi embed is ready.
   * Sends { kind: "ready" } once.
   */
  markAsReady(): Promise<void>

  /** Returns the webi embed ID Promise. */
  getWebiEmbedId(): Promise<string>

  /** Add a handler for incoming V2 messages. */
  addMessageHandler(handler: (data: WebiToV2Message) => void): void

  /** Remove a previously registered V2 message handler. */
  removeMessageHandler(handler: (data: WebiToV2Message) => void): void

  /** Returns true if the given MessageEvent origin is trusted. */
  isEventOriginTrusted(event: MessageEvent): boolean
}
