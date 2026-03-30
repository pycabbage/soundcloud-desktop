/**
 * Per-track audio player for System A (legacy SoundCloud player).
 * Created by r(344).createPlayer() and assigned to Sound.player.
 *
 * Note: this is NOT the same as SCAudioPlayer in scAudioPlayer.ts,
 * which is the System B (NativePlayer) per-track player.
 */
export interface SoundAPlayer {
  /** Begin or resume playback. */
  play(): Promise<void>
  /** Pause playback. */
  pause(): Promise<void>
  /** Fade out and pause over durationMs milliseconds. */
  pauseAfterFade(durationMs: number): Promise<void>
  /** Seek to an absolute position in milliseconds. */
  seek(position: number): void
  /** Destroy the player instance. */
  kill(): void
  /** Release the reference-counted player handle. */
  release(): void
  /** Enable audio preloading. */
  enablePreloading(): void
  /** Disable audio preloading. */
  disablePreloading(): void
  /** Returns true if audio is buffering. */
  isLoading(): boolean
  /** Returns true if audio is actively playing. */
  isPlaying(): boolean
  /** Returns true if playback has ended. */
  isEnded(): boolean
  /** Returns the current playback position in milliseconds. */
  getPosition(): number
  /** Returns the total duration in milliseconds, or null if not yet known. */
  getDuration(): number | null
  /** Returns the accumulated listen time in milliseconds. */
  getListenTime(): number
  /** Returns the current audio quality string (e.g. "sq"), or null. */
  getQuality(): string | null
  /** Returns the currently buffered time range, or null. */
  getCurrentBufferedTimeRange(): { end: number } | null
  /** Add an event listener. Returns a handle with a remove() method. */
  addEventListener(
    event: string,
    handler: (...args: unknown[]) => void
  ): { remove(): void }
}
