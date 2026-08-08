import { WindowTitlebar } from "@soundcloud-desktop/tauri-controls"
import { useId } from "react"

import { cn } from "../utils/cn"
import List from "./ic_fluent_list_24_filled.svg"
import { CheckboxMenuItem, MenuButton } from "./menu"
import { useSettingsStore } from "./settings"

export function Titlebar() {
  const navId = useId()
  const {
    discord_enabled,
    start_minimized,
    autostart,
    setDiscordEnabled,
    setStartMinimized,
    setAutostart,
  } = useSettingsStore()

  return (
    <WindowTitlebar className="h-titlebar region-drag">
      <nav
        aria-label="Application Menu"
        className={cn(
          "flex px-2 items-center gap-1",
          "bg-background-surface-light dark:bg-background-surface-dark",
          "select-none touch-manipulation"
        )}
      >
        <button
          type="button"
          popoverTarget={navId}
          popoverTargetAction="toggle"
          aria-label="Open menu"
          aria-haspopup="menu"
          aria-controls={navId}
          className={cn(
            "w-6 h-6 p-1 rounded outline-none region-no-drag",
            "flex items-center justify-center shrink-0",
            "text-primary-light dark:text-primary-dark",
            "hover:bg-highlight-light dark:hover:bg-highlight-dark",
            "active:scale-90 transition-colors duration-150"
          )}
          style={{ anchorName: `--anchor-${navId}` }}
        >
          <List aria-hidden="true" focusable={false} className={cn("w-4 h-4", "fill-current")} />
        </button>

        <div
          id={navId}
          popover="auto"
          role="menu"
          aria-label="Application Menu"
          className={cn(
            "absolute m-0",
            "top-0 right-auto bottom-auto left-[anchor(right)]",
            "h-titlebar px-1",
            "[&:popover-open]:flex flex-row items-center gap-1",
            "shadow-none border-0",
            "[transition:display_150ms]",
            "transition-discrete",
            "bg-background-surface-light dark:bg-background-surface-dark",
            "select-none touch-manipulation"
          )}
          style={{ positionAnchor: `--anchor-${navId}` }}
        >
          <MenuButton label="Settings">
            <CheckboxMenuItem
              label="Discord Rich Presence"
              checked={discord_enabled}
              onChange={() => setDiscordEnabled(!discord_enabled)}
            />
            <CheckboxMenuItem
              label="Start Minimized"
              checked={start_minimized}
              onChange={() => setStartMinimized(!start_minimized)}
            />
            <CheckboxMenuItem
              label="Launch at Startup"
              checked={autostart}
              onChange={() => setAutostart(!autostart)}
            />
          </MenuButton>
        </div>
      </nav>
    </WindowTitlebar>
  )
}
