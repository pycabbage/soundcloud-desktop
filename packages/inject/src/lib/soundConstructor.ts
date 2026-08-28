import type { SoundConstructor } from "../types/soundConstructor"
import { panic } from "./utils"
import { getModule, getWebpackRequire } from "./webpack"

export function getSoundConstructor() {
  return (
    (getModule(["resolve", "normalize", "states"], false, getWebpackRequire()) as
      | SoundConstructor
      | undefined) || panic("Could not find the sound constructor module")
  )
}
