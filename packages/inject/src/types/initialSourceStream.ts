/**
 * Opaque stream handle returned by PlayManager.setInitialSource().
 * Pass to unsetInitialSource() to cancel the registered source.
 *
 * Internally this is the object returned by module 441 (stream source factory),
 * with { next, prev, dispose } properties. Consumers should treat it as opaque.
 */
export interface InitialSourceStream {
  /** Internal: next-direction stream. Do not access directly. */
  next: unknown
  /** Internal: previous-direction stream. Do not access directly. */
  prev: unknown
  /** Release all resources held by this stream. */
  dispose(): void
}
