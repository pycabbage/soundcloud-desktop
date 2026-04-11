import { MenuBar, MenuButton, MenuItem, SubMenuItem } from "./menu"

export function Titlebar() {
  return (
    <MenuBar className="flex items-center h-8 bg-zinc-900 text-white select-none touch-manipulation">
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
    </MenuBar>
  )
}
