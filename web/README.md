# PoGO info site

Static, no build step. Serve the folder — do **not** open the files over `file://`, the opaque
origin breaks Google sign-in and Firestore:

`python3 -m http.server 8777 --directory .`

## Pages

| File | What it is |
|---|---|
| `index.html` | **What's on** — current and upcoming events, live from the LeekDuck feed |
| `mega-finale.html` | GO Fest 2026: Mega Finale event tracker — habitats, times, raid passes |
| `megas.html` | All 63 released Mega Evolutions and Primal Reversions, with raid class and rank |
| `dynamax.html` | All 143 Dynamax-capable Pokémon + 17 Gigantamax forms, with typing, rank and Max role |

## The design system

Everything visible is built by **`ui.js`** and styled by **`styles.css`**. One `el()`
primitive, one `UI.monCard` behind all three Pokémon lists, one `UI.sectionHead`, and a
`UI.summary()` that turns a declaration into the whole stat-and-filter panel:

```js
UI.summary('.summary', {
  stats: [{ id: 's-have', label: 'Collected', tone: 'ok' }],
  bar: true, reset: true,
  search: { placeholder: 'Search a Mega…', label: 'Search Mega Pokémon' },
  filters: [UI.STATUS_FILTER, { label: 'Cost', group: 'cost', options: [['all', 'Any']] }],
});
```

A page script never calls `document.createElement` or assigns `innerHTML` — the only
exceptions are two constant SVGs. `styles.css` opens with a component index mapping every
class back to the function that emits it, and carries the tokens (`--sp-*`, `--r-*`, `--fs-*`)
components are built from.

Every page is the same five landmarks: `.wrap > header.hero + .summary + main + footer`. The
`.summary` div ships empty and is filled at runtime; the frame itself stays in the HTML so it
paints before any script runs.

## Shared modules

| File | Role |
|---|---|
| `ui.js` | The design system — every component, and the `el()` primitive. Loads first. |
| `store.js` | Collection state + canonical keys + site nav. **Single source of truth for identity.** |
| `auth.js` | Google sign-in, the Firestore backend, the sign-in gate. Loads the Firebase SDK from the CDN. |
| `events.js` | The events page: fetches the live feed, groups by now / next 7 days / later |
| `remind.js` | Event reminders over ntfy.sh — the protocol, the state machine and the setup panel. Events page and Mega Finale. |
| `app.js` | The Mega Finale tracker: the flat raid list and the live-habitat clock |
| `styles.css` | All styling |
| `data.js` / `mega-data.js` / `max-data.js` | Data, each with its sources in the header comment |
| `events-data.js` | Fallback snapshot for the events page — **not** how that page stays current |

## The events page

`index.html` fetches [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck)'s JSON of the
[LeekDuck](https://leekduck.com/events/) event list on every load and renders that. Events are
live data — a file baked at build time would be wrong within days — so `events-data.js` is only
the fallback shown while the request is in flight or if it fails, and the footer line says
which of the two you are reading.

Signed in, every upcoming event carries a **Remind me** button: two push notifications, one
15 minutes before it starts and one as it begins, sent by [ntfy.sh](https://ntfy.sh) to a
random topic generated for the account. Install the ntfy app and subscribe to that topic, or
nothing arrives — the panel's *Send a test* is there to find that out early.

ntfy accepts a scheduled notification at most **three days** ahead, and there is no server in
this project, so a reminder for anything further out is held on the account and handed over
the first time you open the page inside that window. The button shows which state it is in:
solid green means scheduled with ntfy, amber and dashed means recorded but not yet. See the
`event-reminders` skill for the rest.

The **Mega Finale** tracker has the same reminders on its habitat windows: tap any window that
has not opened yet. It also knows when its event is over — a past window is struck through, a
banner says when it finished, and the reminders disappear, while your ticks stay as the record
of what you caught.

## Searching a whole evolution family

`megas.html` and `dynamax.html` have a **Match** chip: *Exact*, or *Whole family*. On Whole
family, searching one name also finds its evolution line — `weedle` finds Mega Beedrill,
`pichu` finds Mega Raichu. The families are read out of the game's own data file, not typed
out here.

Events also carry **caveats** — up to four flagged notes for the things that are easy to miss:
the exclusive-move deadline (often a different time from the end of the event), a regional
split, a debut, boosted Shiny odds, a bonus running on its own hours. Each one quotes a
sentence from the event's own page; the generator selects and labels, it never writes.

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

## Rank: how hard does it hit?

Every Mega and Dynamax card carries an S/A/B/C/D letter plus the number behind it —
`17.6 DPS · Lick + Shadow Ball`. Computed in `scripts/rank.py` from the **Game Master**, the
game's own data file, never from a tier list.

**Combat power, and nothing else.** No Mega Energy cost, no candy, no type-coverage score.
The damage model is sustained cycle DPS at level 40, 15/15/15, against a *neutral*
200-defense target, using the best fast+charged pairing — raw attacking power, not a matchup.

One ladder for the whole site, as percentiles of every fully evolved Pokémon and Mega in the
game (611 forms), so a B here means a B there:

| Grade | Means |
|---|---|
| S | Top 5% attacker in the game (≥15.3 DPS) |
| A | Top 12% (≥13.6) |
| B | Top 25% (≥12.1) |
| C | Above the median (≥10.2) |
| D | Below average — including Magikarp, which has no attacking moveset at all |
| ? | No Game Master entry yet. Never a guessed grade |

No plain Dynamax Pokémon is a top-5% attacker in its base form, so that page tops out at A.
That is the honest answer rather than a scale tuned to flatter it.

A ⚑ on the moveset means the grade needs an Elite TM or a Community Day move — 22 of the 63
Megas are in that position, and Frenzy Plant is worth 15.5% of Mega Sceptile's DPS.

**The Max role badge is separate on purpose.** `MAX ATTACKER` / `MAX GUARD` / `MAX SPIRIT`
marks the top quarter of the Max roster in Attack, Defense or Stamina. Blissey is a **D**
attacker and the **best Max Spirit in the game** — combat power cannot say that, so the badge
does.

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

Battle numbers — base stats, move power and duration, Mega boost multipliers, Dynamax upgrade
costs — come from **PokeMiners' Game Master**, the game's own data file, fetched by upstream
commit sha and recorded in each data file's header. It is authoritative enough that it
corrected a hand-written entry here: Primal Groudon was listed as pure Ground, and the game
says Ground/Fire.

Regenerate with the parser notes in each data file's header. Two traps worth remembering:

1. **Unreleased Megas are `<!-- -->` commented.** Strip comments before parsing or you'll pick up
   ~32 datamined entries that aren't in the game.
2. **Cost cells carry attributes** (`data-sort-value="100" | 100<ref…>`). Strip the attribute
   prefix, or rows silently inherit the previous row's cost via the rowspan fallback.

Event data is cross-checked against three agreeing sources — see `data.js`.
