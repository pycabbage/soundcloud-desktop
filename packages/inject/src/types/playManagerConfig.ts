/**
 * PlayManager factory configuration options.
 * Passed to the module 753 factory function.
 */
export interface PlayManagerConfig {
  /** How many items ahead/behind the cursor to prefetch. Default: 20. */
  prefetchDistance?: number
  /**
   * Delay in ms before auto-advancing after a geo-blocked error.
   * Default: 2500.
   */
  playNextOnErrorDelay?: number
  /**
   * If currentTime (ms) exceeds this threshold when "playPrev" is called,
   * the track rewinds to 0 instead of going to the previous item.
   * Default: 5000.
   */
  rewindThreshold?: number
  /** Size of the random shuffle buffer. Default: 100. */
  randomBufferSize?: number
  /**
   * Position in ms at which audio preloading of the next item is triggered.
   * Default: 10000.
   */
  prefetchAudioCheckPoint?: number
  /**
   * Required stable buffer duration in ms before enabling preloading of
   * the next item. Default: 10000.
   */
  stableBufferDuration?: number
}
