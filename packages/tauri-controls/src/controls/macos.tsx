import { type HTMLProps, useEffect, useState } from "react"
import { Button } from "../components/button"
import { Icons } from "../components/icons"
import { appWindow } from "../contexts/plugin-window"
import { cn } from "../libs/utils"

export function MacOS({ className, ...props }: HTMLProps<HTMLDivElement>) {
  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const last = isAltKeyPressed ? <Icons.plusMac /> : <Icons.fullMac />

  useEffect(() => {
    const handleAltKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsAltKeyPressed(true)
      }
    }
    const handleAltKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsAltKeyPressed(false)
      }
    }

    window.addEventListener("keydown", handleAltKeyDown)
    window.addEventListener("keyup", handleAltKeyUp)

    return () => {
      window.removeEventListener("keydown", handleAltKeyDown)
      window.removeEventListener("keyup", handleAltKeyUp)
    }
  }, [])

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: window controls hover detection
    <div
      className={cn(
        "space-x-2 px-3 text-black active:text-black dark:text-black",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      <Button
        onClick={() => appWindow.close()}
        className="aspect-square h-3 w-3 cursor-default content-center items-center justify-center self-center rounded-full border border-black/12 bg-[#ff544d] text-center text-black/60 hover:bg-[#ff544d] active:bg-[#bf403a] active:text-black/60 dark:border-none"
      >
        {isHovering && <Icons.closeMac />}
      </Button>
      <Button
        onClick={() => appWindow.minimize()}
        className="aspect-square h-3 w-3 cursor-default content-center items-center justify-center self-center rounded-full border border-black/12  bg-[#ffbd2e] text-center text-black/60 hover:bg-[#ffbd2e] active:bg-[#bf9122] active:text-black/60 dark:border-none"
      >
        {isHovering && <Icons.minMac />}
      </Button>
      <Button
        onClick={async () => {
          if (isAltKeyPressed) {
            await appWindow.toggleMaximize()
          } else {
            const isFullscreen = await appWindow.isFullscreen()
            await appWindow.setFullscreen(!isFullscreen)
          }
        }}
        className="aspect-square h-3 w-3 cursor-default content-center items-center justify-center self-center rounded-full border border-black/12 bg-[#28c93f] text-center text-black/60 hover:bg-[#28c93f] active:bg-[#1e9930] active:text-black/60 dark:border-none"
      >
        {isHovering && last}
      </Button>
    </div>
  )
}
