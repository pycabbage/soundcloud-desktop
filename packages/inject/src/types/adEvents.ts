/**
 * Ad event name constants defined in module 88.
 *
 * String values use the "ads:" prefix as found in the JS bundle analysis.
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
