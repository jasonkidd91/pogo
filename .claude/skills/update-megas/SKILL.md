---
name: update-megas
description: Refresh the Mega Pokémon list on the pogo site (web/mega-data.js and megas.html) from Bulbapedia. Use when a new Mega Evolution or Primal Reversion is released, when Mega Energy costs or Super Max attacks change, or when the user says the Mega list is out of date, missing a Mega, or shows a broken image. Runs scripts/update_megas.py and verifies the result in a browser.
---

# Update the Mega Pokémon list

The roster lives in `web/mega-data.js`, generated from Bulbapedia. **Do not hand-edit that
file** — it has a `GENERATED` header and your edit will be lost on the next refresh.

## Run it

```bash
python3 scripts/update_megas.py
```

The script fetches wikitext, parses, verifies every sprite URL, and only then writes.
It raises rather than writing bad data. Expected output shape:

```
parsed 63 released Megas
  rows inheriting cost via rowspan (expect only X/Y pairs): ['Mega Charizard Y', ...]
  GO-original Megas (no mainline art): 13
  with a Super Max attack: 17
  cost tiers: {100: 8, 200: 28, 300: 22, 400: 3, 7500: 2}
```

## Check the output before trusting it

Compare against the previous run. A refresh should be a small delta.

- **Count dropped a lot** → the page layout changed, or comment-stripping broke. Investigate;
  do not ship a shrunken list.
- **Count jumped by ~30** → unreleased entries leaked in. Bulbapedia keeps datamined Megas
  HTML-commented inside the table. `fetch_wikitext` strips comments; if the count balloons,
  that stripping failed.
- **More than 4 rows inherited a cost** → `cell_value` is failing to strip
  `data-sort-value="…" |` prefixes, so rows are silently taking the previous row's cost.
  This is the bug that once made Slowbro and Houndoom read 300 instead of 100. The script
  raises above 4, but sanity-check the names: only genuine X/Y pairs should appear.
- **A new cost tier appears** → add a filter chip for it in `megas.html` (the `data-group="cost"`
  row). The page groups by tier automatically, but the filter buttons are hand-listed.

## Then verify in the browser

```bash
python3 -m http.server 8777 --directory web
```

Open `http://localhost:8777/megas.html` and confirm: card count matches the script output,
no broken images, filters and search still work. If a Playwright MCP is available, assert
`[...document.querySelectorAll('img')].filter(i => i.complete && !i.naturalWidth)` is empty.

## Things that are correct and should not be "fixed"

- **13 Megas show base-species artwork.** GO-original Megas (Raichu X/Y, Victreebel, Starmie,
  Dragonite, Skarmory, Staraptor, Chandelure, Chesnaught, Delphox, Greninja, Malamar, Falinks)
  have no mainline Mega form, so no Mega art exists. They are tagged `GO ORIGINAL`.
- **Primal Kyogre, Primal Groudon and Mega Rayquaza show a ⛅ pill.** The wiki's "Boosted types"
  column is weather-based for these three and is *not* their own typing. `ACTUAL_TYPES` in the
  script holds their real typing; the pill shows what they boost.
- **Mega Mewtwo X/Y cost 7,500.** That is a real cost tier, confirmed in the page's own
  cost-tier table. It is not a typo.

## If a sprite 404s

The script raises with the offending names. `art_slug()` builds pokemondb slugs
(`gengar-mega`, `charizard-mega-x`, `kyogre-primal`). A genuinely new naming shape needs a
case added there. Verify a candidate before coding it:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://img.pokemondb.net/sprites/home/normal/<slug>.png
```
