import { panic } from "./utils"
import { getModule, getWebpackRequire } from "./webpack"

type RepeatMode = "none" | "one" | "all"
interface GeoBlockManager {
  on(event: "geoBlocked", handler: () => void): void
  on(event: "soundPolicyChange", handler: () => void): void
}
interface PlayHistory {
  addToPlayHistory(
    soundId: string | number,
    playContext: unknown,
    flag: boolean
  ): void
}

export interface Sound {
  getUrn(): string
  isPlayable(): boolean
  isPlaying(): boolean
  play(options?: PlayOptions): void
  pause(): void
  toggle(options?: PlayOptions): void
  seek(position: number): void
  seekRelative(delta: number): void
  currentTime(): number
  on(event: string, handler: (...args: unknown[]) => void): void
  off(event: string, handler: (...args: unknown[]) => void): void
  once(event: string, handler: (...args: unknown[]) => void): void
  playlist?: Playlist
  systemPlaylist?: Playlist
  resource_type: string
  resource_id: string | number
  attributes: {
    user?: User
    [key: string]: unknown
  }
  player?: Player
}

export interface Player {
  [key: string]: unknown
}

export interface User {
  [key: string]: unknown
}

export interface Playlist {
  resource_type: string
  resource_id: string | number
  [key: string]: unknown
}

export interface SourceInfo {
  [key: string]: unknown
}

export interface LayoutInfo {
  [key: string]: unknown
}

export interface ContextSnapshot {
  restoreUrl?: string | null
  [key: string]: unknown
}

export interface QueueItem {
  sound: Sound
  explicit: boolean
  index: number
  order?: number | null
  sourceInfo: SourceInfo
  layoutInfo?: LayoutInfo
  originalModel?: unknown
  queryPosition?: number
  contextSnapshot?: ContextSnapshot
  enablePreloading(): void
  disablePreloading(): void
  clone(overrides: Partial<QueueItemAttributes>): QueueItem
  release(): void
}

export interface QueueItemAttributes {
  explicit: boolean
  index: number
  order?: number | null
  sound?: Sound
  originalModel?: unknown
  queryPosition?: number
  sourceInfo?: SourceInfo
  contextSnapshot?: ContextSnapshot
  restoreUrl?: string | null
}

export interface QueueCollection {
  length: number
  at(index: number): QueueItem
  last(): QueueItem
  find(predicate: (item: QueueItem) => boolean): QueueItem | undefined
  indexOf(item: QueueItem): number
  add(item: QueueItem, options?: { at?: number }): void
  remove(item: QueueItem): void
  reset(items: QueueItem[], options?: { silent?: boolean }): void
  map<T>(fn: (item: QueueItem) => T): T[]
  reduce<T>(fn: (acc: T, item: QueueItem) => T, initial: T): T
  slice(start?: number, end?: number): QueueItem[]
  each(fn: (item: QueueItem, index: number) => void): void
  trigger(event: string, ...args: unknown[]): void
  release(): void
}

export interface Stream {
  isEnded(): boolean
  resume(): void
  shuffle(): void
  unshuffle(): QueueItem[]
}

export interface StreamHandle {
  stream: Stream
  dispose(): void
  next?: StreamHandle
  prev?: StreamHandle
}

export interface AdBreakManager {
  isAdBreakActive(): boolean
  getCurrentAdSound(): Sound | null
  requestSkipCurrentAd(): void
  beginAdBreak(
    sound: Sound,
    options: PlayOptions
  ): {
    fail(cb: () => void): unknown
    then(cb: (val: unknown) => unknown): unknown
  }
}

export interface PlayOptions {
  seek?: number
  pause?: boolean
  allowAdBreak?: boolean
  userInitiated?: boolean
  uiComponent?: unknown
  [key: string]: unknown
}

export interface PlayManagerState {
  globalPlayLock: boolean
  hasNext: boolean
  hasCurrent: boolean
  shuffle: boolean
  hasFallback: boolean
  fallbackEnabled: boolean
}

