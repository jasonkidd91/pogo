---
name: new-event-tracker
description: Build a new catch-list tracker page for a Pokémon GO event on the pogo site — habitats, time windows, raid targets, costs, and shared checkboxes. Use when the user asks for a tracker, checklist or catch list for any event (GO Fest, Community Day, Max Battle Day, a raid rotation, a season), or wants to track what they still need for an event. Enforces verifying the roster against multiple sources before any code is written.
---

# Build an event tracker page

Produces a page like `web/mega-finale.html` (GO Fest 2026: Mega Finale): raid targets grouped by day
and habitat, with times, costs, per-Pokémon checkboxes and a running "raid passes needed" total.

## Step 1 — get the roster right, before writing any code

This is the part that matters. Event rosters are LIVE data: **never write them from memory.**
A tracker with a wrong roster is worse than no tracker, because it looks authoritative.

Fetch and cross-check **at least two** of:

| Source | URL shape |
|---|---|
| Official (authoritative) | `https://pokemongo.com/news` · `pokemongo.com/gofest/<slug>` |
| Community calendar | `https://leekduck.com/events/<slug>/` |
| Database | `https://pokemongohub.net/post/event/<slug>/` |

Require the sources to **agree** on the roster and the time windows. If they disagree, say so
and ask — do not silently pick one.

> **Do not trust an LLM-summarised fetch of a large table.** It has truncated to the first row
> of each section, and reported released Pokémon as unreleased. For anything table-shaped,
> fetch the raw page or wikitext and parse it. See `scripts/bulbapedia.py`.

Capture per target: name, which day, the habitat and its time window(s), and the cost.

## Step 2 — get costs from local data, not the web

For a **Mega** event, energy costs are already in `web/mega-data.js` — read them from there.
Event pages almost never publish per-Pokémon costs, and the local file is already verified.

```js
MEGAS.find(m => m.name === 'Mega Beedrill').energy  // 100
```

If a target isn't in `mega-data.js`, it's a brand-new Mega: run `/update-megas` first.

**Never invent a cost.** If it genuinely can't be sourced, set `energy: null` with an
`energyNote`, render it as `? energy`, and exclude it from totals.

## Step 3 — verify every sprite before writing data

A wrong slug is a silently broken image.

```python
from scripts.bulbapedia import check_sprites
check_sprites(['beedrill-mega', 'victreebel'])
```

Megas with no mainline form (GO-originals) have no Mega artwork. Set `art` to the Mega slug
and `artFallback` to the base species; the renderer swaps on error and the card gets a tag.

## Step 4 — write the data file

`web/<event-slug>-data.js`, following `web/data.js`. Put the source URLs and verification date
in the header comment — future sessions need to know what was checked and when.

```js
const EVENT = { name, tagline, officialUrl, bonuses: [] };
const DAYS = [{
  id: 'sat', label: 'Saturday', date: '5 September 2026',
  isoDate: '2026-09-05',              // LOCAL date; drives the "Live now" badge
  superRaid: { name, art, energy, energyNote, tier, time },
  habitats: [{
    name: 'Verdant Overgrowth',
    blocks: ['10:00 – 11:00', '14:00 – 15:00'],   // en-dash, 24h, local time
    pokemon: [{ name, art, energy, artFallback?, isNew? }],
  }],
}];
```

`isoDate` must be the **local** calendar date. The live-window check compares against local
date parts on purpose — using `toISOString()` mis-fires for anyone whose UTC date differs.

## Step 5 — the page

Copy `web/mega-finale.html`. It already wires `store.js` → `auth.js` → data → `app.js`. Keep that
script order; `store.js` must load first and `auth.js` second.

Then register the page in the nav — edit the `links` array in `buildNav()` in `web/store.js`,
and call `buildNav('<id>')` with the new id.

## Step 6 — checkbox keys MUST be canonical

This is what makes ticks shared across the site. Never invent a page-local key.

```js
Store.id.mega(name)   // 'mega:mega-beedrill'  — Megas and Primals
Store.id.dmax(art)    // 'dmax:bulbasaur'
Store.id.gmax(name)   // 'gmax:venusaur'
```

Ticking Mega Beedrill on an event page must show it collected on `megas.html`. A day-scoped or
event-scoped key breaks that and is a bug. Progress lives in Firestore under the signed-in
Google account — long-lived. Only an explicit Reset may clear it, and only its own prefixes.

## Step 6b — the sign-in gate

Tracking requires a signed-in account. Cards must call `trackerToggle(key)`, never
`Store.toggle(key)` — `trackerToggle` refuses when signed out and raises the sign-in prompt
instead. Signed out, a card gets `tabIndex = -1` and `aria-disabled="true"`; copy that from
`makeCard()` in `app.js`. Guard the Reset button with `if (Store.locked) return Auth.prompt();`.
The gate banner and the nav sign-in control are painted by `auth.js` — a new page gets both for
free as long as it has a `.wrap` and calls `buildNav()`.

## Step 7 — verify in a browser

```bash
python3 -m http.server 8777 --directory web
```

Check signed out first: the list renders, the gate banner shows, and clicking a card scrolls to
the gate instead of ticking. Then sign in and check: card count matches the roster, **zero broken
images**, totals update on tick, filters work, no horizontal scroll, and a tick shows up on
`megas.html`. Assert rather than eyeball:

```js
[...document.querySelectorAll('img')].filter(i => i.complete && !i.naturalWidth)  // must be []
```

Leave the server running when you hand it over, and give the user the URL.

## Design notes worth keeping

- Group by **day → habitat → grid**; that's the order the event is actually played in.
- Show both time blocks per habitat, and highlight the active one.
- Totals should answer "what do I still need": passes remaining, energy remaining.
- Anything unpriced or unverified gets a visible marker, not a plausible-looking guess.
