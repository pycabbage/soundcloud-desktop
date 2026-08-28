/** A single handler entry in jQuery's event store. */
export interface JQueryEventEntry {
  handler: (...args: unknown[]) => unknown
}

/** The subset of a jQuery.Event read while intercepting a dispatch. */
export interface JQueryEvent {
  /** The native event jQuery wrapped, when there is one. */
  originalEvent?: DragEvent
  dataTransfer?: DataTransfer | null
  preventDefault(): void
}

/** A `jQuery.event.special[type]` entry, consulted by jQuery on every dispatch. */
export interface JQuerySpecialEvent {
  /** Runs before the bound handlers; returning false cancels the dispatch. */
  preDispatch?: (event: JQueryEvent) => boolean | void
}

/** jQuery-like API surface used by the inject script. */
export interface JQueryLike {
  /** Unique string marking jQuery-processed objects. */
  expando: string
  /** Internal data store (jQuery._data). Used to read bound event handlers. */
  _data: (elem: Element | Document, name: string) => Record<string, JQueryEventEntry[]> | undefined
  /** Prototype for jQuery-wrapped DOM objects. */
  fn: unknown
  /** jQuery's event subsystem. */
  event: {
    special: Record<string, JQuerySpecialEvent | undefined>
  }
}
