/**
 * Messages sent from the Webi host to the V2 iframe.
 * Dispatched by V2BridgePlayer methods via window.parent.postMessage.
 */
export type WebiToV2Message =
  | { kind: "play-track-urn"; trackUrn: string }
  | { kind: "play" }
  | { kind: "pause" }
  | { kind: "seek"; time: number }
  | { kind: "adjust-volume"; volume: number }
  | { kind: "set-muted"; muted: boolean }
  | { kind: "navigate"; href: string; openInNewTab?: boolean; hard?: boolean }
  | { kind: "ready" }
  | { kind: "route-change" }
  | { kind: "refresh-webi-module"; module: string }
