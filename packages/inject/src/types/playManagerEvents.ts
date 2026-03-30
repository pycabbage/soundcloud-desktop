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
