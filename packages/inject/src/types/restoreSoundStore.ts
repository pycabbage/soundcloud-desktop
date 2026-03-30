/**
 * Reactive key-value store for sound state restoration (module 757).
 * Assigned to PlayManager.restoreSoundStore in initialize().
 *
 * PlayManager.restoreState() writes "restoreToSound" here; views that
 * implement the RestorableMixin listen for this key to scroll into view.
 */
export interface RestoreSoundStore extends Backbone.Events {
  /** Returns the stored "restoreToSound" value (e.g. "sound12345"), or null. */
  get(key: "restoreToSound"): string | null
  /** Returns the stored value for any key, or undefined. */
  get(key: string): unknown
  /**
   * Store a "restoreToSound" value and optionally suppress the event.
   * Pass null to clear the stored value.
   */
  set(
    key: "restoreToSound",
    value: string | null,
    opts?: { silent?: boolean }
  ): void
  /** Store a value for any key. */
  set(key: string, value: unknown, opts?: Record<string, unknown>): void
}
