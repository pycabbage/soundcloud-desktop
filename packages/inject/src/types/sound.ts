/**
 * SoundCloud System A — Sound model type definition
 *
 * Sound is a Backbone.Model subclass (via SC's internal BaseModel n(25)).
 * It is returned by PlayManager.getCurrentSound() and stored in QueueItem.sound.
 *
 * Mixins applied (in addition to Backbone.Model):
 *   - module 573: Source/Social (toggle, permalink, geo-blocking, etc.)
 *   - module 572: Visuals
 *   - module 324: Image/Artwork
 *   - module 1281: Monetization
 */

import type Backbone from "backbone"
import type { SoundEventMap } from "./events.js"
import type { AudioReporterEvent } from "./nativePlayer.js"

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/** Processing/lifecycle state of a track. */
export type SoundState = "processing" | "failed" | "finished" | "unknown"

/** Static state constants on the Sound class (module 54-8313710f.js). */
export interface SoundStates {
  readonly PROCESSING: "processing"
  readonly FAILED: "failed"
  readonly FINISHED: "finished"
  readonly UNKNOWN: "unknown"
}

/** Sharing visibility setting. */
export type SoundSharing = "public" | "private"

/** Track access type for follower-exclusive content. */
export type TrackShareAccess = "PRIVATE_FOLLOWS" | string

/**
 * Geoblocking entry — a region the track is blocked or allowed in.
 */
export interface GeoBlocking {
  type: "allow" | "block"
  countries: string[]
}

/**
 * The `sourceInfo` attached to a Sound when played from a collection.
 * Returned by getSourceInfo().
 */
export interface SourceInfo {
  [key: string]: unknown
}

/**
 * Visual (waveform/artwork animation) object.
 * Returned by getVisual().
 */
export interface Visual {
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// System A audio player (Sound.player — return value of r(344).createPlayer)
// ---------------------------------------------------------------------------

/**
 * Per-track audio player for System A (legacy SoundCloud player).
 * Created by r(344).createPlayer() and assigned to Sound.player.
 *
 * Note: this is NOT the same as SCAudioPlayer in nativePlayer.ts,
 * which is the System B (NativePlayer) per-track player.
 */
export interface SoundAPlayer {
  /** Begin or resume playback. */
  play(): Promise<void>
  /** Pause playback. */
  pause(): Promise<void>
  /** Fade out and pause over durationMs milliseconds. */
  pauseAfterFade(durationMs: number): Promise<void>
  /** Seek to an absolute position in milliseconds. */
  seek(position: number): void
  /** Destroy the player instance. */
  kill(): void
  /** Release the reference-counted player handle. */
  release(): void
  /** Enable audio preloading. */
  enablePreloading(): void
  /** Disable audio preloading. */
  disablePreloading(): void
  /** Returns true if audio is buffering. */
  isLoading(): boolean
  /** Returns true if audio is actively playing. */
  isPlaying(): boolean
  /** Returns true if playback has ended. */
  isEnded(): boolean
  /** Returns the current playback position in milliseconds. */
  getPosition(): number
  /** Returns the total duration in milliseconds, or null if not yet known. */
  getDuration(): number | null
  /** Returns the accumulated listen time in milliseconds. */
  getListenTime(): number
  /** Returns the current audio quality string (e.g. "sq"), or null. */
  getQuality(): string | null
  /** Returns the currently buffered time range, or null. */
  getCurrentBufferedTimeRange(): { end: number } | null
  /** Add an event listener. Returns a handle with a remove() method. */
  addEventListener(
    event: string,
    handler: (...args: unknown[]) => void
  ): { remove(): void }
}

// ---------------------------------------------------------------------------
// Playlist (Sound.playlist — module 66)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// VisualsCollection (Sound._visuals — module 779)
// ---------------------------------------------------------------------------

/**
 * Backbone Collection for waveform / artwork animation data (module 779).
 * Lazily created on the first "change:visuals" event on a Sound instance.
 */
export interface VisualsCollection {
  /** Timestamp (Date.now()) of the last fetch. */
  lastFetchTime: number
  /** Release the reference-counted collection handle. */
  release(): void
  /** Reset collection contents from raw API data. */
  reset(items: unknown[], opts?: { parse?: boolean }): void
}

// ---------------------------------------------------------------------------
// QueueMetadata (return type of Sound.getQueueMetadataAt)
// ---------------------------------------------------------------------------

/**
 * Metadata returned by Sound.getQueueMetadataAt(index).
 * Used by PlayManager when building QueueItem instances.
 */
export interface QueueMetadata {
  /** Source context metadata for analytics. */
  sourceInfo: SourceInfo
  /** Zero-based position within the originating query results. */
  queryPosition: number
  /** The original model (e.g. Sound, Playlist item). null if standalone. */
  originalModel: Sound | null
}

// ---------------------------------------------------------------------------
// Sound interface
// ---------------------------------------------------------------------------

/**
 * Sound — the core track model used by System A (PlayManager).
 *
 * Extends Backbone.Model (via SC's internal BaseModel n(25)) and has
 * Backbone.Events methods available through the prototype chain.
 *
 * The on/off/trigger overloads below provide type-safe event handling.
 * A string catch-all overload is included for Backbone compatibility.
 */
export interface Sound extends Backbone.Model {
  // -------------------------------------------------------------------------
  // Typed event overloads (SoundEventMap)
  // -------------------------------------------------------------------------

