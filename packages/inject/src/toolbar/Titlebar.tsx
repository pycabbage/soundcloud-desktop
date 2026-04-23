import { WindowTitlebar } from "@soundcloud-desktop/tauri-controls"
import { useId } from "react"
import { cn } from "../utils/cn"
import { CheckboxMenuItem, MenuButton } from "./menu"
import { useSettingsStore } from "./settings"

const HAMBURGER_PATH =
  "M3 17H15C15.5523 17 16 17.4477 16 18C16 18.5128 15.614 18.9355 15.1166 18.9933L15 19H3C2.44772 19 2 18.5523 2 18C2 17.4872 2.38604 17.0645 2.88338 17.0067L3 17H15H3ZM3 11H21C21.5523 11 22 11.4477 22 12C22 12.5128 21.614 12.9355 21.1166 12.9933L21 13H3C2.44772 13 2 12.5523 2 12C2 11.4872 2.38604 11.0645 2.88338 11.0067L3 11H21H3ZM3 5H18C18.5523 5 19 5.44772 19 6C19 6.51284 18.614 6.93551 18.1166 6.99327L18 7H3C2.44772 7 2 6.55228 2 6C2 5.48716 2.38604 5.06449 2.88338 5.00673L3 5H18H3Z"

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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d={HAMBURGER_PATH} fill="currentColor" />
          </svg>
        </button>

        <div
          id={navId}
          popover="auto"
          role="menu"
          aria-label="Application Menu"
          className={cn(
            "nav-panel absolute m-0",
            "top-0 right-auto bottom-auto left-[anchor(right)]",
            "h-titlebar px-1",
            "flex flex-row items-center gap-1",
            "shadow-none border-0",
            "opacity-0 [&:popover-open]:opacity-100",
            "[transition:display_150ms,opacity_150ms]",
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
