---
name: update-promos
description: Refresh or fix the Promo Codes page on the pogo site (web/promo-codes.html, web/promo-codes.js, web/promos.js, web/promo-data.js) and the nav nudge that points at it (buildNav() in web/store.js). Use when the promo codes page shows stale, wrong or missing codes, when a code that should be disabled still looks redeemable, when the nav nudge is wrong or stuck, when LeekDuck's promo-codes page markup changes, or when adding promo codes support to a new page. Runs scripts/update_promos.py and verifies in a browser.
---

# Update the promo codes page

`web/promo-codes.html` lists every Pokémon GO promo code LeekDuck currently shows as active,
with one-tap Copy and a direct Redeem link. It is **not** a tracker — nothing here is written
to a Google account, because a promo code is either spent at Niantic's store or it isn't, and
this site has no way to know which.

## The thing to understand before touching it

**The page is not generated. It fetches**, exactly like the events page. `promo-codes.js`
requests `https://leekduck.com/promo-codes/` live on every load and renders that.
`web/promo-data.js` is a *fallback* — painted immediately so the page is never blank, replaced
the moment the fetch lands, and shown with a "saved copy from &lt;date&gt;" line if the fetch
fails.

**But that same file is also loaded on every OTHER page**, which the events snapshot is not.
The nav's "you have an unseen code" nudge (`Promos.unseenCount()` in `web/promos.js`, painted
by `buildNav()` in `web/store.js`) needs to know the current code list without every page on
the site paying for a live fetch, so it reads `PROMO_SNAPSHOT` — which means the nudge can lag
the true live list by up to a day, until the next scheduled run. That's the one place on this
feature where snapshot staleness is accepted by design; the dedicated page itself always
re-checks live.

So: **if the page is showing a stale code list, regenerating the snapshot is almost certainly
not the fix** — check the freshness line in the footer first, same triage as the events page:

1. `Live from LeekDuck` means the fetch worked; the site itself is what's stale.
2. `Live page unreachable` means the fetch failed. Check by hand:
   ```bash
   curl -sI -A "Mozilla/5.0" -H "Origin: https://example.github.io" \
     https://leekduck.com/promo-codes/ | grep -i "access-control\|HTTP/"
   ```
   Needs `200` **and** `access-control-allow-origin: *`, or the browser fetch dies with an
   opaque CORS error while curl looks fine. There is no JSON feed for this the way ScrapedDuck
   provides one for events — this is HTML, scraped with a DOMParser client-side and mirrored
   in Python at generation time (see below).
3. **If the nav nudge is wrong but the page itself is right**, that's a snapshot problem —
   regenerate it (see below) or wait for tomorrow's scheduled run.
4. Only regenerate by hand when the fallback is what's out of date, or LeekDuck's markup has
   changed and both the Python parser and the JS parser need fixing together.

## Run it

```bash
python3 scripts/update_promos.py
```

Expected output shape:

```
promo-codes.html: 4 active code(s)
  0004POKEMONGO            expires 2026-09-22 20:00:00
  LEGOxPOKEMONGOxCAP       expires 2026-09-30 23:59:00
  MLBxPOKEMONGO2026        expires 2026-09-30 23:59:59 -0700
  LEGOxPOKEMONGOxBERRIES   expires 2026-12-31 23:59:59 -0800 (no confirmed expiry)
wrote .../web/promo-data.js: 4 code(s)
```

Zero codes is a normal, quiet day — Niantic doesn't run these continuously. What's **not**
normal is the script raising `did not return the expected page shape`, which means LeekDuck's
markup changed and the parser needs fixing before it can be trusted again — it raises rather
than write an empty or truncated list, same rule as every other generator here.

## Two parsers, kept in sync on purpose

There's no JSON feed for promo codes, so both the live page (`Promos.parse()` in
`web/promos.js`, via `DOMParser`) and the generator (`card_of()` in
`scripts/update_promos.py`, via regex on raw HTML) read the same `.promo-card` markup and
must produce the same shape: `{ code, title, redeem, expires, hideExpiry, description?, link?,
rewards? }`. If you fix one because LeekDuck's markup moved, fix the other the same way —
this is the same "mirrors" relationship `events.js`'s `slim()` has with
`scripts/update_events.py`'s `slim()`.

## Expiry — the two traps

`data-expires` is **not consistently one timezone**: most cards carry a bare
`"YYYY-MM-DD HH:MM:SS"` (LeekDuck's own copy calls these "local time" — the same wall-clock
ambiguity as an events.json stamp with no trailing `Z`), but some carry an explicit
`"-0700"`/`"-0800"` offset when Niantic's support page states the deadline in Pacific time.
**Never normalise this away** — `Promos.expiryDate()` has to branch on whichever form shows up,
the same rule events.js follows for the `Z` suffix.

