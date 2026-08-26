import type { JQueryLike } from "../types/jquery.js"
import { panic } from "./utils"
import { getModule, getWebpackRequire } from "./webpack"

export function getJQuery() {
  return (
    (getModule(["expando", "_data", "fn"], false, getWebpackRequire()) as JQueryLike | undefined) ||
    panic("Could not find the jQuery module")
  )
}
