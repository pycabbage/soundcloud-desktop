/**
 * SoundCloud System A — PlayManager
 *
 * PlayManager (module 21) is a plain object with Backbone.Events mixed in.
 * It is produced by the factory in module 753 via: n(1).assign({}, n(45).Events, {...})
 */

import type { AdManager } from "./adManager.js"
import type { ContextSnapshot } from "./contextSnapshot.js"
import type { DestroyManager } from "./destroyManager.js"
import type { GlobalEventBus } from "./globalEventBus.js"
import type { InitialSourceStream } from "./initialSourceStream.js"
import type { PlayManagerEventMap } from "./playManagerEventMap.js"
import type { PlayManagerStateName, PlayManagerStates } from "./playManagerStates.js"
import type { PlayQueue } from "./playQueue.js"
import type { PlaySource } from "./playSource.js"
import type { QueueItem } from "./queueItem.js"
import type { QueueState } from "./queueState.js"
import type { RestoreSoundStore } from "./restoreSoundStore.js"
import type { Sound } from "./sound.js"
import type { UiComponent } from "./uiComponent.js"
import type { RepeatMode } from "./utils.js"

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
  on(eventName: string, callback: (...args: unknown[]) => void, context?: unknown): this
  on(eventMap: Backbone.EventMap, context?: unknown): this

  off<K extends keyof PlayManagerEventMap>(
    eventName?: K,
    callback?: PlayManagerEventMap[K],
    context?: unknown
  ): this
  off(eventName?: string, callback?: (...args: unknown[]) => void, context?: unknown): this
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
  once(eventName: string, callback: (...args: unknown[]) => void, context?: unknown): this
  once(eventMap: Backbone.EventMap, context?: unknown): this

  listenTo<K extends keyof PlayManagerEventMap>(
    obj: PlayManager,
    eventName: K,
    callback: PlayManagerEventMap[K]
  ): this
  listenTo(obj: Backbone.Events, eventName: string, callback: (...args: unknown[]) => void): this
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
  restoreSoundStore: RestoreSoundStore

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialize PlayManager with its dependencies.
   * Called once on startup.
   */
  initialize(
    adManager: AdManager,
    destroyManager: DestroyManager,
    geoBlockHandler: GlobalEventBus,
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
    metadata: ContextSnapshot | null,
    options?: Record<string, unknown>
  ): void

  /**
   * Toggle play/pause on a source.
   * If source is already playing, pauses; otherwise calls playSource().
   */
  toggleSource(
    source: PlaySource,
    metadata: ContextSnapshot | null,
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
  replaceQueue(items: QueueItem[], cursorIndex: number, options?: Record<string, unknown>): void

  /**
   * Add a track to the "Next Up" explicit queue.
   * Triggers "add:trackAddedToPlayQueue" with from: "next_up".
   */
  addExplicitQueueItem(
    sourceCollection: PlaySource,
    sound: Sound,
    contextSnapshot: ContextSnapshot | null
  ): void

  /**
   * Create a QueueItem for the explicit queue without inserting it.
   * Use injectExplicitQueueItem() to insert it.
   */
  createExplicitQueueItem(
    sourceCollection: PlaySource,
    sound: Sound,
    contextSnapshot: ContextSnapshot | null
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
  getState(name: string): boolean | undefined

  /**
   * Set a named state flag. Fires "state:{name}" if the value changed.
   * @param silent — if true, suppress the event.
   */
  toggleState(name: PlayManagerStateName, value?: boolean, silent?: boolean): this
  toggleState(name: string, value?: boolean, silent?: boolean): this

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
  setInitialHistorySource(source: PlaySource, metadata: ContextSnapshot | null): void

  /**
   * Set the initial source for deferred autoplay.
   * Returns an opaque stream handle; pass it to unsetInitialSource() to cancel.
   */
  setInitialSource(
    source: PlaySource,
    priority: number,
    metadata: ContextSnapshot | null
  ): InitialSourceStream | undefined

  /**
   * Remove a previously registered initial source.
   * @param stream — the handle returned by setInitialSource().
   */
  unsetInitialSource(stream: InitialSourceStream): void

  // -------------------------------------------------------------------------
  // State restore
  // -------------------------------------------------------------------------

  /**
   * Navigate to the restore URL for the given QueueItem (or current item).
   */
  restoreState(queueItem?: QueueItem): void
}
