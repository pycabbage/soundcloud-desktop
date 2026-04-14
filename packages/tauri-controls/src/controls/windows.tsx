import type { HTMLProps } from "react"
import { Button } from "../components/button"
import { Icons } from "../components/icons"
import { useWindowStore } from "../contexts/plugin-window"
import { cn } from "../libs/utils"

export function Windows({ className, ...props }: HTMLProps<HTMLDivElement>) {
  const { isWindowMaximized, minimizeWindow, maximizeWindow, closeWindow } =
    useWindowStore()

  return (
    <div className={cn("h-[32px]", className)} {...props}>
      <Button
        onClick={minimizeWindow}
        className="h-full w-[46px] cursor-default rounded-none bg-transparent text-black/90 hover:bg-black/5 active:bg-black/3  dark:text-white dark:hover:bg-white/6 dark:active:bg-white/4"
      >
        <Icons.minimizeWin />
      </Button>
      <Button
        onClick={maximizeWindow}
        className={cn(
          "h-full w-[46px] cursor-default rounded-none bg-transparent",
          "text-black/90 hover:bg-black/5 active:bg-black/3 dark:text-white dark:hover:bg-white/6 dark:active:bg-white/4"
        )}
      >
        {!isWindowMaximized ? (
          <Icons.maximizeWin />
        ) : (
          <Icons.maximizeRestoreWin />
        )}
      </Button>
      <Button
        onClick={closeWindow}
        className="h-full w-[46px] cursor-default rounded-none bg-transparent text-black/90 hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90 dark:text-white"
      >
        <Icons.closeWin />
      </Button>
    </div>
  )
}
