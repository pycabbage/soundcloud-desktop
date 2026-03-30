import type { Sound } from "./sound.js"

/**
 * Ad lifecycle controller (module 52 — singleton of module 1415 factory).
 * Passed as the first argument to PlayManager.initialize().
 */
export interface AdManager extends Backbone.Events {
  /** The current AdPodController instance, or null between ad breaks. */
  adPodController: unknown | null
  /** Begin an ad break with the given ad sound. */
  beginAdBreak(sound: Sound, opts?: Record<string, unknown>): void
  /** Request that the current ad be skipped. */
  requestSkipCurrentAd(opts?: Record<string, unknown>): void
  /** Request that the entire ad break be skipped. */
  requestSkipAdBreak(opts?: Record<string, unknown>): void
  /** Mark the current ad as immediately skippable. */
  setCanSkipImmediately(canSkip: boolean): void
  /** Dismiss the leave-behind overlay. */
  dismissLeaveBehind(): void
  /** Returns true if an AdPodController is currently set. */
  doesAdBreakExist(): boolean
  /** Returns true if an ad break is actively playing. */
  isAdBreakActive(): boolean
  /** Returns true if the user is allowed to skip the current ad. */
  isAllowedToSkipCurrentAd(): boolean
  /** Returns true if the user is allowed to skip the entire ad break. */
  isAllowedToSkipAdBreak(): boolean
  /** Returns the current AdController, or null. Internal use. */
  getCurrentAdController(): unknown
  /** Returns the current AudioAd model, or null. */
  getCurrentAd(): unknown | null
  /** Returns the Sound instance for the current ad audio, or null. */
  getCurrentAdSound(): Sound | null
  /** Returns the current ad visual controller, or null. Internal use. */
  getCurrentAdVisualController(): unknown
  /** Returns the Sound that will play after the current ad break, or null. */
  getUpcomingSound(): Sound | null
  /** Returns the 0-based index of the current ad in the pod. */
  getCurrentAdIndex(): number
  /** Returns the total number of ads in the current pod. */
  getAdBreakSize(): number
  /** Returns the DSA config for the current ad, or null. */
  getDsaConfig(): unknown | null
  /** Returns the advertiser name for the current ad, or null. */
  getCurrentAdAdvertiser(): string | null
}
