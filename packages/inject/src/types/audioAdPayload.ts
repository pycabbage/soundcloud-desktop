import type { AdVisualHtml } from "./adVisualHtml.js"
import type { AdVisualImage } from "./adVisualImage.js"

/**
 * Audio ad payload in "set-current-ad" V2ToWebiMessage.
 * Constructed by CrossfadeIframeManager._handleAdManagerChangeSound().
 * null when no ad is currently active.
 */
export interface AudioAdPayload {
  /** Audio metadata. */
  audio: {
    /** Ad audio duration in milliseconds. */
    duration: number
    /** Advertiser name, or undefined if not set. */
    advertiser: string | undefined
  }
  /** Image companion display (null if unavailable). */
  companion_display: AdVisualImage | null
  /** HTML companion display (null if unavailable). */
  html_companion_display: AdVisualHtml | null
  /** Image leave-behind (null if unavailable). */
  leave_behind: AdVisualImage | null
  /** HTML leave-behind (null if unavailable). */
  html_leave_behind: AdVisualHtml | null
}
