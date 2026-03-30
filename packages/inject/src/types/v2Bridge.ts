import type { WebiToV2Message } from "./webiToV2Message.js"

/**
 * V2Bridge — manages the postMessage channel between the Webi (new UI)
 * host window and the V2 (old UI) embedded iframe.
 *
 * Used internally by V2BridgePlayer to send control messages to System A.
 */
export interface V2Bridge {
  /** Trusted origins for postMessage communication. */
  readonly TRUSTED_V2_ORIGINS: readonly string[]

  /**
   * Initialize the bridge.
   * Only effective when window.self !== window.top (inside the V2 iframe).
   * Attaches the "message" event listener.
   */
  initialize(webiEmbedId: string): void

  /** Remove the "message" event listener. */
  teardown(): void

  /**
   * Send a message to the parent V2 window.
   */
  sendMessageToV2(message: object): Promise<void>

  /**
   * Navigate within V2.
   * @param href — target URL.
   * @param openInNewTab — open in a new browser tab.
   * @param hard — perform a hard (full-page) navigation.
   */
  navigateInV2(
    href: string,
    openInNewTab?: boolean,
    hard?: boolean
  ): Promise<void>

  /**
   * Signal that the Webi embed is ready.
   * Sends { kind: "ready" } once.
   */
  markAsReady(): Promise<void>

  /** Returns the webi embed ID Promise. */
  getWebiEmbedId(): Promise<string>

  /** Add a handler for incoming V2 messages. */
  addMessageHandler(handler: (data: WebiToV2Message) => void): void

  /** Remove a previously registered V2 message handler. */
  removeMessageHandler(handler: (data: WebiToV2Message) => void): void

  /** Returns true if the given MessageEvent origin is trusted. */
  isEventOriginTrusted(event: MessageEvent): boolean
}
