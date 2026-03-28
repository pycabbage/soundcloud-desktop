/**
 * SoundCloud System A — PlayManager, QueueItem, PlayQueue type definitions
 *
 * PlayManager (module 21) is a plain object with Backbone.Events mixed in.
 * It is produced by the factory in module 753 via: n(1).assign({}, n(45).Events, {...})
 *
 * QueueItem (module 182) extends Backbone.Model (via SC BaseModel n(25)).
 * PlayQueue (module 1243) extends Backbone.Collection<QueueItem> (via SC BaseCollection n(54)).
 */

import type { PlayManagerEventMap, RepeatMode, UiComponent } from "./events.js"
import type { Sound } from "./sound.js"

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/**
 * PlayManager factory configuration options.
 * Passed to the module 753 factory function.
 */
export interface PlayManagerConfig {
  /** How many items ahead/behind the cursor to prefetch. Default: 20. */
  prefetchDistance?: number
  /**
   * Delay in ms before auto-advancing after a geo-blocked error.
   * Default: 2500.
   */
  playNextOnErrorDelay?: number
  /**
   * If currentTime (ms) exceeds this threshold when "playPrev" is called,
   * the track rewinds to 0 instead of going to the previous item.
   * Default: 5000.
   */
  rewindThreshold?: number
  /** Size of the random shuffle buffer. Default: 100. */
  randomBufferSize?: number
  /**
   * Position in ms at which audio preloading of the next item is triggered.
   * Default: 10000.
   */
  prefetchAudioCheckPoint?: number
  /**
   * Required stable buffer duration in ms before enabling preloading of
   * the next item. Default: 10000.
   */
  stableBufferDuration?: number
}

/**
 * Snapshot of the current queue state, returned by getQueueState().
 */
export interface QueueState {
  /** Index of the currently active item in the queue. */
  currentIndex: number
  /** Current repeat mode. */
  repeatMode: RepeatMode
}

/**
 * Mutable state flags on PlayManager.
 * Read via getState(name), toggled via toggleState(name, value).
 */
export interface PlayManagerStates {
  /** True when playback is locked (e.g. during an ad break). */
  globalPlayLock: boolean
  /** True when the queue has a next track. */
  hasNext: boolean
  /** True when the queue has a current (loaded) track. */
  hasCurrent: boolean
  /** True when shuffle mode is active. */
  shuffle: boolean
  /** True when a fallback (autoplay) source is available. */
  hasFallback: boolean
  /** True when the fallback autoplay is allowed/enabled. */
  fallbackEnabled: boolean
}

/** Names of toggleable states on PlayManager. */
export type PlayManagerStateName = keyof PlayManagerStates

// ---------------------------------------------------------------------------
// QueueItem
// ---------------------------------------------------------------------------

/**
 * A single item in the PlayManager queue.
 * Module 182 — extends Backbone.Model (via SC BaseModel n(25)).
 *
 * Properties are stored directly on the instance (not in Backbone attributes),
 * except for fields inherited from BaseModel such as id.
 */
export interface QueueItem extends Backbone.Model {
  // -------------------------------------------------------------------------
  // Instance properties (set directly, not via Backbone.Model.attributes)
  // -------------------------------------------------------------------------

  /** "queue-item" — fixed resource type identifier. */
  resource_type: "queue-item"

  /** The sound/track model for this queue entry. null before the item is fully initialized. */
  sound: Sound | null

  /** Whether this item was explicitly added by the user ("Next Up"). */
  explicit: boolean

  /** Context snapshot captured when this item was enqueued. */
  contextSnapshot: unknown | null

  /** Original model reference (e.g. playlist or station). */
  originalModel: unknown | null

  /** Position in the originating query results. */
  queryPosition: number | null

  /** Source metadata for analytics. */
  sourceInfo: unknown | null

  /** UUID v4 — unique per queue item instance. */
  playSourceId: string

  /** Current position in the queue. */
  index: number | null

  /** Order value used for shuffle/unshuffle. */
  order: number | null

  /** Chromecast session ID, if cast is active. */
  castId: string | null

  /** Whether audio preloading is currently active for this item. Internal flag. */
  _preloadingEnabled: boolean

  // -------------------------------------------------------------------------
  // Methods
  // -------------------------------------------------------------------------

