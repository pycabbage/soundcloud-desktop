/**
 * Social actions facade (module 51).
 * Passed as the second argument to PlayManager.initialize().
 * PlayManager uses it to track play history and listen for "destroy" events.
 */
export interface DestroyManager extends Backbone.Events {
  /**
   * Record a sound play in the play history.
   * @param soundId — numeric sound ID.
   * @param playContext — opaque play context data.
   * @param force — if true, force-adds even if already present.
   */
  addToPlayHistory(soundId: number, playContext: unknown, force: boolean): void
  /** Clear all play history entries. */
  clearPlayHistory(): void
  /** Destroy the given model. */
  destroy(model: unknown, opts?: Record<string, unknown>): void
  /** Toggle the like state on the given model. */
  like(model: unknown, state: boolean, opts?: Record<string, unknown>): void
  /** Toggle the repost state on the given model. */
  repost(model: unknown, state: boolean, opts?: Record<string, unknown>): void
  /** Toggle the follow state on the given model. */
  follow(model: unknown, state: boolean, opts?: Record<string, unknown>): void
  /** Post a comment on the given model. */
  comment(model: unknown, comment: unknown, opts?: Record<string, unknown>): void
}
