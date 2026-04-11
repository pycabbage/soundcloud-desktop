import { useContext } from "react"
import { ShadowRootContext } from "."

export function usePortalRoot(): Element {
  const shadowRoot = useContext(ShadowRootContext)
  if (!shadowRoot) {
    throw new Error(
      "usePortalRoot must be used within a ShadowRootContext.Provider"
    )
  }

  const portalRoot = shadowRoot.getElementById("portal-root")
  if (!portalRoot) {
    throw new Error(
      "Portal root element with id 'portal-root' not found in Shadow DOM"
    )
  }

  return portalRoot
}
