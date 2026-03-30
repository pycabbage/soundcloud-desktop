import type { NativePlayer } from "./nativePlayer.js"
import type { V2BridgePlayer } from "./v2BridgePlayer.js"

/**
 * The type of the singleton exported as module 83585's `A` property.
 *
 * On normal soundcloud.com pages: NativePlayer
 * Inside the V2 iframe: V2BridgePlayer
 */
export type PlayerSingleton = NativePlayer | V2BridgePlayer