  on<K extends keyof SoundEventMap>(
    eventName: K,
    callback: SoundEventMap[K],
    context?: unknown
  ): this
  on(
    eventName: string,
    callback: (...args: unknown[]) => void,
    context?: unknown
  ): this
  on(eventMap: Backbone.EventMap, context?: unknown): this

  off<K extends keyof SoundEventMap>(
    eventName?: K,
    callback?: SoundEventMap[K],
    context?: unknown
  ): this
  off(
    eventName?: string,
    callback?: (...args: unknown[]) => void,
    context?: unknown
  ): this
  off(eventMap: Backbone.EventMap, context?: unknown): this

  trigger<K extends keyof SoundEventMap>(
    eventName: K,
    ...args: Parameters<SoundEventMap[K]>
  ): this
  trigger(eventName: string, ...args: unknown[]): this

  once<K extends keyof SoundEventMap>(
    eventName: K,
    callback: SoundEventMap[K],
    context?: unknown
  ): this
  once(
    eventName: string,
    callback: (...args: unknown[]) => void,
    context?: unknown
  ): this
  once(eventMap: Backbone.EventMap, context?: unknown): this

  listenTo<K extends keyof SoundEventMap>(
    obj: Sound,
    eventName: K,
    callback: SoundEventMap[K]
  ): this
  listenTo(
    obj: Backbone.Events,
    eventName: string,
    callback: (...args: unknown[]) => void
  ): this
  listenTo(obj: Backbone.Events, eventMap: Backbone.EventMap): this

  stopListening(
    obj?: Backbone.Events,
    eventName?: string,
    callback?: (...args: unknown[]) => void
  ): this
  stopListening(obj: Backbone.Events, eventMap: Backbone.EventMap): this

  // -------------------------------------------------------------------------
  // Core attributes (stored in Backbone.Model attributes)
  // -------------------------------------------------------------------------

  /** Track identifier. */
  id: number | string
  /** "sound" — fixed resource type string. */
  resource_type: "sound"
  /** URN prefix, always "soundcloud:tracks". */
  urnPrefix: string

  // -------------------------------------------------------------------------
  // Direct instance properties (not stored in Backbone.Model.attributes)
  // -------------------------------------------------------------------------

  /**
   * The underlying audio player instance (System A legacy player).
   * null until createPlayer() is called.
   * @see SoundAPlayer
   */
  player: SoundAPlayer | null

  /** Playlist this sound belongs to, or null. */
  playlist: SoundPlaylist | null

  /**
   * Original sound reference when this is a copy inside a playlist.
   * null for standalone sounds.
   */
  originalSound: Sound | null

  /**
   * Map of sub-model key → model class used by the SC BaseModel submodel system.
   * e.g. { user: UserModel }
   */
  submodelMap: Record<string, unknown>

  /**
   * Time offset applied to seek position (ms).
   * Used for clip/highlight playback.
   */
  timeOffset: number

  // ---- Private instance properties ----
  // Included for completeness; prefer public API methods over direct access.

  /** Internal visuals (waveform) collection. null until loaded. */
  _visuals: VisualsCollection | null
  /** Metadata from the last user action (play, pause, etc.). */
  _lastActionMetadata: Record<string, unknown>
  /** Whether this sound is currently marked as temporarily unavailable. */
  _temporarilyUnavailable: boolean
  /** Timer handle for clearing temporary unavailability. */
  _unavailableResetTimer: ReturnType<typeof setTimeout> | null
  /** Interval handle for playback checkpoint tracking. */
  _checkpointInterval: ReturnType<typeof setInterval> | undefined
  /** Cached playability state (isInteractive() && !isSnippetized()). */
  _playable: boolean
  /** Number of active preloading requests. Preloading enabled when > 0. */
  _preloadingCounter: number
  /** Computed display artist string. Cached value of getDisplayArtist(). */
  computed__displayArtist: string

