/**
 * HTML-based ad visual.
 * Used for `html_companion_display` and `html_leave_behind` in AudioAdPayload.
 */
export interface AdVisualHtml {
  /** Click destination URL. */
  landing_page: string
  /** DFP ad URN. */
  ad_urn: string
  /** Ad width in pixels. */
  width: number
  /** Ad height in pixels. */
  height: number
  /** Raw HTML markup for the ad. */
  html_resource: string
  /** Pixel tracking URLs. */
  tracking: {
    impression: string[]
    ad_click: string[]
  }
}
