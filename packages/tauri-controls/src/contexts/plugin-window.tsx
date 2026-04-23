import { getCurrentWindow } from "@tauri-apps/api/window"
import { type } from "@tauri-apps/plugin-os"
import type React from "react"
import { useEffect } from "react"
import { create } from "zustand"

export const appWindow = getCurrentWindow()

interface WindowState {
  isWindowMaximized: boolean
}

export const useWindowStore = create<WindowState>()(() => ({
  isWindowMaximized: false,
}))

interface TauriAppWindowProviderProps {
  children: React.ReactNode
}

export function TauriAppWindowProvider({
  children,
}: TauriAppWindowProviderProps) {
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const init = async () => {
      const isMaximized = await appWindow.isMaximized()
      useWindowStore.setState({ isWindowMaximized: isMaximized })

      // temporary: https://github.com/agmmnn/tauri-controls/issues/10#issuecomment-1675884962
      if (type() !== "macos") {
        unlisten = await appWindow.onResized(async () => {
          const maximized = await appWindow.isMaximized()
          useWindowStore.setState({ isWindowMaximized: maximized })
        })
      }
    }

    init()

    return () => {
      unlisten?.()
    }
  }, [])

  return <>{children}</>
}