  // -------------------------------------------------------------------------
  // Core playback methods
  // -------------------------------------------------------------------------

  /**
   * Request playback.
   * @param options.seek — start position in milliseconds.
   */
  play(options?: { seek?: number }): void

  /**
   * Pause playback.
   * @param options.pause_reason — optional reason string.
   */
  pause(options?: { pause_reason?: string }): void

  /**
   * Seek to an absolute position in milliseconds.
   */
  seek(position: number): void

  /**
   * Seek relative to current position in milliseconds.
   * Clamped to [0, duration].
   */
  seekRelative(offset: number): void

  /**
   * Toggle play/pause.
   */
  toggle(options?: { seek?: number; pause_reason?: string }): void

  // -------------------------------------------------------------------------
  // State queries
  // -------------------------------------------------------------------------

  /** Returns true if audio is currently buffering. */
  isBuffering(): boolean

  /** Returns true if the sound is currently playing. */
  isPlaying(): boolean

  /** Returns true if the sound is currently paused. */
  isPaused(): boolean

  /** Returns current playback position in milliseconds. */
  currentTime(): number

  /**
   * Buffering progress, 0–1.
   * (loaded bytes / total bytes)
   */
  loadProgress(): number

  /**
   * Playback progress, 0–1.
   * (currentTime / duration)
   */
  progress(): number

  /**
   * Track duration in milliseconds.
   * Uses full_duration if available, otherwise duration attribute.
   */
  duration(): number

  /**
   * Max of duration() and the media element's actual duration.
   */
  getFixedDuration(): number

  /**
   * Duration reported by the underlying media element,
   * or the duration attribute if not yet loaded.
   */
  getMediaDuration(): number

  /**
   * Total listen time accumulated for this session, in milliseconds.
   */
  getListenTime(): number

  /**
   * Returns the current audio quality string (e.g. "sq", "hq"),
   * or null if not available.
   */
  getQuality(): string | null

  /**
   * Returns true if the track is interactive (can be played by the user).
   * False when blocked, disabled, processing, or temporarily unavailable.
   */
  isInteractive(): boolean

  /**
   * Returns true if the track state is "processing".
   */
  isProcessing(): boolean

  /**
   * Returns true if the track state is "failed" or "unknown".
   */
  isProcessingFailed(): boolean

  /**
   * Returns true if the track is blocked by policy (policy === "BLOCK").
   */
  isBlocked(): boolean

  /**
   * Returns true if the track is snipped / preview-only (policy === "SNIP").
   */
  isSnippetized(): boolean

  /**
   * Returns true if the track has monetization policy === "MONETIZE".
   */
  isMonetized(): boolean

  /**
   * Returns true if the track is allowed (policy === "ALLOW").
   */
  isAllowed(): boolean

  /**
   * Returns true if the track is exclusive to followers
   * (trackShare.access === "PRIVATE_FOLLOWS").
   */
  isFollowerExclusive(): boolean

  /**
   * Returns true if the track is downloadable.
   */
  isDownloadable(): boolean

  /**
   * Returns true if this sound represents an advertisement.
   */
  isAd(): boolean

  /**
   * Returns true if the track is eligible for mastering.
   */
  isEligibleForMastering(): boolean

  /**
   * Returns true if the track has been mastered.
   */
  isMastered(): boolean

  /**
   * Returns true if the track is currently being edited.
   * Always false for Sound instances.
   */
  isEditing(): false

  /**
   * Returns true if comments are enabled for this track.
   */
  isCommentable(): boolean

  /**
   * Returns true if the track is disabled
   * (disabledReason !== "ENABLED" in System B terms).
   */
  isDisabled(): boolean

  /**
   * Returns true if the track is blacklisted.
   */
  isBlacklisted(): boolean

  /**
   * Returns true if the track owner is over quota.
   */
  isOverQuota(): boolean

  /**
   * Returns true if the track is playable.
   * Equivalent to isInteractive() && !isSnippetized().
   */
  isPlayable(): boolean

  /**
   * Returns true if the track is scheduled for future release.
   */
  isScheduled(): boolean

  /**
   * Returns true if offline sync is enabled for this track.
   */
  isOfflineSyncEnabled(): boolean

  /**
   * Returns true if the track is embeddable by all users.
   */
  isEmbeddableByAll(): boolean

  /**
   * Returns true if the track is managed by RSS feeds.
   */
  isManagedByFeeds(): boolean

  /**
   * Returns true if the track has accumulated at least 25% of its listen time.
   * Used for play-count tracking.
   */
  hasMinPlayTime(): boolean

