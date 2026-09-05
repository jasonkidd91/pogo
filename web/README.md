# PoGO info site

Static, no build step. Serve the folder — do **not** open the files over `file://`, the opaque
origin breaks Google sign-in and Firestore:

`python3 -m http.server 8777 --directory .`

## Pages

| File | What it is |
|---|---|
| `index.html` | **What's on** — current and upcoming events, live from the LeekDuck feed |
| `mega-finale.html` | GO Fest 2026: Mega Finale event tracker — habitats, times, raid passes |
| `megas.html` | All 63 released Mega Evolutions and Primal Reversions, with raid class |
| `dynamax.html` | All 143 Dynamax-capable Pokémon + 17 Gigantamax forms |

## Shared modules

| File | Role |
|---|---|
| `store.js` | Collection state + canonical keys + site nav. **Single source of truth for identity.** |
| `auth.js` | Google sign-in, the Firestore backend, the sign-in gate. Loads the Firebase SDK from the CDN. |
| `collection.js` | Card renderer, filters, search shared by the two collection pages |
| `events.js` | The events page: fetches the live feed, groups by now / next 7 days / later |
| `styles.css` | All styling |
| `data.js` / `mega-data.js` / `max-data.js` | Data, each with its sources in the header comment |
| `events-data.js` | Fallback snapshot for the events page — **not** how that page stays current |

## The events page

`index.html` fetches [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck)'s JSON of the
[LeekDuck](https://leekduck.com/events/) event list on every load and renders that. Events are
live data — a file baked at build time would be wrong within days — so `events-data.js` is only
the fallback shown while the request is in flight or if it fails, and the footer line says
which of the two you are reading.

Times without a trailing `Z` are **local wall-clock**: a Community Day at 14:00 starts at 14:00
wherever you are. Times with a `Z` are a real worldwide instant, which is how GO Battle League
rotations are published; those are tagged `global` and converted into the reader's zone.

Only pages with `<body data-tracker>` get the sign-in gate. The events page has nothing to
tick, so it has no gate — and a tracker page missing that attribute is a bug.

## Raid class pills

Every Mega card and every Gigantamax card carries the class of battle that species is fought
in, with its star rating:

| Pill | Who | Source of the rule |
|---|---|---|
| ★4 Mega | non-Legendary Megas (55) | `Raid_Battle_(GO)` |
| ★5 Primal | Kyogre, Groudon | `Raid_Battle_(GO)` |
| ★6 Legendary Mega | Legendary and Mythical Megas (6) | `Raid_Battle_(GO)` + Bulbapedia's Legendary/Mythical categories |
| ★6 Gigantamax | all 17 Gigantamax forms | `Max_Battle` difficulty table |

It is the class of the battle, **not** a claim that the Pokémon is in the rotation today.
Plain Dynamax Pokémon carry no tier on purpose — theirs belongs to the current Power Spot
rotation, changes weekly, and would be stale within days.

## Shared checkmarks

Every page writes to one Firestore document — `users/{uid}.caught` — using **canonical,
name-derived identifiers**, so the same Pokémon is the same tick everywhere:

```
mega:mega-beedrill    Megas + Primals   (event page and megas.html share these)
dmax:bulbasaur        Dynamax-capable
gmax:venusaur         Gigantamax        (tracked separately from the Dynamax entry)
```

Tick Mega Beedrill on the event page and it shows as collected on `megas.html`, and vice versa.
Progress is stored against the signed-in Google account, so it follows you to another browser or
phone, and open tabs and devices sync live off one `onSnapshot` listener. Each page's Reset only
clears its own prefixes, and is the only thing that deletes progress.

## Signing in

Signing in is optional. **Browsing the lists doesn't need it; ticking anything does.** Signed
out the pages render exactly as before, the checkmarks are inert, and a banner above the summary
bar offers Google sign-in — clicking a card scrolls to it rather than ticking.

There is no signed-out local fallback on purpose: a browser-local set would drift from the
account and then have to be merged. The one exception is progress from before sign-in existed
(the old `pogo.caught.v1` key), which a brand-new account inherits once and then forgets.

### Firebase setup

Project `pogo-50a69`. What has to be true for this to work:

1. **Authentication → Sign-in method → Google** enabled.
2. **Authentication → Settings → Authorized domains** includes wherever the site is served from.
   `localhost` is there by default.
3. **Firestore** created, in Native mode.
4. **Rules deployed** — `firestore.rules` in the repo root: `firebase deploy --only
   firestore:rules`. Until then the database is either wide open (test mode) or shut (expired
   test mode), and neither looks like what it is from the browser.

The config in `auth.js` is public by design; it identifies the project and authorises nothing.
The rules are the access control.

### Staying inside the free tier

Spark gives 50k reads / 20k writes / 20k deletes a day. One document per user, one listener per
page, and writes debounced ~1.5s into a single whole-array save — so a session spent ticking
forty Pokémon costs one write, not forty. Firebase Analytics is deliberately not loaded.

## Where the data came from

Rosters are **parsed from Bulbapedia wikitext**, not from an LLM summary of the rendered page —
the rendered-page summaries were unreliable on large tables. Entries that are HTML-commented in
the wikitext are unreleased/datamined and are excluded.

Regenerate with the parser notes in each data file's header. Two traps worth remembering:

1. **Unreleased Megas are `<!-- -->` commented.** Strip comments before parsing or you'll pick up
   ~32 datamined entries that aren't in the game.
2. **Cost cells carry attributes** (`data-sort-value="100" | 100<ref…>`). Strip the attribute
   prefix, or rows silently inherit the previous row's cost via the rowspan fallback.

Event data is cross-checked against three agreeing sources — see `data.js`.
