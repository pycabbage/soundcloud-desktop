/**
 * SoundCloud System A — Event constants and typed event maps
 *
 * Module 196: PlayManager event-name constants
 * Module 88:  Ad event-name constants
 */

// ---------------------------------------------------------------------------
// System A — RepeatMode
// Source: module 91 in 55-ef1f6ed4.js
// ---------------------------------------------------------------------------

/** Repeat mode values for System A (PlayManager). */
export type RepeatMode = "all" | "none" | "one"

// ---------------------------------------------------------------------------
// PlayManager event-name constants (module 196)
// ---------------------------------------------------------------------------

/** Event name constants defined in module 196. */
export const PlayManagerEvents = {
  QUEUE_RESET: "queueReset",
  CHANGE_CURRENT_SOUND: "change:currentSound",
  CHANGE_REPEAT_MODE: "change:repeatMode",
  ADD_PLAYQUEUE_ADDED_SOUND: "add:trackAddedToPlayQueue",
  PLAYQUEUE_RESUMED: "change:playQueueResumed",
} as const

export type PlayManagerEventName =
  (typeof PlayManagerEvents)[keyof typeof PlayManagerEvents]

// ---------------------------------------------------------------------------
// Ad event-name constants (module 88)
// ---------------------------------------------------------------------------

/**
 * Ad event name constants defined in module 88.
 *
 * @note String values use the "ads:" prefix as found in the JS bundle analysis.
 * FINAL_REPORT.md lists the unprefixed forms ("change:adSkippability", "endAdBreak",
 * "change:currentAdSound") — these appear to be the older System A internal names.
 * The "ads:"-prefixed forms are used in the current codebase.
 */
export const AdEvents = {
  CHANGE_CURRENT_AD_SOUND: "ads:changeCurrentAdSound",
  CHANGE_AD_SKIPPABILITY: "ads:changeAdSkippability",
  END_AD_BREAK: "ads:endAdBreak",
  DISMISS_LEAVE_BEHIND: "ads:dismissLeaveBehind",
} as const

// ---------------------------------------------------------------------------
// Supporting types for event payloads
// ---------------------------------------------------------------------------

/**
 * UI component tracking object, passed to "change:playQueueResumed".
 * Returned by view.getTrackingUiComponent() at each call site.
 */
export interface UiComponent {
  ui_component_name: string | null
  ui_component_urn: string | null
}

// ---------------------------------------------------------------------------
// PlayManager typed event map
//
// Maps event name strings to their callback signatures.
// Used to provide type-safe overloads on PlayManager.on() / .listenTo() etc.
// ---------------------------------------------------------------------------

/**
 * Callback signatures for all PlayManager events.
 *
 * "change:currentSound" — triggered by two sites:
 *   Site A (PlayQueue.setAudioCursor): no extra args.
 *   Site B (PlayManager.setCurrentItem): passes { current: QueueItem }.
 *   Callbacks should treat the argument as optional.
 *
 * "change:playQueueResumed" — only fires when userInitiated is true.
 *   uiComponent is undefined when triggered via keyboard shortcut.
 *
 * "state:*" — each fires with the new boolean value.
 */
export interface PlayManagerEventMap {
  // Named events (module 196)
  queueReset: () => void
  "change:currentSound": (payload?: { current: unknown }) => void
  "change:repeatMode": (mode: RepeatMode) => void
  "add:trackAddedToPlayQueue": (payload: {
    queueItem: unknown
    from: "next_up" | "autoplay"
  }) => void
  "change:playQueueResumed": (uiComponent?: UiComponent) => void

  // State events (triggered via toggleState / module 566)
  "state:globalPlayLock": (value: boolean) => void
  "state:hasNext": (value: boolean) => void
  "state:hasCurrent": (value: boolean) => void
  "state:shuffle": (value: boolean) => void
  "state:fallbackEnabled": (value: boolean) => void
  "state:hasFallback": (value: boolean) => void
}

// ---------------------------------------------------------------------------
// Sound typed event map
// ---------------------------------------------------------------------------

/**
 * Base event object passed to every Sound player event callback.
 * Built in 54-8313710f.js: { type, sound, model, ...rawPlayerEvent }
 */
export interface SoundEventObject {
  type: string
  sound: unknown // Sound instance — typed as unknown to avoid circular import
  model: unknown // Same Sound instance
  [key: string]: unknown
}

/** Event object for "playerError" — includes the Error instance. */
export interface SoundErrorEventObject extends SoundEventObject {
  type: "playerError"
  error: Error
}

/** Event object for "qualityChanged" — includes the new quality string. */
export interface SoundQualityChangedEventObject extends SoundEventObject {
  type: "qualityChanged"
  quality: string
}

/**
 * Callback signatures for all Sound model events.
 *
 * The internal scaudioPlayer bridge subscribes to RxJS-style signals
 * and re-fires them as Backbone events via sound.trigger(name, eventObj).
 * Every callback receives a SoundEventObject as its first argument.
 *
 * Position queries:
 *   sound.on("time", e => { const posMs = e.sound.currentTime(); })
 */
export interface SoundEventMap {
  // Player lifecycle events
  play: (event: SoundEventObject) => void
  pause: (event: SoundEventObject) => void
  playStart: (event: SoundEventObject) => void
  finish: (event: SoundEventObject) => void
  time: (event: SoundEventObject) => void
  seeked: (event: SoundEventObject) => void
  "buffering:start": (event: SoundEventObject) => void
  "buffering:end": (event: SoundEventObject) => void
  playerError: (event: SoundErrorEventObject) => void
  qualityChanged: (event: SoundQualityChangedEventObject) => void
  dead: (event: SoundEventObject) => void

  // Model / state events
  "change:playable": (playable: boolean) => void
  "change:user": () => void
  // NOTE: "change:explicit" is fired by QueueItem (module 182), not by Sound directly.
  //   Listen on a QueueItem instance, not on Sound.
  error: (model: unknown, error: Error) => void
}

// ---------------------------------------------------------------------------
// Global event bus (n(10)) event map
// ---------------------------------------------------------------------------

/**
 * Events emitted on the global event bus (module 10).
 *
 * Every Sound player event is forwarded as "audio:" + eventName.
 * The payload is identical to the corresponding SoundEventMap callback arg.
 * Cast session events are also dispatched on the global bus.
 */
export interface GlobalEventBusEventMap {
  // Audio forwarding (mirrors SoundEventMap with "audio:" prefix)
  "audio:play": (event: SoundEventObject) => void
  "audio:pause": (event: SoundEventObject) => void
  "audio:playStart": (event: SoundEventObject) => void
  "audio:finish": (event: SoundEventObject) => void
  "audio:time": (event: SoundEventObject) => void
  "audio:seeked": (event: SoundEventObject) => void
  "audio:buffering:start": (event: SoundEventObject) => void
  "audio:buffering:end": (event: SoundEventObject) => void
  "audio:playerError": (event: SoundErrorEventObject) => void
  "audio:qualityChanged": (event: SoundQualityChangedEventObject) => void
  "audio:dead": (event: SoundEventObject) => void

  // Google Cast session events
  "googleCast:start": () => void
  "googleCast:end": () => void
  "googleCast:audioHijack": () => void
  "googleCast:audioRestored": () => void
}
