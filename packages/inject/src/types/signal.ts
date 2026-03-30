/**
 * RxJS-style observable signal used by SCAudioPlayer.
 * subscribe() returns a disposable handle.
 */
export interface Signal<T> {
  subscribe(callback: (value: T) => void): { remove(): void }
}