  /**
   * Constructor-like initializer called by the Backbone.Model factory.
   * Copies known properties from options, holds the sound model reference,
   * and registers submodels (playlist, systemPlaylist) for lifecycle management.
   */
  setup(
    attrs: unknown,
    options: {
      sound: Sound
      contextSnapshot?: unknown
      sourceInfo?: unknown
      index?: number | null
      order?: number | null
      explicit?: boolean
      originalModel?: unknown
      queryPosition?: number | null
      [key: string]: unknown
    }
  ): void

  /**
   * Mark this item as explicitly user-added.
   * Sets explicit = true and triggers "change:explicit".
   */
  makeExplicit(): void

  /**
   * Enable audio preloading for this item's sound.
   * Calls sound.requestPreloading(). Idempotent.
   */
  enablePreloading(): void

  /**
   * Disable audio preloading for this item's sound.
   * Calls sound.unrequestPreloading(). Idempotent.
   */
  disablePreloading(): void

  /**
   * Associate a Chromecast session ID with this item.
   */
  associateCastId(id: string): void

  /**
   * Clone this queue item, optionally merging override properties.
   * Returns a new QueueItem instance.
   */
  clone(overrides?: Partial<QueueItem>): QueueItem
}

// ---------------------------------------------------------------------------
// PlayQueue (Backbone.Collection<QueueItem>)
// ---------------------------------------------------------------------------

/**
 * The internal queue collection used by PlayManager.
 * Module 1243 — extends Backbone.Collection<QueueItem> (via SC BaseCollection n(54)).
 *
 * Each PlayQueue instance has a unique UUID (this.id).
 */
export interface PlayQueue extends Backbone.Collection<QueueItem> {
  /** UUID v4 identifying this queue instance. */
  id: string
}

// ---------------------------------------------------------------------------
// PlaySource (opaque)
// ---------------------------------------------------------------------------

/**
 * A play source — an object passed to playSource() / toggleSource() /
 * isSourcePlaying() / isSourceActive().
 *
 * The internal shape is a Backbone.Collection or stream object.
 * Typed as opaque here; consumers should not rely on its internal structure.
 */
export type PlaySource = Backbone.Collection | object

// ---------------------------------------------------------------------------
// PlayManager
// ---------------------------------------------------------------------------

/**
 * PlayManager singleton (module 21, System A).
 *
 * Created by the module 753 factory:
 *   K = _.assign({}, Backbone.Events, { states: {...}, ... })
 *
 * This is a plain object (not a Backbone.Model), with Backbone.Events
 * mixed in directly. All event methods are own properties of K.
 *
 * The typed on/off/trigger/once/listenTo overloads below enable
 * type-safe event handling for all known PlayManager events.
 * String catch-all overloads preserve compatibility with arbitrary events.
 */
export interface PlayManager extends Backbone.Events {
  // -------------------------------------------------------------------------
  // Typed event overloads (PlayManagerEventMap)
  // -------------------------------------------------------------------------

  on<K extends keyof PlayManagerEventMap>(
    eventName: K,
    callback: PlayManagerEventMap[K],
    context?: unknown
  ): this
  on(
    eventName: string,
    callback: (...args: unknown[]) => void,
    context?: unknown
  ): this
  on(eventMap: Backbone.EventMap, context?: unknown): this

  off<K extends keyof PlayManagerEventMap>(
    eventName?: K,
    callback?: PlayManagerEventMap[K],
    context?: unknown
  ): this
  off(
    eventName?: string,
    callback?: (...args: unknown[]) => void,
    context?: unknown
  ): this
  off(eventMap: Backbone.EventMap, context?: unknown): this

  trigger<K extends keyof PlayManagerEventMap>(
    eventName: K,
    ...args: Parameters<PlayManagerEventMap[K]>
  ): this
  trigger(eventName: string, ...args: unknown[]): this

  once<K extends keyof PlayManagerEventMap>(
    eventName: K,
    callback: PlayManagerEventMap[K],
    context?: unknown
  ): this
  once(
    eventName: string,
    callback: (...args: unknown[]) => void,
    context?: unknown
  ): this
  once(eventMap: Backbone.EventMap, context?: unknown): this