`data-hide-expiry="true"` means LeekDuck itself has no confirmed deadline and shows
`"Expires: ???"` instead of a date. The `data-expires` value on one of these is a **far-future
placeholder**, not a real one — never display it as a countdown. It's still fine, and
necessary, to use it for "has this obviously-placeholder date somehow already passed" (it
essentially never has), which is exactly what `Promos.isExpired()` does and nothing more.

## Disabling an expired code — the part that has to be right

A code can expire in the gap between one daily snapshot refresh and the next, or between a
live fetch and someone reading the page ten minutes later. `promo-codes.js` recomputes
`Promos.isExpired(entry, now)` on every render (including the 60-second tick and on
`visibilitychange`) rather than trusting a baked flag — same reasoning as events.js recomputing
"is this live right now" instead of storing a boolean. An expired card:

- gets the `.pcard.expired` class (dimmed, title and code struck through),
- loses its Copy and Redeem controls entirely — `codeRow()` renders only the code text, no
  buttons, when `expired` is true,
- says `Expired &lt;date&gt;`, or just `Expired` when `hideExpiry` was set.

Never make an expired code merely *look* disabled while leaving the Redeem link live — Niantic
rejects a spent or dead code anyway, but a dead link that still looks actionable is the thing
this behaviour exists to prevent.

## The nav nudge

`Promos.unseenCount()` compares `PROMO_SNAPSHOT`'s active codes against a set of codes stored
in `localStorage` (`pogo.promo.seen.v1`) — **deliberately not Firestore.** "Have you opened
this page since this code showed up" is a per-browser convenience, not account state: it has
no business following you to another device, and getting it wrong costs nothing. Wrapped in
try/catch because a private window or blocked storage must not break the nav on every page.

Visiting `promo-codes.html` calls `Promos.markSeen()` once per page load, which adds every
currently-shown code to that set and prunes anything no longer in `PROMO_SNAPSHOT` (so the
stored set can't grow forever across years of rotating codes). The page itself caches the
seen-set **once**, before marking, into `seenAtLoad` — read it fresh on every render and the
"NEW" tags would visibly disappear out from under someone still reading the page, because the
60-second re-render tick would see its own just-written mark.

If the nudge count looks wrong: check `PROMO_SNAPSHOT` first (is the code actually in the
snapshot?), then `localStorage.pogo.promo.seen.v1` in the browser (has it already been marked
seen?). It is *not* wrong just because it lags the live page — see the note above about the
snapshot being the one place a day of staleness is accepted.

## Adding it to a new page

Every page on the site loads `promos.js` and `promo-data.js`, right after `auth.js` and before
its own data file:

```
ui.js -> store.js -> auth.js -> promos.js -> promo-data.js -> <page data> -> <page script>
```

A new page needs both script tags in that slot or `buildNav()`'s nudge silently reads
`Promos`/`PROMO_SNAPSHOT` as undefined and renders no nudge at all — it fails quiet, not loud,
so it's easy to forget and not notice.

## Rendering

`promo-codes.js` builds nothing by hand — cards come from `UI.el`/`UI.tag`, following the
design-system rule that a page owns its domain-specific components (`.pcard`, `.pcode`,
`.pcode-text`) built from those primitives. It reuses `.elink` for Copy/Redeem/Details rather
than inventing a new button class, and `.tag-new` (already used for "GO ORIGINAL"/"G-MAX"/"NEW
MEGA") for the unseen-code tag, rather than adding a fourth badge that means the same thing.
See the `design-system` skill before changing any of it.

## Verify

Use the `verify-site` skill's general checks (landmarks, no broken images, no console errors,
no horizontal overflow at 390px) plus:

- the snapshot is on screen before the fetch resolves, and the footer flips to `Live from
  LeekDuck` once it does,
- blocking the fetch falls back to the saved copy with the right wording,
- an expired entry (shift the page clock, or substitute a synthetic `codes` array and call
  `render()`, the way this skill's author verified it) loses Copy/Redeem and gets struck
  through — never just dimmed with working buttons underneath,
- clearing `localStorage` and loading any page shows the nudge with the correct count; visiting
  `promo-codes.html` clears it on the next page load elsewhere,
- the design-system checks pass: five layout landmarks, no `createElement`/`innerHTML` outside
  `ui.js`/`auth.js`.
