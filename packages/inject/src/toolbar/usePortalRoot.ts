import { useContext } from "react"
import { panic } from "../lib/utils"
import { ShadowRootContext } from "."

export function usePortalRoot(): Element {
  const shadowRoot =
    useContext(ShadowRootContext) ??
    panic("usePortalRoot must be used within a ShadowRootContext.Provider")
  const portalRoot =
    shadowRoot.getElementById("portal-root") ??
    panic("Portal root element with id 'portal-root' not found in Shadow DOM")

  return portalRoot
}
