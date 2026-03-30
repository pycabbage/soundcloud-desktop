/**
 * Audio transcoding format descriptor — System A (REST API).
 * Distinct from `TranscodingFormat` in transcodingFormat.ts (System B / GraphQL).
 */
export interface SoundTranscodingFormat {
  /** Streaming protocol, e.g. "hls" or "progressive". */
  protocol: string
  /** MIME type, e.g. "audio/mp4; codecs=\"mp4a.40.2\"". */
  mime_type: string
}
