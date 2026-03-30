import type { LayoutInfo } from "./layoutInfo.js"
import type { SourceInfo } from "./sourceInfo.js"

/**
 * Context snapshot captured when a QueueItem is enqueued.
 *
 * Passed as the `metadata` argument to playSource(), setInitialSource(),
 * toggleSource(), etc., and stored as `QueueItem.contextSnapshot`.
 *
 * Used by:
 *   - restoreState()      — reads restoreUrl to navigate back
 *   - trackAudioEvent()   — reads sourceInfo for analytics attribution
 *   - QueueItemView       — reads restoreUrl for the "back to context" link
 */
export interface ContextSnapshot {
  /**
   * URL to navigate back to when restoring play context.
   * undefined or null when no restore URL is applicable
   * (e.g. explicit queue additions).
   */
  restoreUrl?: string | null
  /** Source context for analytics attribution. */
  sourceInfo: SourceInfo
  /** Page layout context at the time of enqueueing. */
  layoutInfo?: LayoutInfo
}
