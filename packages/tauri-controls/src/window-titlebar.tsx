import { type } from "@tauri-apps/plugin-os"

import { cn } from "./libs/utils"
import type { WindowTitlebarProps } from "./types"
import { WindowControls } from "./window-controls"

export function WindowTitlebar({
  children,
  controlsOrder = "system",
  className,
  windowControlsProps,
  ...props
}: WindowTitlebarProps) {
  const left =
    controlsOrder === "left" ||
    (controlsOrder === "platform" && windowControlsProps?.platform === "macos") ||
    (controlsOrder === "system" && type() === "macos")

  const customProps = (ml: string) => {
    if (windowControlsProps?.justify !== undefined) return windowControlsProps

    const {
      justify: _windowControlsJustify,
      className: windowControlsClassName,
      ...restProps
    } = windowControlsProps || {}
    return {
      justify: false,
      className: cn(windowControlsClassName, ml),
      ...restProps,
    }
  }

  return (
    <div
      className={cn("bg-background flex select-none flex-row overflow-hidden", className)}
      data-tauri-drag-region
      {...props}
    >
      {left ? (
        <>
          <WindowControls {...customProps("ml-0")} />
          {children}
        </>
      ) : (
        <>
          {children}
          <WindowControls {...customProps("ml-auto")} />
        </>
      )}
    </div>
  )
}
