import type { JQueryLike } from "../types/jquery.js"
import { enqueueDroppedUrl } from "./dropUrl"
import { getJQuery } from "./jquery"

/**
 * Modifies the web app's existing document-level drop handler (jQuery-bound
 * by the upload-target view) so that dropping a SoundCloud track/playlist URL
 * queues it as a "Next Up" track.
 *
 * No new event listeners are added: the vendor code already binds
 * dragover/drop/dragenter/dragleave on `document` via jQuery. We locate that
 * binding in jQuery's event store and replace the stored handler with a
 * wrapper — SoundCloud URLs are queued, everything else is delegated to the
 * original handler unchanged.
 */

/** Extracts the first http(s) URL from the dropped plain text, if any. */
function extractDroppedUrl(e: DragEvent): string | null {
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

const PATCH_RETRY_DELAY_MS = 500
const PATCH_MAX_RETRIES = 60

interface DropHandlerEntry {
  handler: (...args: unknown[]) => unknown
}

/**
 * The vendor binds its drop handler some time after our injection, so poll
 * until the binding appears (bounded retries). Resolves with the entry when
 * found, or undefined if it never appears.
 */
function waitForDropEntry(
  $: JQueryLike,
  attempt: number
): Promise<{ entry: DropHandlerEntry } | undefined> {
  const events = $._data(document, "events")
  const entry = events?.drop?.[0]
  if (entry) {
    return Promise.resolve({
      entry,
    })
  }
  if (attempt >= PATCH_MAX_RETRIES) {
    console.warn("[sc-desktop] no bound drop handler found; URL queuing disabled")
    return Promise.resolve(undefined)
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve(waitForDropEntry($, attempt + 1)), PATCH_RETRY_DELAY_MS)
  })
}

/**
 * The vendor drop handler is synchronous and has to answer the event right
 * away, so queuing is started here and its failure only logged.
 */
async function queueDroppedUrl(url: string) {
  try {
    await enqueueDroppedUrl(url)
  } catch (err) {
    console.warn("[sc-desktop] failed to queue dropped url:", url, err)
  }
}

export async function installDropUrlHandler(): Promise<void> {
  try {
    const $ = getJQuery()
    const found = await waitForDropEntry($, 0)
    if (!found) return

    const { entry } = found
    const originalHandler = entry.handler

    entry.handler = function patchedDropHandler(this: unknown, ...args: unknown[]) {
      const e = args[0] as DragEvent
      const url = extractDroppedUrl(e)
      if (url) {
        void queueDroppedUrl(url)
        e.preventDefault()
        return false
      }
      return originalHandler.apply(this, args)
    }

    console.debug("[sc-desktop] patched document drop handler for URL queuing")
  } catch (e) {
    console.warn("[sc-desktop] failed to patch document drop handler:", e)
  }
}
