import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"

type Theme = "dark" | "light" | null

function getTheme(): Theme {
  const { classList } = document.body
  if (classList.contains("theme-dark")) return "dark"
  if (classList.contains("theme-light")) return "light"
  return null
}

const observer = new MutationObserver(() => {
  useThemeStore.getState().setTheme(getTheme())
})

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  connected: boolean
  connect: () => void
  disconnect: () => void
}

export const useThemeStore = create<ThemeStore>()(
  subscribeWithSelector((set, get) => ({
    theme: null,
    setTheme: (theme) => set({ theme }),
    connected: false,
    connect: () => {
      if (get().connected) return

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            get().connect()
          },
          { once: true }
        )
        return
      }

      set({ theme: getTheme() })
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      })
      set({ connected: true })
    },
    disconnect: () => {
      observer.disconnect()
      set({ connected: false })
    },
  }))
)

useThemeStore.getState().connect()
