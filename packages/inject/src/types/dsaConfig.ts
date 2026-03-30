/**
 * Digital Services Act (DSA) configuration.
 * Received in "set-current-ad" messages for EU ad transparency compliance.
 */
export interface DsaConfig {
  /** User age. */
  age: number
  /** ISO 3166-1 alpha-2 country code, e.g. "DE". */
  country_code: string
  /** Whether listening history is used for ad targeting. */
  listening_history: boolean
}
