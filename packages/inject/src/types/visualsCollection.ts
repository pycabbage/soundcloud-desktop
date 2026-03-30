/**
 * Backbone Collection for waveform / artwork animation data (module 779).
 * Lazily created on the first "change:visuals" event on a Sound instance.
 */
export interface VisualsCollection {
  /** Timestamp (Date.now()) of the last fetch. */
  lastFetchTime: number
  /** Release the reference-counted collection handle. */
  release(): void
  /** Reset collection contents from raw API data. */
  reset(items: unknown[], opts?: { parse?: boolean }): void
}
