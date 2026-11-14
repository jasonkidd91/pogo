---
name: update-squad
description: Refresh the Squad page's PvE picks (web/squad-data.js and squad.html) from Pokemon GO Hub's tier lists. Use when the user says a squad pick looks wrong or stale, when a new Gigantamax/Dynamax/Mega form is released and should appear, or when working on scripts/update_squad.py or scripts/squadhub.py. Runs scripts/update_squad.py and verifies the result in a browser. Picks are ranked from Pokemon GO Hub, not scripts/rank.py — a deliberate exception; read CLAUDE.md's "The Squad page" section before touching that choice.
---

# Update the Squad page's picks

`web/squad-data.js` is generated from **Pokemon GO Hub**, not Bulbapedia or the Game Master.
**Do not hand-edit it** — it has a `GENERATED` header and the next refresh overwrites it.

## The one rule that's different here

Everywhere else on this site, "how good is this Pokemon" is computed in `scripts/rank.py`
from the Game Master, because a scraped tier list goes stale silently. **This page breaks
that rule on purpose, at the owner's explicit request** — every ordering here, across all
four tiers (Gigantamax, Dynamax, Mega, plain attacker), is Pokemon GO Hub's own tier list.
The site's S/A/B/C/D rank is not shown on this page at all.

**If you're tempted to "fix" this back to `rank.py`, ask the owner first.** It isn't an
oversight. See CLAUDE.md's "The Squad page" section and `scripts/update_squad.py`'s docstring
for the full reasoning, including why a strict Gmax>Dmax>Mega>plain fill was tried and
rejected (it empties the page of everything but Gmax/Dmax in 17 of 18 types).

What did **not** move to Hub is the roster: whether a Pokemon has a Gigantamax, Dynamax or
Mega form at all still comes from `web/max-data.js` / `web/mega-data.js` (Bulbapedia + Game
Master). That's a gate, not cosmetic — Hub ranks Mega Clefable 8th for Normal and it isn't
released in GO.

## Run it

```bash
python3 scripts/update_squad.py                  # fetch Pokemon GO Hub live
python3 scripts/update_squad.py --from <dir>      # parse saved HTML in <dir> instead
python3 scripts/update_squad.py --no-sprite-check # skip the sprite-URL check (faster iteration)
```

`db.pokemongohub.net` has been blocked from some sandboxed containers (not yet observed from
GitHub Actions runners — `monthly-squad.yml` fetches live). `--from` is the same
accommodation `scripts/check_official_news.py` makes with `--news`: save each page's raw HTML
into a directory named after the keys in `scripts/squadhub.py`'s `PAGES` dict
(`attackers-per-type.html`, `dynamax-attackers-per-type.html`, `dynamax-tanks-per-type.html`,
`mega-pokemon.html`) and point `--from` at it.

Expected output shape:

```
parsed PogoHub: 180 attacker rows, 169 Max attacker rows, 180 Max tank rows, 62 Megas
NOTE: 6 ranked form(s) not in the site's released roster, so not shown:
  - Dynamax Lapras
  - Mega Clefable
  ...
wrote web/squad-data.js: 18 types, 108 picks
```

## Check the output before trusting it

- **`wrote ... N picks` where N is well below 108 (18 types x 6)** → a type ran dry. Check
  the `NOTE: fewer than 6 picks for: [...]` line the generator prints; a type with fewer than
  6 candidates across all four tiers is possible but should be rare — if it's happening for
  many types at once, something upstream broke (roster file shape changed, or Hub's table
  layout changed).
- **The "not in the site's released roster" list balloons** → either Hub ranked a batch of
  newly-released forms that `web/mega-data.js`/`web/max-data.js` haven't caught up to yet
  (run `update-megas`/`update-dynamax` first), or Hub's name format changed and the matcher in
  `roster()` (`scripts/update_squad.py`) stopped recognizing names it used to match. Compare
  against the previous run's list — a stable set of unreleased forms (Mega Clefable, etc.) is
  expected; a sudden flood of *released* names landing in that list is the bug.
- **A sprite check failure** (`sprite: X -> Y (form art missing)`) for anything other than the
  known 13 GO-original Megas (same list as the Mega page) → a genuinely broken slug. The
  generator raises rather than writing it; do not silence the check.
- **`built N type sections, expected 18`** or **`no picks at all for [...]`** → Hub's page
  layout changed badly enough that `squadhub.by_type()` couldn't pair all 18 type headings to
  their tables. Read the three traps documented at the top of `scripts/squadhub.py` before
  patching — rowSpan-grouped tier cells, 18 identical tables disambiguated only by heading
  text, and Hub ranking unreleased forms.
- **A Max pick with a high rank but a huge `#` placing number** is not a bug — Max tiers blend
  Hub's attacker tier with its best Max-tank-list showing (bulk matters when only 4 players
  can be in a Max Battle), so a tanky #10 can legitimately outrank a frailer #2. The card's
  tooltip on `#` says it's Hub's damage placing, not this page's position, for exactly this
  reason.

## Verify in a browser

Same discipline as every other page here — see the `verify-site` skill. At minimum: open
`squad.html`, confirm 18 sections render, every card links out to
`https://db.pokemongohub.net/pokemon/<id>`, the type filter chips and search work, and no
image is broken (the 6 GO-original Megas should silently fall back to base-species art, not
show a broken-image icon). Re-check the other pages that share `web/store.js`/`web/styles.css`
(index, megas, dynamax, promo-codes, archive, notifications) for regressions if you touched
either of those shared files.

## The automated side

`.github/workflows/monthly-squad.yml` runs this generator on the 1st of every month and
**pushes straight to `main`** if anything changed — no PR step, unlike `weekly-collections.yml`
for the Mega/Dynamax roster. It has no block-detection or fallback path yet; if Pokemon GO Hub
starts blocking that runner, the job just fails (red run in the Actions tab), and nothing gets
written or committed. See the comment at the top of that workflow file before adding one.
