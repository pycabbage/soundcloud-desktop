/**
 * Event object passed to the audioReporter callback.
 * Fired on "play", "pause", and periodic "checkpoint" events
 * by the AudioEventGenerator inside the Player.
 */
export interface AudioReporterEvent {
  /** Event type. */
  type: "play" | "pause" | "checkpoint"
  /** Current playhead position in milliseconds. */
  position: number
  /** Track duration in milliseconds. */
  duration: number
  /** Stream preset identifier, e.g. "mp3_0_1". */
  preset: string
  /** Quality level, e.g. "sq" or "hq". */
  quality: string
  /** Player type name, e.g. "HLS" or "Progressive". */
  playerType: string
  /** Application state string. */
  appState: string
}
