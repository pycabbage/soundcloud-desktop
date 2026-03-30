/**
 * Change event payload emitted on SCAudioPlayer.onChange.
 */
export interface PlayerChangeEvent {
  actuallyPlaying?: boolean
  playing?: boolean
  seek?: boolean
  seeking?: boolean
  stalled?: boolean
  ended?: boolean
  dead?: boolean
  /** Fatal error object with a getCode() method, or null when cleared. */
  fatalError?: { getCode(): string } | null
  positionJumped?: boolean
}
