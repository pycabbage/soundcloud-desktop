/** A single handler entry in jQuery's event store. */
export interface JQueryEventEntry {
  handler: (...args: unknown[]) => unknown
}

/** jQuery-like API surface used by the inject script. */
export interface JQueryLike {
  /** Unique string marking jQuery-processed objects. */
  expando: string
  /** Internal data store (jQuery._data). Used to read bound event handlers. */
  _data: (elem: Element | Document, name: string) => Record<string, JQueryEventEntry[]> | undefined
  /** Prototype for jQuery-wrapped DOM objects. */
  fn: unknown
}
