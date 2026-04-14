import { useEffect, useState } from "react"
import { TauriAppWindowProvider } from "./contexts/plugin-window"
import { Gnome, MacOS, Windows } from "./controls/index"
import { getOsType } from "./libs/plugin-os"
import { cn } from "./libs/utils"
import type { WindowControlsProps } from "./types"

export function WindowControls({
  platform,
  justify = false,
  hide = false,
  hideMethod = "display",
  className,
  ...props
}: WindowControlsProps) {
  const [osType, setOsType] = useState<string | undefined>(undefined)

  useEffect(() => {
    setOsType(getOsType())
  }, [])

  const customClass = cn(
    "flex",
    className,
    hide && (hideMethod === "display" ? "hidden" : "invisible")
  )

  const resolvedPlatform =
    platform ??
    (() => {
      switch (osType) {
        case "macos":
          return "macos"
        case "linux":
          return "gnome"
        default:
          return "windows"
      }
    })()

  const renderControls = () => {
    switch (resolvedPlatform) {
      case "windows":
        return (
          <Windows
            className={cn(customClass, justify && "ml-auto")}
            {...props}
          />
        )
      case "macos":
        return (
          <MacOS className={cn(customClass, justify && "ml-0")} {...props} />
        )
      case "gnome":
        return (
          <Gnome className={cn(customClass, justify && "ml-auto")} {...props} />
        )
      default:
        return (
          <Windows
            className={cn(customClass, justify && "ml-auto")}
            {...props}
          />
        )
    }
  }

  return <TauriAppWindowProvider>{renderControls()}</TauriAppWindowProvider>
}
