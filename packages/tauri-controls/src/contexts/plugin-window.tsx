import { getCurrentWindow } from "@tauri-apps/api/window"
import type React from "react"
import { useEffect } from "react"
import { create } from "zustand"
import { getOsType } from "../libs/plugin-os"

const appWindow = getCurrentWindow()

interface WindowState {
  isWindowMaximized: boolean
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  fullscreenWindow: () => Promise<void>
  closeWindow: () => Promise<void>
}

export const useWindowStore = create<WindowState>()((_set) => ({
  isWindowMaximized: false,
  minimizeWindow: async () => {
    await appWindow.minimize()
  },
  maximizeWindow: async () => {
    await appWindow.toggleMaximize()
  },
  fullscreenWindow: async () => {
    const fullscreen = await appWindow.isFullscreen()
    await appWindow.setFullscreen(!fullscreen)
  },
  closeWindow: async () => {
    await appWindow.close()
  },
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

      const osType = getOsType()
      // temporary: https://github.com/agmmnn/tauri-controls/issues/10#issuecomment-1675884962
      if (osType !== "macos") {
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
