/** Track authorization / monetization policy from the API. */
export interface Authorization {
  /** Monetization model, e.g. "SUB_HIGH_TIER", "AD_SUPPORTED". */
  monetizationModel: string | null
  /** Access policy: "ALLOW", "BLOCK", or "SNIP". */
  policy: string | null
  /** Block reason, e.g. "GEO". */
  reason: string | null
}
