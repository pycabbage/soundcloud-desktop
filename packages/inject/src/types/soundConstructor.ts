import type { Sound } from "./sound.js"
import type { SoundStates } from "./soundStates.js"

/**
 * Deferred object returned by the static Sound.resolve().
 * jQuery-style deferred exposing only the promise accessor.
 */
export interface SoundResolveDeferred {
  /** Resolves with the fetched/cached Sound instance, or rejects on failure. */
  promise(): Promise<Sound | undefined>
  /** Current deferred state: "pending" | "resolved" | "rejected". */
  state(): string
}

/**
 * Static members on the Sound class constructor (not expressible in the
 * Sound instance interface).
 *
 * Sourced from the Sound model definition in 54-8313710f.js:
 *   - Sound.resolve(username, permalink, options?)
 *       Fetch or retrieve a Sound by user/permalink via api-v2 /resolve.
 *   - Sound.normalize(data)
 *       Normalizes raw API data (e.g. fixes waveform_url domain).
 *   - Sound.states
 *       Lifecycle state constants.
 */
export interface SoundConstructor {
  new (attrs?: Record<string, unknown>, options?: Record<string, unknown>): Sound

  resolve(
    username: string,
    permalink: string,
    options?: Record<string, unknown>
  ): SoundResolveDeferred

  normalize(data: Record<string, unknown>): Record<string, unknown>

  readonly states: SoundStates
}
