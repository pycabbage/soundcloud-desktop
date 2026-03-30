import type { QueueItem } from "./queueItem.js"
import type { Sound } from "./sound.js"
import type { UiComponent } from "./uiComponent.js"
import type { RepeatMode } from "./utils.js"

/**
 * Callback signatures for all PlayManager events.
 *
 * "change:currentSound" — triggered by two sites:
 *   Site A (PlayQueue.setAudioCursor): no extra args.
 *   Site B (PlayManager.setCurrentItem): passes { current: Sound }.
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
  "change:currentSound": (payload?: { current: Sound }) => void
  "change:repeatMode": (mode: RepeatMode) => void
  "add:trackAddedToPlayQueue": (payload: {
    queueItem: QueueItem
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
