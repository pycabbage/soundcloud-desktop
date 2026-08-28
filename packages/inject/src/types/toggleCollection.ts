/**
 * SoundCloud System A — toggle collection.
 *
 * A Backbone model whose attributes map a resource id to `true`, used for the
 * "me" association lists behind the like/repost/follow buttons. The sound
 * likes flavour is backed by `me/track_likes/ids`.
 *
 * Every subclass hashes all of its instances to the same key, so `new` returns
 * the collection the rest of the app already reads and mutates.
 *
 * Source: base class in `55-ef1f6ed4.js` (`toggle` / `setRemote` definitions).
 */
export interface ToggleCollection extends Backbone.Events {
  /** `me/track_likes/ids` and friends — identifies the concrete collection. */
  readEndpoint: string
  createEndpoint: string
  deleteEndpoint: string

  /** True while the resource is in the list. Undefined once it is unset. */
  get(id: number | string): boolean | undefined

  /**
   * Load the ids from `readEndpoint`, paging until the list is complete.
   * Resolves immediately once every page has been read.
   */
  fetch(): PromiseLike<unknown>

  /** True once `fetch()` has completed at least once. */
  hasDataForView(): boolean

  /**
   * Flip the local value, or force it when `state` is given. Triggers
   * `change` and `change:<id>`. Local only — see `setRemote` to persist.
   */
  toggle(id: number | string, state?: boolean): void

  /** Persist the value through `createEndpoint` / `deleteEndpoint`. */
  setRemote(id: number | string, state: boolean, options?: Record<string, unknown>): unknown
}
