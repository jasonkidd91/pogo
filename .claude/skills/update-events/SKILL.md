---
name: update-events
description: Refresh or fix the "What's on" events page on the pogo site (web/index.html, web/events.js, web/events-data.js). Use when the events page shows stale, wrong or missing events, when an event has no description, when the live feed breaks or its shape changes, when a new event type appears, or when the user asks to add a catch tracker link for an event. Runs scripts/update_events.py and verifies in a browser.
---

# Update the events page

`web/index.html` is the front page: what is running now, what is coming up. It is **not** a
tracker and must not become one.

## The thing to understand before touching it

**The page is not generated. It fetches.** `events.js` requests the ScrapedDuck feed on every
page load and renders that. `web/events-data.js` is a *fallback* — painted immediately at load
so the page is never blank, replaced the moment the fetch lands, and shown with a
"saved copy from <date>" line if the fetch fails.

So: **if the page is showing stale events, regenerating the snapshot is almost certainly not
the fix.** Check in this order:

1. Open the page and read the freshness line in the footer. `Live from the LeekDuck feed`
   means the fetch worked and the feed itself is what is stale — nothing to fix here.
2. `Live feed unreachable` means the fetch failed. Check the feed by hand:
   ```bash
   curl -sI -L https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json | head -3
   ```
   It must return 200 **and** `access-control-allow-origin: *`, or the browser fetch dies
   silently while curl looks fine.
3. Only regenerate the snapshot when the *fallback* is what is out of date, or when blurbs
   are missing for events that now have details published.

## Run it

```bash
python3 scripts/update_events.py
```

Takes a few minutes: it fetches the feed, then one LeekDuck page per event with a pause
between them. Expected output shape:

```
feed: 59 entries, kept 58 current/upcoming
  live right now: 7
  by type: {'season': 2, 'event': 7, 'raid-battles': 14, ...}
  blurbs: 20 written, 34/34 pages had a description block (the rest are placeholders...)
  global (UTC-stamped) entries: 12
wrote .../web/events-data.js: 58 events
```

## Reading that output

- **`34/34 pages had a description block`** is the health check, and the script raises below
  60%. It counts pages whose `.event-description` div was *present*, not blurbs written,
  because a schedule full of placeholders is normal and a scrape that stopped matching is not.
- **`blurbs: 20 written`** being well under the eligible count is expected. Half the future
  schedule is `October Community Day` / `Max Battle Day` with no details announced. Those
  fall back to the per-type explanation plus the `Includes:` line, which is the intended
  behaviour, not a gap to fill.
- **`global (UTC-stamped) entries`** should be roughly the GO Battle League count. If it is
  zero, the feed stopped marking global events and the `global` tag is now lying.

## Time zones — the trap that will bite

A `start`/`end` **without** a trailing `Z` is local wall-clock: a Community Day reading 14:00
starts at 14:00 in every time zone. **With** a `Z` it is one worldwide instant, which is how
GO Battle League rotations are published. `new Date()` parses both correctly and the suffix
only decides whether the card gets the `global` tag. **Never normalise the suffix away**, in
the generator or the renderer, and never "fix" a missing Z by adding one.

## Blurb quality

The generator filters LeekDuck's copy hard, because most of it is greeting and date
restatement. Sentences are dropped when they: restate the window (two full dates in one
sentence), are a fragment left by splitting on "6:00 p.m.", run under 20 characters, say
"Stay tuned for more details", or end in a colon introducing a list the page doesn't carry.
If what survives is a short greeting, the page's own `meta description` is used instead,
trimmed back to the last complete clause rather than LeekDuck's mid-word `...`.

If a blurb reads badly, fix the filter — do not hand-edit `events-data.js`, it is generated.

## Adding a catch tracker link

Only when the user asks for one. Build the tracker with the `new-event-tracker` skill, then
add it to `TRACKERS` in `web/events.js`, keyed by the event's **feed id** (the `eventID` in
the JSON, e.g. `pokemon-go-fest-2026-mega-finale`):

```js
const TRACKERS = {
  'pokemon-go-fest-2026-mega-finale': { href: 'mega-finale.html', label: 'Catch tracker' },
};
```

An event appearing on this page is not a request for a tracker.

## A new event type appears

Add it to `TYPES` in `events.js` (short label, colour class, filter group) **and** to
`WHAT_IS` with a one-line explanation of what that kind of event actually is. Without the
first it falls back to the feed's `heading` and the `big` group; without the second the page
cannot answer "what is this?", which is the entire point of those lines.

Write `WHAT_IS` entries with **no weekday and no clock time**. The cadence moves — Spotlight
Hour is no longer the Tuesday Bulbapedia still describes — and the weekly rhythm box already
derives the current cadence from the schedule.

If the type is long-running background (a season, a pass), add it to `BACKGROUND` so it goes
in the header strip instead of the main list. If its specifics are already carried by the
event name and the feed's own fields, leave it out of `BLURB_TYPES` in the generator; its
LeekDuck copy will be boilerplate.

## Verify

Use the `verify-site` skill, which covers this page. The events-specific assertions:

- the snapshot is on screen **before** the fetch resolves (never a blank page waiting on the
  network — same rule as the sign-in gate),
- the freshness line flips to `live`,
- blocking the feed falls back to the saved copy with the right wording and a full list,
- every one of the six filters returns something and narrows the list,
- GO Battle League rows carry the `global` tag,
- the weekly rhythm box has rows,
- there is **no sign-in gate** — this page has no `data-tracker` attribute and nothing to tick.
