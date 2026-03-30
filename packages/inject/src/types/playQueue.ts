import type { QueueItem } from "./queueItem.js"

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
