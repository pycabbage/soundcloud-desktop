import { WindowTitlebar } from "@soundcloud-desktop/tauri-controls"
import { cn } from "../utils/cn"
import { MenuButton, MenuItem, SubMenuItem } from "./menu"

export function Titlebar() {
  return (
    <WindowTitlebar
      className="h-titlebar region-drag"
    >
      <nav
        aria-label="Application Menu"
        className={cn(
          "flex px-2 items-center",
          "bg-background-surface-light dark:bg-background-surface-dark",
          "select-none touch-manipulation"
        )}
      >
        <MenuButton label="Settings">
          <MenuItem
            label="Preferences"
            onClick={() => console.log("open prefs")}
          />
          <SubMenuItem label="Audio">
            <MenuItem label="Input Device" />
            <MenuItem label="Output Device" />
            <SubMenuItem label="Advanced">
              <MenuItem label="Buffer Size" />
            </SubMenuItem>
          </SubMenuItem>
          <MenuItem label="About" />
        </MenuButton>
      </nav>
    </WindowTitlebar>
  )
}
