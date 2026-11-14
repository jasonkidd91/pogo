# db.pokemongohub.net `/best/` snapshot

Fetched 2026-11-14. **Reference material only — not wired into the site, and it should not be.**

`CLAUDE.md` is explicit that a scraped tier list is somebody's read of a rotating meta and goes
stale silently, which is why the site computes its own S/A/B/C/D rank in `scripts/rank.py` from
the Game Master. Nothing here belongs in `web/`. This directory exists so the lists can be
*looked at* and compared against, not copied from.

## Layout

- `*.html.gz` — raw HTML exactly as `curl` received it, one per page, plus the two sitemaps.
- `data/*.json` — the full ranked lists, extracted. **Complete**: every file's row count equals
  the total the page itself states, and ranks run 1..N with no gaps.
- `tools/` — how `data/` was produced, so it can be redone.

## Two different extraction paths, because the pages differ

**The 7 PvP league pages** ship their whole list inside the page's own JSON payload, even though
the table only renders 20 rows. `tools/extract.py` + `tools/pvp.py` pull it straight out of the
saved `.html.gz` — no network, no browser. Records keep the site's own shape:
`{pokemon{id,name,form,type1,type2,isLegendary,isMythical}, ranking, score, tier, fastMove,
chargeMove1, chargeMove2}`.

**The other 8 pages** compute their numbers in the browser, so the payload has no rankings.
`tools/scrape.js` loads each page in Playwright and reads the rendered table, clicking through
the pagination where there is any.

## The trap in those tables

The **Tier cell uses `rowspan`** across every row sharing a tier. Reading cells by position
without expanding it shifts each continuation row one column left — the Pokémon name lands in
the `#` column and every number is off by one. This is the same failure `scripts/bulbapedia.py`
documents, and it bit here too: the first pass produced "ranks 1..215" for a 300-row table and
rows like `['1.', '2.', 'Snorlax', 'Dondozo', '5.', ...]`. `tools/scrape.js` expands rowspan and
colspan into a rectangular grid before reading anything. Keep that.

## Counts

| page | rows | note |
|---|---|---|
| great-league | 1154 | from JSON payload |
| great-league-mega | 1212 | from JSON payload |
| ultra-league | 851 | from JSON payload |
| ultra-league-mega | 914 | from JSON payload |
| master-league | 409 | from JSON payload |
| master-league-mega | 472 | from JSON payload |
| little-league | 168 | from JSON payload |
| overall-attackers | 1655 | rendered, 17 pages |
| shadow-pokemon | 496 | rendered, 5 pages |
| gym-defenders | 300 | rendered, 3 pages |
| raid-attackers | 300 | rendered, 3 pages |
| mega-pokemon | 62 | rendered, single page |
| attackers-per-type | 180 | 18 tables, Top 10 per type |
| dynamax-attackers-per-type | 169 | 18 tables; site lists only Top 3 Poison, Top 6 Ghost |
| dynamax-tanks-per-type | 180 | 18 tables, Top 10 per type |

Discovery: `https://db.pokemongohub.net/sitemap.xml` indexes 17 sitemaps; only
`tools/sitemap.xml` carries `/best/` URLs. It lists these 15 English pages (plus de/es/pt/fr/nl
translations, not fetched). The nav links inside the pages give the same 15.
