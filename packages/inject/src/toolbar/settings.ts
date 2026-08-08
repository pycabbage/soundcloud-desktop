import { invoke } from "@tauri-apps/api/core"
import { create } from "zustand"

interface AppSettings {
  discord_enabled: boolean
  start_minimized: boolean
  autostart: boolean
}

interface SettingsStore extends AppSettings {
  isLoaded: boolean
  initialize: () => Promise<void>
  setDiscordEnabled: (enabled: boolean) => Promise<void>
  setStartMinimized: (startMinimized: boolean) => Promise<void>
  setAutostart: (autostart: boolean) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  discord_enabled: true,
  start_minimized: false,
  autostart: false,
  isLoaded: false,
  initialize: async () => {
    const settings = await invoke<AppSettings>("get_settings")
    set({ ...settings, isLoaded: true })
  },
  setDiscordEnabled: async (enabled: boolean) => {
    await invoke("save_discord_enabled", { enabled })
    set({ discord_enabled: enabled })
  },
  setStartMinimized: async (startMinimized: boolean) => {
    await invoke("save_start_minimized", { startMinimized })
    set({ start_minimized: startMinimized })
  },
  setAutostart: async (autostart: boolean) => {
    await invoke("save_autostart", { autostart })
    set({ autostart })
  },
}))

void useSettingsStore.getState().initialize()
