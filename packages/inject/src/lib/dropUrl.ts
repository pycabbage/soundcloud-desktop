import type { Sound } from "../types/sound"
import { getPlayManager } from "./playManager"
import { getSoundConstructor } from "./soundConstructor"
import { getModule, getWebpackRequire } from "./webpack"

/** Parsed track permalink. */
interface TrackPermalink {
  username: string
  permalink: string
}

/** A raw api-v2 payload for a single sound. */
type TrackPayload = Record<string, unknown>

const RESERVED_SEGMENTS = new Set([
  "discover",
  "upload",
  "settings",
  "you",
  "pages",
  "terms",
  "legal",
  "jobs",
  "imprint",
  "mobile",
  "notifications",
  "messages",
  "home",
])

function parseTrackPermalink(raw: string): TrackPermalink | null {
  // eslint-js/no-restricted-syntax -- narrowing the URL constructor result to
  // non-null requires a mutable binding inside try/catch.
  // oxlint-disable-next-line eslint-js/no-restricted-syntax -- see above
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null

  const host = url.hostname.toLowerCase()
  if (host !== "soundcloud.com" && host !== "www.soundcloud.com" && host !== "m.soundcloud.com") {
    return null
  }

  const parts = url.pathname.split("/").filter(Boolean)
  if (parts.length < 2) return null

  const username = parts[0]!
  const second = parts[1]!
  if (RESERVED_SEGMENTS.has(username.toLowerCase())) return null

  if (second.toLowerCase() === "sets") return null // playlists use the oEmbed path

  return { username, permalink: second }
}

/** Returns true when the URL is an on.soundcloud.com short link. */
export function isShortLink(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim())
    return parsed.hostname.toLowerCase() === "on.soundcloud.com" && parsed.pathname.length > 1
  } catch {
    return false
  }
}

/**
 * Resolves any SoundCloud URL (short links included) to `{ kind, id }` via the
 * public oEmbed endpoint, which is CORS-enabled for the page origin.
 */
async function resolveResourceId(
  url: string
): Promise<{ kind: "tracks" | "playlists"; id: number }> {
  const res = await fetch(
    `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`
  )
  if (!res.ok) {
    throw new Error(`oEmbed failed (${res.status})`)
  }
  const oembed = (await res.json()) as { html?: string }
  // The iframe src URL-encodes path separators (%2F).
  const decoded = (oembed.html ?? "").replace(/%2F/gi, "/")
  const match = decoded.match(/api\.soundcloud\.com\/(tracks|playlists)\/(\d+)/)
  if (!match) {
    throw new Error("URL is not a track or playlist")
  }
  return { kind: match[1] as "tracks" | "playlists", id: Number(match[2]) }
}

/** Returns the web app's public API client_id. */
function getClientId(): string {
  const config = getModule(["get", "set", "finalize"], false, getWebpackRequire()) as
    | { get?: (key: string) => unknown }
    | undefined
  const clientId = config?.get?.("client_id")
  if (typeof clientId !== "string" || clientId.length === 0) {
    throw new Error("Could not read client_id from the web app config")
  }
  return clientId
}

/** Hydrates a raw API payload into a Sound model instance. */
function hydrateSound(payload: Record<string, unknown>): Sound {
  const SoundCtor = getSoundConstructor()
  return new SoundCtor(SoundCtor.normalize(payload))
}

async function fetchPlaylistTracks(id: number): Promise<TrackPayload[]> {
  const res = await fetch(
    `https://api-v2.soundcloud.com/playlists/${id}?client_id=${getClientId()}`
  )
  if (!res.ok) {
    throw new Error(`playlist fetch failed (${res.status})`)
  }
  const playlist = (await res.json()) as { tracks?: Record<string, unknown>[] }
  const tracks = (playlist.tracks ?? []).filter((t) => t.kind === "track") as TrackPayload[]
  if (tracks.length === 0) {
    throw new Error("playlist contains no tracks")
  }
  return tracks
}

async function fetchTrack(id: number): Promise<TrackPayload> {
  const res = await fetch(`https://api-v2.soundcloud.com/tracks/${id}?client_id=${getClientId()}`)
  if (!res.ok) {
    throw new Error(`track fetch failed (${res.status})`)
  }
  return await res.json()
}

/** Enqueues a resolved payload at the end of the "Next Up" queue. */
function enqueueSound(payload: Record<string, unknown>): void {
  const sound = hydrateSound(payload)
  getPlayManager().addExplicitQueueItem(sound, sound, null)
}

/** Entry point: queues the sounds referenced by a dropped URL. */
export async function enqueueDroppedUrl(rawUrl: string): Promise<void> {
  const playManager = getPlayManager()

  const permalink = parseTrackPermalink(rawUrl)
  if (permalink) {
    const SoundCtor = getSoundConstructor()
    const sound = await SoundCtor.resolve(permalink.username, permalink.permalink, {}).promise()
    if (!sound) {
      throw new Error(`Could not resolve ${permalink.username}/${permalink.permalink}`)
    }
    playManager.addExplicitQueueItem(sound, sound, null)
    console.debug(`[sc-desktop] queued "${sound.attributes.title}" (${sound.getUrn()})`)
    return
  }

  const { kind, id } = await resolveResourceId(rawUrl)

  if (kind === "playlists") {
    const tracks = await fetchPlaylistTracks(id)
    for (const track of tracks) {
      enqueueSound(track)
    }
    console.debug(`[sc-desktop] queued ${tracks.length} tracks from playlist ${id}`)
    return
  }

  const track = await fetchTrack(id)
  enqueueSound(track)
  console.debug("[sc-desktop] queued track", id)
}
