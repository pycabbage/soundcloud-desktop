/**
 * Event object passed to the audioPerformanceReporter callback.
 * Fired on play latency, seek, rebuffering, and other performance events
 * by the AudioPerformanceEventGenerator inside the Player.
 */
export interface AudioPerformanceReporterEvent {
  /** Performance event type. */
  type:
    | "play"
    | "seek"
    | "seekStart"
    | "rebufferingStart"
    | "rebufferingEnd"
    | "rageSkip"
    | "longInitialBuffering"
    | "uninterruptedPlay"
  /** Measured latency in milliseconds. */
  latency: number
  /** Streaming protocol, e.g. "hls". */
  protocol: string
  /** Player type name. */
  playerType: string
  /** Stream host domain. */
  host: string
  /** Bitrate in kbps. */
  bitrate: number
  /** Stream format string. */
  format: string
  /** Stream preset identifier. */
  preset: string
  /** Quality level. */
  quality: string
  /** Preloaded data, if any. */
  preloaded: unknown
  /** Application state string. */
  appState: string
}
