import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"

import { getModule, getWebpackRequire } from "./webpack"

type Theme = "dark" | "light" | null

function getTheme(): Theme {
  const { classList } = document.body
  if (classList.contains("theme-dark")) return "dark"
  if (classList.contains("theme-light")) return "light"
  return null
}

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  subscribeWithSelector((set) => ({
    theme: null,
    setTheme: (theme) => set({ theme }),
  }))
)

/**
 * Subscribes to the vendor ThemeStore singleton so theme switches are pushed
 * to us instead of observed from the DOM.
 */
function connectVendorTheme(): void {
  try {
    const vendor = getModule(
      ["getTheme", "setTheme", "onThemeChange"],
      false,
      getWebpackRequire()
    ) as
      | {
          default?: {
            getTheme: () => "dark" | "light" | "automatic"
            onThemeChange: (listener: () => void) => () => void
          }
          getTheme?: () => "dark" | "light" | "automatic"
          onThemeChange?: (listener: () => void) => () => void
        }
      | undefined
    const store = vendor?.default ?? vendor
    if (!store || typeof store.onThemeChange !== "function") {
      console.warn("[sc-desktop] vendor theme store not found")
      return
    }

    const sync = () => {
      useThemeStore.getState().setTheme(getTheme())
    }
    sync()
    store.onThemeChange(sync)
  } catch (e) {
    console.warn("[sc-desktop] failed to connect vendor theme store:", e)
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", connectVendorTheme, { once: true })
} else {
  connectVendorTheme()
}
