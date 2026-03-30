/**
 * UI component tracking object, passed to "change:playQueueResumed".
 * Returned by view.getTrackingUiComponent() at each call site.
 */
export interface UiComponent {
  ui_component_name: string | null
  ui_component_urn: string | null
}
