/**
 * SoundCloud type definitions — public entry point
 *
 * System A (old UI — webpack v4, window.webpackJsonp):
 *   PlayManager  — module 21 singleton (PlayManager interface)
 *   Sound        — track model (Sound interface)
 *   QueueItem    — queue entry (QueueItem interface)
 *   PlayQueue    — queue collection (PlayQueue interface)
 *
 * System B (new UI — webpack v5 / Next.js, self.webpackChunk_N_E):
 *   IPlayer       — shared interface for module 83585 singleton
 *   NativePlayer  — concrete class on normal soundcloud.com pages
 *   V2BridgePlayer — concrete class inside the V2 embedded iframe
 *   PlayerSingleton — union of the above two
 *   Queue          — simple track queue (System B)
 *   Track          — track data shape used by System B
 */

// --- System A: Events and constants ---
export type {
  AdEventName,
  GlobalEventBusEventMap,
  PlayManagerEventMap,
  PlayManagerEventName,
  RepeatMode,
  RepeatModeConstants,
  SoundErrorEventObject,
  SoundEventMap,
  SoundEventObject,
  SoundQualityChangedEventObject,
  UiComponent,
} from "./events.js"

export { AdEvents, PlayManagerEvents } from "./events.js"
// --- System B: Player types ---
export type {
  IPlayer,
  NativePlayer,
  PlayerChangeEvent,
  PlayerOptions,
  PlayerSingleton,
  Queue,
  RepeatModeB,
  SCAudioPlayer,
  Signal,
  V2Bridge,
  V2BridgePlayer,
} from "./native-player.js"

// --- System A: PlayManager, QueueItem, PlayQueue ---
export type {
  GlobalEventBus,
  PlayManager,
  PlayManagerConfig,
  PlayManagerStateName,
  PlayManagerStates,
  PlayQueue,
  PlaySource,
  QueueItem,
  QueueState,
} from "./play-manager.js"
// --- System A: Sound model ---
export type {
  GeoBlocking,
  Sound,
  SoundSharing,
  SoundState,
  SoundStates,
  SourceInfo,
  TrackShareAccess,
  Visual,
} from "./sound.js"
// --- System B: Track and related types ---
export type {
  Authorization,
  DisabledReason,
  HasNoTranscodings,
  IsBlocked,
  IsDisabled,
  IsGeoBlocked,
  IsPlayable,
  IsSnipped,
  IsSubHighTier,
  Track,
  TrackUser,
  Transcoding,
  TranscodingFormat,
  V2PlaybackState,
  V2ToWebiMessage,
  WebiToV2Message,
} from "./track.js"
