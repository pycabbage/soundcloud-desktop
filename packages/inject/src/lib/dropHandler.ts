import type { JQueryEvent } from "../types/jquery.js"
import { enqueueDroppedUrl } from "./dropUrl"
import { getJQuery } from "./jquery"

/** Extracts the first http(s) URL from the dropped plain text, if any. */
function extractDroppedUrl(e: { dataTransfer?: DataTransfer | null }): string | null {
  const text = e.dataTransfer?.getData("text/plain") ?? e.dataTransfer?.getData("text/uri-list")
  if (!text) return null
  for (const line of text.split(/\r?\n/)) {
    const candidate = line.trim()
    if (candidate.startsWith("https://") || candidate.startsWith("http://")) {
      return candidate
    }
  }
  return null
}

/** Queues a dropped URL, logging failures instead of surfacing them. */
async function queueDroppedUrl(url: string) {
  try {
    await enqueueDroppedUrl(url)
  } catch (err) {
    console.warn("[sc-desktop] failed to queue dropped url:", url, err)
  }
}

/** Queues SoundCloud URLs and cancels the dispatch; other drops fall through. */
function preDispatchDrop(event: JQueryEvent): boolean | void {
  const url = extractDroppedUrl(event.originalEvent ?? event)
  if (!url) return
  void queueDroppedUrl(url)
  event.preventDefault()
  return false
}

/** Hooks jQuery's drop dispatch so URL drops become "Next up" queue additions. */
export function installDropUrlHandler(): void {
  try {
    const { special } = getJQuery().event
    special.drop = { ...special.drop, preDispatch: preDispatchDrop }
    console.debug("[sc-desktop] hooked jQuery drop dispatch for URL queuing")
  } catch (e) {
    console.warn("[sc-desktop] failed to hook drop dispatch:", e)
  }
}