  listenTo<K extends keyof PlayManagerEventMap>(
    obj: PlayManager,
    eventName: K,
    callback: PlayManagerEventMap[K]
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
  // State
  // -------------------------------------------------------------------------

  /**
   * Mutable state flags object.
   * Do not modify directly — use toggleState() / getState().
   */
  readonly states: PlayManagerStates

  /**
   * Internal state object used by module 566 (stateMixin).
   * Backing store for toggleState / getState. Do not access directly.
   */
  _states: Record<string, unknown>

  /**
   * Module 757 instance.
   * Manages the "restore to sound" URL for session restoration.
   */
  restoreSoundStore: unknown

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialize PlayManager with its dependencies.
   * Called once on startup.
   */
  initialize(
    adManager: unknown,
    destroyManager: unknown,
    geoBlockHandler: unknown,
    restoreFn?: () => void
  ): void

  /**
   * Tear down PlayManager, releasing all streams and players.
   */
  dispose(): void

  // -------------------------------------------------------------------------
  // Playback control
  // -------------------------------------------------------------------------

  /**
   * Play a new source, replacing the current queue.
   * @param source — the collection/stream to play from.
   * @param sound  — the specific sound to start on.
   * @param metadata — metadata attached to this play action.
   * @param options — additional options.
   */
  playSource(
    source: PlaySource,
    sound: Sound,
    metadata: unknown,
    options?: Record<string, unknown>
  ): void

  /**
   * Toggle play/pause on a source.
   * If source is already playing, pauses; otherwise calls playSource().
   */
  toggleSource(
    source: PlaySource,
    metadata: unknown,
    options?: Record<string, unknown>
  ): void

  /**
   * Resume or play the current queue item.
   */
  playCurrent(options?: Record<string, unknown>): void

  /**
   * Pause the current queue item.
   * @param options.seek — if provided, seek to this position (ms) before pausing.
   */
  pauseCurrent(options?: { seek?: number; [key: string]: unknown }): void

  /**
   * Toggle play/pause on the current queue item.
   * If userInitiated is true, triggers "change:playQueueResumed".
   */
  toggleCurrent(options?: {
    userInitiated?: boolean
    uiComponent?: UiComponent
    [key: string]: unknown
  }): void

  /**
   * Seek the current sound relative to its current position.
   * @param offsetFn — receives the Sound and returns the offset in ms.
   */
  seekCurrentBy(offsetFn: (sound: Sound) => number): void

  /**
   * Seek the current sound to an absolute position.
   * @param positionFn — receives the Sound and returns the target position in ms.
   */
  seekCurrentTo(positionFn: (sound: Sound) => number): void

  // -------------------------------------------------------------------------
  // Queue navigation
  // -------------------------------------------------------------------------

  /**
   * Advance to the next item in the queue.
   */
  playNext(options?: { userInitiated?: boolean; [key: string]: unknown }): void

  /**
   * Go to the previous item, or rewind if currentTime > rewindThreshold.
   */
  playPrev(options?: { userInitiated?: boolean; [key: string]: unknown }): void

  // -------------------------------------------------------------------------
  // Queue management
  // -------------------------------------------------------------------------

  /**
   * Set a specific QueueItem as the current item.
   */
  setCurrentItem(queueItem: QueueItem, options?: Record<string, unknown>): void

  /**
   * Remove an item from the queue. Cannot remove the current item.
   */
  removeItem(queueItem: QueueItem): void

  /**
   * Clear all items from the queue except the currently playing item.
   */
  clearQueue(): void

  /**
   * Replace the entire queue with a new set of items.
   * @param items — the new queue items.
   * @param cursorIndex — index to set as the current item.
   * @param options — additional options.
   */
  replaceQueue(
    items: QueueItem[],
    cursorIndex: number,
    options?: Record<string, unknown>
  ): void

  /**
   * Add a track to the "Next Up" explicit queue.
   * Triggers "add:trackAddedToPlayQueue" with from: "next_up".
   */
  addExplicitQueueItem(
    sourceCollection: PlaySource,
    sound: Sound,
    contextSnapshot: unknown
  ): void

  /**
   * Create a QueueItem for the explicit queue without inserting it.
   * Use injectExplicitQueueItem() to insert it.
   */
  createExplicitQueueItem(
    sourceCollection: PlaySource,
    sound: Sound,
    contextSnapshot: unknown
  ): QueueItem

  /**
   * Insert a QueueItem immediately after the current item.
   * Triggers "add:trackAddedToPlayQueue" with from: "next_up".
   */
  injectExplicitQueueItem(queueItem: QueueItem): void

  /**
   * Clone an existing QueueItem and mark the clone as explicit.
   */
  cloneQueueItemToExplicit(queueItem: QueueItem): QueueItem

  // -------------------------------------------------------------------------
  // Shuffle / repeat
  // -------------------------------------------------------------------------

  /**
   * Toggle shuffle mode on or off.
   * Fires "state:shuffle" with the new value.
   */
  toggleShuffle(): void

  /**
   * Cycle repeat mode: "none" → "one" → "all" → "none".
   * (When casting: "none" ↔ "one" only.)
   * Fires "change:repeatMode" with the new mode.
   */
  cycleRepeatMode(): void

  /**
   * Set repeat mode directly.
   * Fires "change:repeatMode" with the new mode.
   */
  setRepeatMode(mode: RepeatMode): void

  // -------------------------------------------------------------------------
  // Query methods
  // -------------------------------------------------------------------------

  /** Returns true if the given source is currently playing. */
  isSourcePlaying(source: PlaySource): boolean

  /** Returns true if anything (including ads) is currently playing. */
  isPlaying(): boolean

  /** Returns true if the given source is the active source. */
  isSourceActive(source: PlaySource): boolean

  /** Returns the internal PlayQueue collection. */
  getQueue(): PlayQueue

  /**
   * Returns the QueueItem at the current cursor position, or undefined.
   */
  getCurrentQueueItem(): QueueItem | undefined

  /**
   * Returns the current track metadata.
   * Ad-aware: returns ad metadata during ad breaks.
   */
  getCurrentMetadata(): QueueItem | null

  /**
   * Returns debug information explaining why getCurrentMetadata() is null.
   */
  getCurrentMetadataEmptyReasons(): Record<string, unknown>

  /**
   * Returns the current Sound instance, or undefined if none.
   */
  getCurrentSound(): Sound | undefined

  /** Returns true if the queue has a next item (getState("hasNext")). */
  hasNextSound(): boolean

  /** Returns true if the queue has a current item (getState("hasCurrent")). */
  hasCurrentSound(): boolean

  /**
   * Returns true if the next stream has more items beyond the current queue.
   */
  hasMoreAhead(): boolean

  /**
   * Returns true if the previous stream has more items behind the current queue.
   */
  hasMoreBehind(): boolean

  /**
   * Returns true if a fallback autoplay source is available.
   */
  hasFallback(): boolean

  // -------------------------------------------------------------------------
  // State access
  // -------------------------------------------------------------------------

  /**
   * Returns the current value of a named state flag.
   */
  getState(name: PlayManagerStateName): boolean
  getState(name: string): unknown

  /**
   * Set a named state flag. Fires "state:{name}" if the value changed.
   * @param silent — if true, suppress the event.
   */
  toggleState(
    name: PlayManagerStateName,
    value?: boolean,
    silent?: boolean
  ): this
  toggleState(name: string, value?: unknown, silent?: boolean): this

  /**
   * Returns a snapshot of the current queue state (index + repeatMode).
   */
  getQueueState(): QueueState

  // -------------------------------------------------------------------------
  // Autoplay / streams
  // -------------------------------------------------------------------------

  /**
   * Enable deferred autoplay.
   */
  enableAutoplay(): void

  /**
   * Pull N items from the next stream into the queue.
   */
  pullNext(count: number): void

  /**
   * Pull N items from the previous stream into the queue.
   */
  pullPrev(count: number): void

  // -------------------------------------------------------------------------
  // Initial / history sources
  // -------------------------------------------------------------------------

  /**
   * Set the initial history source for the "previous" direction.
   */
  setInitialHistorySource(source: PlaySource, metadata: unknown): void

  /**
   * Set the initial source for deferred autoplay.
   * Returns an opaque stream handle; pass it to unsetInitialSource() to cancel.
   */
  setInitialSource(
    source: PlaySource,
    priority: number,
    metadata: unknown
  ): unknown

  /**
   * Remove a previously registered initial source.
   * @param stream — the handle returned by setInitialSource().
   */
  unsetInitialSource(stream: unknown): void

  // -------------------------------------------------------------------------
  // State restore
  // -------------------------------------------------------------------------

  /**
   * Navigate to the restore URL for the given QueueItem (or current item).
   */
  restoreState(queueItem?: QueueItem): void
}

// ---------------------------------------------------------------------------
// Global event bus (module 10)
// ---------------------------------------------------------------------------

/**
 * The global Backbone.Events singleton used as a cross-module event bus.
 * Module 10 in System A.
 *
 * Every Sound player event is forwarded here as "audio:{eventName}".
 * Google Cast events are also published here.
 */
export type GlobalEventBus = Backbone.Events
