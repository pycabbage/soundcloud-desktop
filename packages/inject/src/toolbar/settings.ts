import { invoke } from "@tauri-apps/api/core"
import { create } from "zustand"

import { setSessionReplayEnabled as applySessionReplay } from "../lib/sentry"

interface AppSettings {
  discord_enabled: boolean
  start_minimized: boolean
  autostart: boolean
  session_replay_enabled: boolean
}

interface SettingsStore extends AppSettings {
  isLoaded: boolean
  initialize: () => Promise<void>
  setDiscordEnabled: (enabled: boolean) => Promise<void>
  setStartMinimized: (startMinimized: boolean) => Promise<void>
  setAutostart: (autostart: boolean) => Promise<void>
  setSessionReplayEnabled: (enabled: boolean) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  discord_enabled: true,
  start_minimized: false,
  autostart: false,
  session_replay_enabled: false,
  isLoaded: false,
  initialize: async () => {
    const settings = await invoke<AppSettings>("get_settings")
    await applySessionReplay(settings.session_replay_enabled)
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
  setSessionReplayEnabled: async (enabled: boolean) => {
    await invoke("save_session_replay_enabled", { enabled })
    await applySessionReplay(enabled)
    set({ session_replay_enabled: enabled })
  },
}))

void useSettingsStore.getState().initialize()
