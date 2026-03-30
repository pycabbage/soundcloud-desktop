/**
 * Playback state synced from V2 to Webi via "sync-playback-state" messages.
 * Also used internally by V2BridgePlayer.
 */
export interface V2PlaybackState {
  isPlayable: boolean
  isPlaying: boolean
  isLoading: boolean
  isMuted: boolean
  /** Volume level, 0–1. */
  volume: number
  /** Timestamp (Date.now()) of the last state update. */
  lastUpdate: number
  /** Current playback position in milliseconds. */
  playbackPosition: number
}
