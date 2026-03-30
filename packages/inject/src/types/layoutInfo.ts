/**
 * Current page layout context, captured from the router at play time.
 * Part of ContextSnapshot (module 266 — getCurrentLayoutInfo).
 */
export interface LayoutInfo {
  /** Route argument map from the current router state. */
  args: Record<string, unknown>
  /** Layout name, e.g. "user", "discover", "listen". */
  layoutName: string
  /** Current URL path + query string + hash fragment. */
  url: string
}
