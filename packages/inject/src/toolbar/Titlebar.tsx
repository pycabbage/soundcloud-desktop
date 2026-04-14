import { invoke } from "@tauri-apps/api/core"
import { MenuButton, MenuItem, SubMenuItem } from "./menu"

export function Titlebar() {
  return (
    <nav
      aria-label="Application Menu"
      className="flex items-center h-8 min-w-screen w-screen select-none touch-manipulation"
      onMouseDown={(e) => {
        const interactiveElements = new Set(["BUTTON", "A"])
        console.log(e.button)
        if (
          e.target instanceof HTMLElement &&
          !interactiveElements.has(e.target.tagName)
        ) {
          invoke("plugin:window|start_dragging")
        }
      }}
    >
      <h1 className="px-2 text-sm font-bold underline">SoundCloud Desktop</h1>

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
  )
}
