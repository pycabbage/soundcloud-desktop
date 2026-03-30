import type { ContextSnapshot } from "./contextSnapshot.js"
import type { Sound } from "./sound.js"
import type { SourceInfo } from "./sourceInfo.js"

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
  contextSnapshot: ContextSnapshot | null

  /** Original model reference (e.g. the Sound itself, or a playlist item). */
  originalModel: Sound | null

  /** Position in the originating query results. */
  queryPosition: number | null

  /** Source metadata for analytics. */
  sourceInfo: SourceInfo | null

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
    attrs: Record<string, unknown>,
    options: {
      sound: Sound
      contextSnapshot?: ContextSnapshot | null
      sourceInfo?: SourceInfo | null
      index?: number | null
      order?: number | null
      explicit?: boolean
      originalModel?: Sound | null
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
