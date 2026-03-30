import type { Sound } from "./sound.js"
import type { SourceInfo } from "./sourceInfo.js"

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
