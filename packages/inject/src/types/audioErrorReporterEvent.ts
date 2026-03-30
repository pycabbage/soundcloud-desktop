/**
 * Event object passed to the audioErrorReporter callback.
 * Fired on fatal playback errors by the ErrorEventGenerator inside the Player.
 */
export interface AudioErrorReporterEvent {
  /** Error code string from PlayerFatalError.getCode(). */
  errorCode: string
  /** Collected log data. */
  log: unknown
  /** Random 20-character log session identifier. */
  logId: string
  /** Track identifier. */
  trackId: unknown
  /** Streaming protocol, or undefined if not yet known. */
  protocol: string | undefined
  /** Player type name. Defaults to "MaestroUnknown" if not available. */
  playerType: string
  /** Stream host domain, or undefined. */
  host: string | undefined
  /** Bitrate in kbps, or undefined. */
  bitrate: number | undefined
  /** Stream format string, or undefined. */
  format: string | undefined
  /** Stream preset identifier, or undefined. */
  preset: string | undefined
  /** Quality level, or undefined. */
  quality: string | undefined
  /** Stream URL, or undefined. */
  url: string | undefined
  /** Application state string. */
  appState: string
}
