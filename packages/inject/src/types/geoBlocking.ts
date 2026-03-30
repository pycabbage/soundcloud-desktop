/**
 * Geoblocking entry — a region the track is blocked or allowed in.
 */
export interface GeoBlocking {
  type: "allow" | "block"
  countries: string[]
}
