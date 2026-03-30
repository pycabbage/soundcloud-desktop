/**
 * Image-based ad visual.
 * Used for `companion_display` and `leave_behind` in AudioAdPayload.
 */
export interface AdVisualImage {
  /** Click destination URL. */
  landing_page: string
  /** DFP ad URN, e.g. "dfp:ads:1-3". */
  ad_urn: string
  /** Image URL (JPEG). */
  ad_visual: string
  /** Pixel tracking URLs. */
  tracking: {
    impression: string[]
    ad_click: string[]
  }
}