export interface PlaySource {
  getSourceInfo(): SourceInfo
  getSoundIndex(sound: Sound): number
  getQueueMetadataAt(index: number): QueueMetadata
  playlist?: Playlist
  [key: string]: unknown
}

export interface QueueMetadata {
  originalModel: unknown
  queryPosition: number
  sourceInfo: SourceInfo
}

export interface RestoreStateStore {
  set(key: string, value: unknown): void
  get(key: string): unknown
}

export interface QueueState {
  currentIndex: number
  repeatMode: RepeatMode
}

export interface CurrentMetadataEmptyReasons {
  adConsumer: boolean
  currentAd: boolean
  queueLength: number
  queueCursor: number
}

interface PlayManager {
  // State
  getState(key: keyof PlayManagerState): boolean
  toggleState(key: keyof PlayManagerState, value?: boolean): void

  // Lifecycle
  initialize(
    adBreakManager: AdBreakManager,
    playHistory: PlayHistory,
    geoBlockManager: GeoBlockManager,
    fallbackProvider?: (item: QueueItem) => unknown
  ): void
  dispose(): void

  // Playback control
  playSource(
    source: PlaySource,
    sound: Sound | null,
    layoutInfo: LayoutInfo,
    options?: PlayOptions
  ): void
  toggleSource(
    source: PlaySource,
    layoutInfo: LayoutInfo,
    options?: PlayOptions
  ): void
  playCurrent(options?: PlayOptions): void
  pauseCurrent(options?: { seek?: number }): void
  toggleCurrent(options?: PlayOptions): void
  playNext(options?: PlayOptions): void
  playPrev(options?: PlayOptions): void

  // Seek
  seekCurrentBy(resolver: (sound: Sound) => number): void
  seekCurrentTo(resolver: (sound: Sound) => number): void

  // Queue management
  setCurrentItem(item: QueueItem, options?: PlayOptions): void
  removeItem(item: QueueItem): void
  clearQueue(): void
  replaceQueue(items: QueueItem[], cursor: number, options?: PlayOptions): void
  getQueue(): QueueCollection
  getQueueState(): QueueState

  // Explicit queue
  addExplicitQueueItem(
    source: PlaySource,
    sound: Sound,
    contextSnapshot: ContextSnapshot
  ): void
  createExplicitQueueItem(
    source: PlaySource,
    sound: Sound,
    contextSnapshot: ContextSnapshot
  ): QueueItem
  injectExplicitQueueItem(item: QueueItem): void
  cloneQueueItemToExplicit(item: QueueItem): void

  // Shuffle
  toggleShuffle(): void

  // Repeat
  cycleRepeatMode(): void
  setRepeatMode(mode: RepeatMode): void

  // Source initialization
  setInitialSource(
    source: PlaySource,
    priority?: number,
    layoutInfo?: LayoutInfo
  ): void
  unsetInitialSource(source: PlaySource): void
  setInitialHistorySource(source: PlaySource, layoutInfo: LayoutInfo): void

  // Stream prefetch
  pullNext(count: number): void
  pullPrev(count: number): void

  // State queries
  isPlaying(): boolean
  isSourcePlaying(source: PlaySource): boolean
  isSourceActive(source: PlaySource): boolean
  hasNextSound(): boolean
  hasCurrentSound(): boolean
  hasMoreAhead(): boolean
  hasMoreBehind(): boolean
  hasFallback(): boolean

  // Current accessors
  getCurrentSound(): Sound | undefined
  getCurrentQueueItem(): QueueItem | undefined
  getCurrentMetadata(): QueueItem | undefined
  getCurrentMetadataEmptyReasons(): CurrentMetadataEmptyReasons

  // Autoplay / Restore
  enableAutoplay(): void
  restoreState(item?: QueueItem): void

  // Internal store
  restoreSoundStore: RestoreStateStore
}
export function getPlayManager() {
  return (
    (getModule(["restoreSoundStore"], false, getWebpackRequire()) as
      | PlayManager
      | undefined) || panic("Could not find the play manager module")
  )
}