  /**
   * Returns true if the track is currently the PlayManager's active sound.
   */
  isNowPlaying(): boolean

  /**
   * Returns true if this is the current sound (alias for isNowPlaying, container API).
   */
  getCurrentSound(): this

  // -------------------------------------------------------------------------
  // Geo-blocking (module 573)
  // -------------------------------------------------------------------------

  /** Returns true if the track is geo-blocked in the current region. */
  isGeoblocked(): boolean

  /**
   * Returns true if the track is geo-blocked in a specific country.
   * @param country — ISO 3166-1 alpha-2 country code.
   */
  isGeoblockedInCountry(country: string): boolean

  /** Returns list of countries the track is blocked in. */
  getBlockedCountries(): string[]

  /** Returns list of countries the track is available in. */
  getAvailableCountries(): string[]

  // -------------------------------------------------------------------------
  // Monetization (module 573 / 1281)
  // -------------------------------------------------------------------------

  /** Returns true if the track has a monetization policy. */
  hasMonetizationPolicy(): boolean

  /** Returns true if the track has monetization territories configured. */
  hasMonetizationTerritories(): boolean

  /** Returns the monetization territories object. */
  getMonetizationTerritories(): Record<string, unknown>

  /** Returns true if the track is monetizable. */
  isMonetizable(): boolean

  /** Returns true if the track has a monetization restriction. */
  hasMonetizationRestriction(): boolean

  /** Returns true if monetization is pending approval. */
  isPendingMonetization(): boolean

  /** Returns true if the track has worldwide monetization. */
  hasMonetizationWorldwide(): boolean

  // -------------------------------------------------------------------------
  // Metadata / computed fields
  // -------------------------------------------------------------------------

  /**
   * Returns the display artist string.
   * Prefers publisher_metadata.artist, falls back to user.username.
   */
  getDisplayArtist(): string

  /** Returns the track's computed URN, e.g. "soundcloud:tracks:123". */
  getUrn(): string

  /** Returns true if sharing is set to "private". */
  isPrivate(): boolean

  /** Returns true if sharing is set to "public". */
  isPublic(): boolean

  /** Returns the track's permalink URL string. */
  getPermalink(): string

  /**
   * Returns a shareable URL for the track.
   * @param options.secretToken — include secret token for private tracks.
   */
  getShareURL(options?: { secretToken?: string }): string

  /** Resets the secret link, generating a new secret token. */
  resetSecretLink(): void

  /** Returns source info metadata (context-dependent). */
  getSourceInfo(): SourceInfo

  // -------------------------------------------------------------------------
  // Container API (Sound acts as a single-item collection)
  // -------------------------------------------------------------------------

  /** Returns [this] — treats the sound as a one-element collection. */
  getSounds(): [this]

  /** Returns 1 — always one sound in a Sound instance. */
  getNumSounds(): 1

  /**
   * Returns 0 if this is the given sound, -1 otherwise.
   */
  getSoundIndex(sound: Sound): 0 | -1

  /** Returns true if this === sound. */
  containsSound(sound: Sound): boolean

  /**
   * Returns metadata for the queue at the given index.
   * Delegates to the containing collection if present.
   */
  getQueueMetadataAt(index: number): QueueMetadata

  // -------------------------------------------------------------------------
  // Player management
  // -------------------------------------------------------------------------

  /**
   * Creates the underlying audio player if it doesn't exist yet.
   * Wires player events to Backbone triggers.
   * Returns true if a new player was created.
   */
  createPlayer(): boolean

  /**
   * Increment the preloading request counter.
   * Enables audio preloading when counter > 0.
   */
  requestPreloading(): void

  /**
   * Decrement the preloading request counter.
   * Disables audio preloading when counter reaches 0.
   */
  unrequestPreloading(): void

  /**
   * Kill and release the underlying audio player.
   * Called automatically when the sound is cleaned up.
   */
  disposePlayer(): void

  /**
   * Mark the sound as temporarily unavailable (e.g. after a fatal error).
   * Unavailability lasts for 30 seconds.
   */
  makeTemporarilyUnavailable(): void

  /**
   * Called internally after the first playStart event.
   * Triggers play-count registration logic.
   */
  onPlayRegistered(): void

  // -------------------------------------------------------------------------
  // Image / Artwork mixin (module 324)
  // -------------------------------------------------------------------------

  /** Returns the URL for saving/updating the track image. */
  getImageSaveUrl(): string

  /**
   * Returns the artwork URL at the requested size.
   * @param size — e.g. "large", "t500x500".
   */
  getImageUrl(size?: string): string

