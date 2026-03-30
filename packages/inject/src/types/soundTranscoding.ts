import type { SoundTranscodingFormat } from "./soundTranscodingFormat.js"

/**
 * A single audio transcoding — System A (REST API).
 * Distinct from `Transcoding` in transcoding.ts: uses a full stream URL instead of
 * a relative URL + uuid pair.
 */
export interface SoundTranscoding {
  /** Full stream URL (HLS manifest or progressive file). */
  url: string
  /** Preset identifier, e.g. "aac_160k", "mp3_1_0", "opus_0_0". */
  preset: string
  /** Duration in milliseconds. */
  duration: number
  /** Whether this is a snippet (preview) transcoding. */
  snipped: boolean
  /** Format descriptor. */
  format: SoundTranscodingFormat
  /** Quality level, e.g. "sq" (standard) or "hq" (high). */
  quality: string
  /** True for older mp3/opus transcodings pre-dating the AAC rollout. */
  is_legacy_transcoding: boolean
}
