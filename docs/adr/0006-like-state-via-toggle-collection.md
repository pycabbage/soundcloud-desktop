# 0006 — Drive like state through the vendor toggle collection

## Status

Accepted

## Context

The taskbar thumbnail toolbar ([0007](0007-windows-thumbnail-toolbar.md)) carries
a Like button. It has to do two things the rest of the app already does:

- **Report** whether the playing track is liked, so the button can show a filled
  or an outlined heart, and grey out when nothing is loaded.
- **Toggle** the like, in a way that is indistinguishable from clicking the
  heart in SoundCloud's own player bar.

Both directions have to stay consistent with the web app. A like set from the
toolbar must light up the in-page button, and a like set in the page must reach
the toolbar — including likes made on a track list far from the player.

Calling the public API directly would satisfy neither. The web app keeps its own
in-memory list of liked ids and renders every heart from it; an out-of-band
write leaves that list stale until something else refetches it, and gives us no
notification for likes the user makes in the page.

Inside the app, both directions run through one structure. Likes, reposts and
follows are "me" association lists, each a Backbone model whose attributes map a
resource id to `true` (`types/toggleCollection.ts`, base class in
`55-ef1f6ed4.js`). The sound likes flavour is backed by `me/track_likes/ids`.
Two properties of that base class make it usable as our single source of truth:

- Every subclass hashes all of its instances to the same key, so constructing
  one returns the instance the rest of the app already reads and mutates.
- Local flips fire `change` and `change:<id>`, whatever caused them.

Writes are not made on the collection directly. A social actions facade owns the
like/repost/follow collections and is the object `PlayManager` receives as its
`destroyManager`; going through it is what keeps the collection, the persisted
state and the rest of the app in agreement.

Locating the collection is the awkward part. Its siblings expose an identical
member set, and the property that separates them (`readEndpoint`) lives on the
prototype — the name-based fingerprint of [0002](0002-webpack-member-fingerprint.md)
cannot tell them apart.

## Decision

- **Read** through the collection. `getSoundLikes()` constructs the class and
  gets back the shared instance; `soundLikes.get(trackId) === true` answers the
  Like button, and `soundLikes.on("change", …)` reports every flip — ours and
  SoundCloud's — with one subscription.
- **Write** through the facade. `getSocialActions().like(sound)` performs the
  toggle exactly as the in-page buttons do.
- **Find** the collection by value. `findModule()` was added to `lib/webpack.ts`
  for this: it runs a predicate over each module's exports, so the collection is
  matched on `prototype.readEndpoint === "soundLikesIds"` rather than on a
  member set it shares with its siblings.
- **Prime** the list at startup. `soundLikes.fetch()` pages `me/track_likes/ids`
  to completion during init. SoundCloud fetches the same collection to render
  its own hearts, so at worst this costs one extra request.
- Report to the backend from one place: a single `reportLikeState()` sends
  `isLiked` (or `null` when no track is loaded) on both track changes and
  collection changes.

## Consequences

### Positive

- One subscription covers every source of a like. Nothing needs to know whether
  a change came from the toolbar, the player bar or a track list.
- No API surface of our own: no endpoint, no auth handling, no cache to
  invalidate. Likes are persisted by the code that already persists them.
- The in-page UI updates from our writes for free, because the write is the
  vendor's own write.

### Negative

- Depends on the toggle-collection base class keeping its instance-sharing
  behaviour and its `change` events. A change there degrades the toolbar to a
  stale heart, not to a broken page.
- The value fingerprint pins one string, `"soundLikesIds"`. It is a stable
  endpoint name rather than a compiler-assigned identifier, but it is still
  vendor-internal.
- Priming costs one paged fetch at startup on top of the vendor's own.

## Project priorities honored

- **最小コード行数**: the accessors are ~10 and ~30 lines
  (`lib/socialActions.ts`, `lib/soundLikes.ts`), plus one predicate. There is no
  local like cache, no reconciliation and no API client.
- **パフォーマンス優先**: after the one priming fetch, every read is a hash
  lookup on a collection the app holds anyway, and updates arrive as events
  rather than from polling or refetching.
