import { createContext } from "react"
import { createRoot } from "react-dom/client"
import { Titlebar } from "./Titlebar"
import tailwind from "./tailwind.css"

export const ShadowRootContext = createContext<ShadowRoot | null>(null)

export function insertTitlebar() {
  const host = document.createElement("div")
  host.id = "inject-titlebar-host"
  host.style.position = "fixed"
  host.style.top = "0"
  host.style.left = "0"
  host.style.zIndex = "9999"
  host.style.width = "100%"

  document.body.appendChild(host)

  const shadowRoot = host.attachShadow({ mode: "open" })
  const container = document.createElement("div")
  shadowRoot.appendChild(container)

  const style = new CSSStyleSheet()
  style.replaceSync(tailwind)
  shadowRoot.adoptedStyleSheets.push(style)

  const portalRoot = document.createElement("div")
  portalRoot.id = "portal-root"
  shadowRoot.appendChild(portalRoot)

  const root = createRoot(container, {
    identifierPrefix: "inject-titlebar",
  })
  root.render(
    <ShadowRootContext.Provider value={shadowRoot}>
      <Titlebar />
    </ShadowRootContext.Provider>
  )
}
