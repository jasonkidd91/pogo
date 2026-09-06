---
name: update-dynamax
description: Refresh the Dynamax and Gigantamax lists on the pogo site (web/max-data.js and dynamax.html) from Bulbapedia and the Game Master. Use when new Dynamax Pokémon or Gigantamax forms are released, when the user says the Dynamax list is out of date or missing a Pokémon, or when a Max page image is broken. Runs scripts/update_dynamax.py and verifies in a browser. For the S/A/B/C/D rank and the Max roles, see the update-ranks skill.
---

# Update the Dynamax / Gigantamax list

The roster lives in `web/max-data.js`, generated from two Bulbapedia pages. **Do not
hand-edit it** — it carries a `GENERATED` header and will be overwritten.

## Run it

```bash
python3 scripts/update_dynamax.py
```

Expected output shape:

```
parsed 143 Dynamax + 17 Gigantamax
  Gigantamax with no plain-Dynamax entry (expected, not a bug): ['Meowth', 'Lapras', ...]
game master 8e227be44f28 (2026-08-29) — cached
  ranks: {'A': 23, 'B': 41, 'C': 79, 'S': 17}
  roles: {'Guard': 29, 'Spirit': 24, 'Attacker': 28}
    Blissey — #1 Max Spirit of 160; Shuckle — #1 Max Guard of 160; Alakazam — #1 Max Attacker...
wrote .../web/max-data.js: GIGANTAMAX=17, DYNAMAX=143
```

Both counts should only ever grow. A drop means the page layout changed — investigate before
shipping.

Bulbapedia gives the roster; the Game Master gives the base stats and the Max move costs the
rank is built from. `no Game Master entry, left unranked` naming more than a handful means
`gm_id` stopped matching `pokemonId` — the script raises above 10.

## Tiers: Gigantamax yes, Dynamax no

Gigantamax rows get `raid: 'Gigantamax Battle', stars: 6` — a Gigantamax encounter is always a
six-star Max Battle, per the difficulty table on `Max_Battle`. Plain Dynamax rows get **no
tier at all**, and that is deliberate: a Dynamax Pokémon's tier belongs to the current Power
Spot rotation, not to the species, and it changes weekly. Do not "complete" the data by adding
one — it would be wrong within days. `dynamax.html` says so in its footer.

## Two structural facts to preserve

- **Gigantamax is tracked separately from Dynamax.** Gigantamax Venusaur and Dynamax Venusaur
  are different catches with different keys (`gmax:venusaur` vs `dmax:venusaur`). Never merge
  them, and never make one imply the other.
- **Some Gigantamax species have no plain-Dynamax row.** Currently Meowth, Lapras, Snorlax and
  Grimmsnarl. The script prints these. It is a property of the source data, not a parse failure.

## New forms are the usual breakage

The Dynamax table lists Pokémon as `{{MSP/GO|<formId>|<Name>}}`. Regional forms and alternate
styles need an explicit sprite mapping, or the sprite check fails and the script raises.

Add to `FORMS` in the script, keyed by the Bulbapedia form id:

```python
FORMS = {
    "0849A": ("toxtricity-amped", "Amped Form"),
    "0892R": ("urshifu-rapid-strike", "Rapid Strike Style"),
}
```

Confirm the slug before adding it:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://img.pokemondb.net/sprites/home/normal/<slug>.png
```

Alolan/Galarian/Hisuian forms on pokemondb use `-alolan`, `-galarian`, `-hisuian`.

## The rank and the three Max roles

Each card carries an S/A/B/C/D grade plus a role — **Max Attacker / Max Guard / Max Spirit**.
Every Dynamax Pokémon has all three Max moves, so the rank is not a power score: it is the
best role its base stats suit, as a placing across the whole 160-strong Max roster. Blissey is
bottom-decile Attack and the #1 Max Spirit in the game; that is the point of ranking by role.

The reason line also carries the **candy and XL cost to level one Max move**, read from the
species' `breadTierGroup` in the Game Master ("bread" is the internal codename for Dynamax).
That is the real price of committing to a Dynamax Pokémon and belongs next to the grade.

`C` is the whole bottom half of the roster and is the most useful filter on this page — it is
the answer to "what can I transfer without thinking about it". It has its own chip.

Model, bands and wording live in `scripts/rank.py` and the **`update-ranks`** skill. One rule
worth repeating here: a **Gigantamax entry ranks on its species' stats**, because its G-Max
move hits harder but that damage is not in the Game Master. The header says so. Do not invent
a bonus to "fix" a Gigantamax and its Dynamax twin sharing a grade.

## Deliberately not stored

**Max Battle tiers (1★/3★/5★) and current Power Spot rotations.** These change weekly, so
baking them into a static file guarantees they are wrong within days. The page footer says so
and points at the in-game Power Spot. If the user wants live tiers, that needs a runtime fetch
against a live tracker, not this generator — raise it as a design change rather than adding a
stale column.

**Types are not stored either.** Bulbapedia's Dynamax table doesn't carry them. If types are
wanted, pull them from PokéAPI in the generator (one pass, cached into the data file) rather
than fetching 143 times at page load.

## Verify

```bash
python3 -m http.server 8777 --directory web
```

Open `http://localhost:8777/dynamax.html`: section counts match the script, no broken images,
the Gigantamax-only / Dynamax-only filters work, and the Worth it / Role chips narrow the list
to cards whose reason line actually names that role.
