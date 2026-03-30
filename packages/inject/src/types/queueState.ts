import type { RepeatMode } from "./utils.js"

/**
 * Snapshot of the current queue state, returned by getQueueState().
 */
export interface QueueState {
  /** Index of the currently active item in the queue. */
  currentIndex: number
  /** Current repeat mode. */
  repeatMode: RepeatMode
}
