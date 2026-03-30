import type { TranscodingFormat } from "./transcodingFormat.js"

/** A single audio transcoding variant (System B — GraphQL). */
export interface Transcoding {
  /** Relative URL path to the transcoding manifest or stream. */
  relativeUrl: string
  /** Unique identifier. */
  uuid: string
  /** Preset identifier, e.g. "mp3_0_1", "opus_0_0". */
  preset: string
  /** Duration of this transcoding in milliseconds. */
  durationMs: number
  /** Whether this is a snippet (preview) transcoding. */
  snipped: boolean
  /** Format descriptor. */
  format: TranscodingFormat
  /** Quality level, e.g. "sq" (standard) or "hq" (high). */
  quality: string
}
