---
name: update-megas
description: Refresh the Mega Pokémon list on the pogo site (web/mega-data.js and megas.html) from Bulbapedia and the Game Master. Use when a new Mega Evolution or Primal Reversion is released, when Mega Energy costs or Super Max attacks change, or when the user says the Mega list is out of date, missing a Mega, or shows a broken image. Runs scripts/update_megas.py and verifies the result in a browser. For the S/A/B/C/D rank itself, see the update-ranks skill.
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
Legendary + Mythical species on Bulbapedia: 94
parsed 63 released Megas
  rows inheriting cost via rowspan (expect only X/Y pairs): ['Mega Charizard Y', ...]
game master 8e227be44f28 (2026-08-29) — cached
  GO-original Megas (no mainline art): 13
  with a Super Max attack: 17
  cost tiers: {100: 8, 200: 28, 300: 22, 400: 3, 7500: 2}
  raid classes: {'Mega Raid': 55, 'Legendary Mega Raid': 6, 'Primal Raid': 2}
    Mega Mewtwo X, Mega Mewtwo Y, Mega Latias, Mega Latios, Primal Kyogre, ...
  power scale from 611 fully-evolved forms: {'S': 15.3, 'A': 13.6, 'B': 12.1, 'C': 10.2}
  ranks: {'?': 2, 'A': 17, 'B': 7, 'C': 9, 'D': 4, 'S': 24}
    S: Mega Charizard Y, Mega Raichu Y, Mega Alakazam, ...
    no Game Master entry yet (2): ['Mega Staraptor', 'Mega Chandelure']
    ranking on a legacy move: 22
```

Two sources now, and they fail differently: Bulbapedia gives the roster, the Game Master gives
the battle numbers. A Mega can be on the page with no rank — see below — but never the reverse.

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
- **Every Mega came out as `Mega Raid`** → the Legendary/Mythical category lookup silently
  returned nothing. The script raises on an empty Legendary bucket, so this should be
  impossible; if you see it, `category_members` is being bypassed.
- **`no Game Master entry yet` lists more than a handful** → `gm_key` has stopped matching
  `pokemonId`, which would blank the rank on every card. The script raises above 8. One or
  two is normal and expected: PokeMiners lags a release by days, and those cards show `?`
  rather than a guessed grade.

## Then verify in the browser

```bash
python3 -m http.server 8777 --directory web
```

Open `http://localhost:8777/megas.html` and confirm: card count matches the script output,
no broken images, filters and search still work. If a Playwright MCP is available, assert
`[...document.querySelectorAll('img')].filter(i => i.complete && !i.naturalWidth)` is empty.

## The raid class pill

Each card carries `raid`/`stars` — Mega Raid (★4), Primal Raid (★5), Legendary Mega Raid (★6).
Derived, not memorised: the rule is quoted from `Raid_Battle_(GO)` at the top of the script,
and Legendary/Mythical membership comes from Bulbapedia's **category API**, never from
scraping the Legendary article (it names Ditto and Bulbasaur in prose — trap 3 in
`scripts/bulbapedia.py`).

Three guards will stop a bad refresh: zero Legendary Megas, more than 12 of them, or anything
other than exactly 2 Primals. That last one fires when a new Primal ships — that is the point.
Re-read `Raid_Battle_(GO)` and confirm the new one's star rating before relaxing it.

**Super Mega Raid is not derived and must not be.** It is an event-driven shielded variant of
a Mega Raid, not a property of the species. The event page holds a hand-written, per-event
`tier` for that.

## Things that are correct and should not be "fixed"

- **13 Megas show base-species artwork.** GO-original Megas (Raichu X/Y, Victreebel, Starmie,
  Dragonite, Skarmory, Staraptor, Chandelure, Chesnaught, Delphox, Greninja, Malamar, Falinks)
  have no mainline Mega form, so no Mega art exists. They are tagged `GO ORIGINAL`.
- **Primal Kyogre, Primal Groudon and Mega Rayquaza show a ⛅ pill.** The wiki's "Boosted types"
  column is weather-based for these three and is *not* their own typing. `WEATHER_BOOSTED` in
  the script marks which entries get the pill; the typing itself comes from the Game Master's
  `typeOverride1/2`, which is the game's own answer. That replaced a hand-written table which
  had **Primal Groudon as pure Ground** — the Game Master says Ground/Fire, and it is right.
  A guard prints any Mega whose typing differs from the boosted-types column and raises above
  three, since a systemic difference means the column stopped meaning typing.
- **Mega Mewtwo X/Y cost 7,500.** That is a real cost tier, confirmed in the page's own
  cost-tier table. It is not a typo.

## If a sprite 404s

The script raises with the offending names. `art_slug()` builds pokemondb slugs
(`gengar-mega`, `charizard-mega-x`, `kyogre-primal`). A genuinely new naming shape needs a
case added there. Verify a candidate before coding it:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://img.pokemondb.net/sprites/home/normal/<slug>.png
```

## The rank

Each card also carries an S/A/B/C/D grade that is **combat power only** — computed DPS as a
percentile of every fully evolved Pokémon and Mega in the game — plus the number itself and
the moveset it assumes. It says nothing about Mega Energy cost or type coverage; that was
tried and removed. It has its own skill: **`update-ranks`**. Go there before changing a band,
the damage model, or what the card prints.

## The `fam` field

Each entry carries its evolution family, so the page can offer "search the whole family".
It is computed by `gamemaster.families()` and is absent for a species that is its own whole
family. See the **`family-search`** skill before changing it — the guard that a family never
exceeds 12 species is what stops a merged evolution graph from quietly poisoning the search.