  /** Returns true if the track has a custom (owner-uploaded) image. */
  hasOwnImage(): boolean

  /** Returns true if a new image has been set but not yet saved. */
  hasNewImage(): boolean

  /** Returns the placeholder (generated) artwork URL for the given size. */
  getPlaceholderUrl(size?: string): string

  /** Returns file metadata for the current image. */
  getImageFileInfo(): Record<string, unknown>

  /** Attach a local image file for upload. */
  setImageFile(file: File, options?: Record<string, unknown>): void

  /** Remove the local image file reference. */
  unsetImageFile(options?: Record<string, unknown>): void

  /** Remove any data-URI image preview. */
  unsetImageDataURI(): void

  /** Upload a base64-encoded image. */
  uploadBase64Image(base64: string): void

  /** Upload the currently attached image file. */
  uploadImage(): void

  /** Returns true if the current user can delete the image. */
  canDeleteImage(): boolean

  /** Delete the track image. */
  deleteImage(): void

  // -------------------------------------------------------------------------
  // Visuals mixin (module 572)
  // -------------------------------------------------------------------------

  /**
   * Returns the visual (waveform/cover animation) object, or null.
   */
  getVisual(): Visual | null

  /**
   * Returns the URL of the visual, or null.
   */
  getVisualURL(): string | null

  /** Returns true if this track has associated visuals. */
  hasVisuals(): boolean

  // -------------------------------------------------------------------------
  // Additional core methods
  // -------------------------------------------------------------------------

  /**
   * Constructor-like initializer (Backbone.Model pattern).
   * Called with raw API attribute data and model options.
   */
  setup(attrs: Record<string, unknown>, options?: Record<string, unknown>): void

  /**
   * Returns sub-model constructor options for the given key.
   * Used by the SC BaseModel submodel system.
   */
  getSubmodelOptions(key: string): Record<string, unknown>

  /**
   * Returns the API URL for the track owner (user).
   */
  ownerUrl(): string

  /**
   * Extracts and returns the secret token from raw API response data.
   */
  extractSecretToken(data: Record<string, unknown>): string

  /**
   * Track an audio event for analytics.
   * Bound as the audioReporter callback on the underlying SoundAPlayer.
   * @param event — the player event object to report.
   */
  trackAudioEvent(event: AudioReporterEvent): void

  /**
   * Returns the original Sound instance.
   * For playlist copies, returns the source sound; otherwise returns this.
   */
  getOriginalSound(): Sound

  /**
   * Handle a like action on this sound.
   * Updates "likes_count" by ±1 based on event.state.
   */
  onLike(event: { state: boolean }): void

  /**
   * Handle a repost action on this sound.
   * Updates "reposts_count" by ±1 based on event.state.
   */
  onRepost(event: { state: boolean }): void

  /**
   * Handle a comment action on this sound.
   * Updates "comment_count" by ±1 based on event.state.
   */
  onComment(event: { state: boolean }): void

  // -------------------------------------------------------------------------
  // Static members (not expressible in TypeScript interface)
  // The Sound class has the following static members on its constructor:
  //   Sound.hashFn(data): number | null
  //     — Normalizes resource_id objects (playlist_id, system_playlist_id, ad_target_id)
  //       to a numeric id. Returns null for unrecognized shapes.
  //   Sound.resolve(username: string, permalink: string, options?): Sound
  //     — Fetch or retrieve a Sound by user/permalink from the API.
  //   Sound.normalize(data: object): object
  //     — Normalizes raw API data (e.g. fixes waveform_url: w1 → wis domain).
  //   Sound.onCleanup(instance: Sound): void
  //     — Called by the instance cache when reference count hits zero.
  //       Releases visuals collection and disposes the player.
  //   Sound.states: SoundStates
  //     — { PROCESSING: "processing", FAILED: "failed", FINISHED: "finished", UNKNOWN: "unknown" }
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Model persistence (Backbone.Model overrides)
  // -------------------------------------------------------------------------

  /** Parse and normalize API response data. */
  parse(data: Record<string, unknown>): Record<string, unknown>

  /** Serialize attributes for API submission. */
  toJSON(): Record<string, unknown>

  /** Returns the subset of attributes to be saved to the API. */
  getAttributesToBeSaved(): Record<string, unknown>

  /** Returns the base API URL for this sound. */
  baseUrl(): string

  /** Returns the API URL for save operations. */
  saveUrl(): string

  /** Returns the API endpoint for the given HTTP method. */
  getEndpointForMethod(method: string): string

  /** Returns the URL for this resource (Backbone.Model.url override). */
  url(): string
}
