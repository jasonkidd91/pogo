# PoGO info site

Static, no build step. Open `index.html`, or serve the folder:
`python3 -m http.server 8777 --directory .`

## Pages

| File | What it is |
|---|---|
| `index.html` | GO Fest 2026: Mega Finale event tracker — habitats, times, raid passes |
| `megas.html` | All 63 released Mega Evolutions and Primal Reversions |
| `dynamax.html` | All 143 Dynamax-capable Pokémon + 17 Gigantamax forms |

## Shared modules

| File | Role |
|---|---|
| `store.js` | Collection state + canonical keys + site nav. **Single source of truth for identity.** |
| `collection.js` | Card renderer, filters, search shared by the two collection pages |
| `styles.css` | All styling |
| `data.js` / `mega-data.js` / `max-data.js` | Data, each with its sources in the header comment |

## Shared checkmarks

Every page writes to one `localStorage` key (`pogo.caught.v1`) using **canonical, name-derived
identifiers**, so the same Pokémon is the same tick everywhere:

```
mega:mega-beedrill    Megas + Primals   (event page and megas.html share these)
dmax:bulbasaur        Dynamax-capable
gmax:venusaur         Gigantamax        (tracked separately from the Dynamax entry)
```

Tick Mega Beedrill on the event page and it shows as collected on `megas.html`, and vice versa.
Progress is stored in `localStorage`, so it survives closing the tab, restarting the browser and
the dev server going away. Open tabs sync live via the `storage` event. Each page's Reset only
clears its own prefixes, and is the only thing that deletes progress.

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
