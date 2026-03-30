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
