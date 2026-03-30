/** Audio format descriptor (System B — GraphQL). */
export interface TranscodingFormat {
  /** Streaming protocol, e.g. "hls" or "progressive". */
  protocol: string
  /** MIME type, e.g. "audio/mpeg" or "audio/ogg; codecs=\"opus\"". */
  mimeType: string
}
