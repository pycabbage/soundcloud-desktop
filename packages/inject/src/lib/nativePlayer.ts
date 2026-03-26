import { panic } from "./utils"
import { getModule } from "./webpack"

type Subscriber = (...args: unknown[]) => void
interface NativePlayer {
  subscribe(fn: Subscriber): () => boolean
  subscribers: Set<Subscriber>
  unavailableTracks: Set<unknown>
  v2PlaybackState: {
    isPlayable: boolean
    isPlaying: boolean
    isLoading: boolean
    isMuted: boolean
    volume: number
    lastUpdate: number
    playbackPosition: number
  }
  currentTrack: {
    urn: string
    fullDuration: number
    permalinkUrl: string
    title: string
    artworkUrl: string
    user: {
      username: string
      permalinkUrl: string
    }
  }
  frame: unknown | null

  setCurrentTrack(track: NativePlayer["currentTrack"]): void
  playTracks(
    tracks: NativePlayer["currentTrack"][],
    startUrn?: string
  ): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek(time: number): Promise<void>
  getElapsedTime(track?: NativePlayer["currentTrack"]): number
  getDuration(track?: NativePlayer["currentTrack"]): number
  isTrackPlayable(track?: NativePlayer["currentTrack"]): boolean
  isAudioPlayable(): boolean
  isTrackPlaying(track?: NativePlayer["currentTrack"]): boolean
  isAudioPlaying(): boolean
  isTrackLoading(track?: NativePlayer["currentTrack"]): boolean
  isAudioLoading(): boolean
  isTrackTemporarilyUnavailable(track?: NativePlayer["currentTrack"]): boolean
  getVolume(): number
  setVolume(volume: number): Promise<void>
  isMuted(): boolean
  setMuted(muted: boolean): Promise<void>
  doOptimisticUpdateForPlaybackPosition(position: number): void
}

export function getNativePlayer() {
  return (
    (getModule(["currentTrack"]) as NativePlayer | undefined) ||
    panic("Could not find the player module")
  )
}
