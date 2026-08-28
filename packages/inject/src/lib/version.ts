import { panic } from "./utils"
import { getModule, getWebpackRequire } from "./webpack"

declare global {
  interface Window {
    /** Unix-epoch build timestamp of the web app, e.g. `"1774492604"`. */
    __sc_version?: string
  }
}

/** The web app's build stamp, injected by the server as an inline script. */
export function getSoundCloudVersion(): string {
  return window.__sc_version ?? panic("window.__sc_version is not set")
}

interface BackboneExports {
  VERSION: string
  noConflict: () => BackboneExports
  emulateHTTP: boolean
  emulateJSON: boolean
}

/** Backbone's version, read from the legacy SPA runtime. */
export function getBackboneVersion(): string {
  const backbone = getModule(
    ["VERSION", "noConflict", "emulateHTTP", "emulateJSON"],
    false,
    getWebpackRequire()
  ) as BackboneExports | undefined
  return backbone?.VERSION ?? panic("Could not find Backbone module")
}

interface ReactExports {
  version: string
  createElement: (...args: unknown[]) => unknown
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: unknown
}

/** React's version, read from the standby iframe runtime. */
export function getReactVersion(): string {
  const react = getModule([
    "version",
    "createElement",
    "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
  ]) as ReactExports | undefined
  return react?.version ?? panic("Could not find React module")
}
