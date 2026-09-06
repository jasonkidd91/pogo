---
name: update-ranks
description: Work on the S/A/B/C/D combat-power rank shown on each Mega and Dynamax card — the Game Master feed behind it, the damage model in scripts/rank.py, the shared scale, and the Max role badge. Use when a rank looks wrong, when a Pokémon reads "?", when the bands need retuning, when a new Pokémon needs rating, or when the user asks what a grade means or wants the rank extended to another page.
---

# The rank on each card

Every Mega and Dynamax card carries a letter answering one question: **how hard does this
hit?** It is computed, never remembered and never copied from a tier list.

**The rank is combat power and nothing else.** It says nothing about Mega Energy, candy, XL,
Max Particles, or how well a type is already covered. That was tried and removed: mixing a
placing and a price into one letter produced card text like *"#2 of 4 Bug Megas, behind Mega
Heracross · 100 energy"*, which answers a question nobody asked and buries the one they did.

Two files own it:

| File | Owns |
|---|---|
| `scripts/gamemaster.py` | Fetching and parsing the Game Master, and the traps in doing so |
| `scripts/rank.py` | The damage model, the scale, and the Max role badge |

Both generators (`update_megas.py`, `update_dynamax.py`) call them. There is no separate rank
generator and there should not be — a rank that can drift out of sync with the roster it ranks
is worse than no rank.

## Where the numbers come from

**PokeMiners' `game_masters/latest/latest.json`** — the game's own data file, ~19 MB, updated
within days of each release. It carries base stats, PvE and PvP move tables, typing, and the
Mega boost multipliers.

`gamemaster.fetch()` caches by upstream commit sha in the temp directory, so re-running a
generator is instant and a new upstream commit invalidates the cache by itself. **There is
deliberately no way to pin an older copy.** A stale Game Master ranks a Pokémon on last
month's moves and says nothing about it.

The five traps are documented at the top of `scripts/gamemaster.py`. Every one fails
*silently* — a plausible number, not an error. The two that bite hardest:

- **The Game Master lags the game.** Megas released in the last few days are simply absent.
  They must render `?` / "Too new to rate", never a guess off the base species.
- **Mega stats live in `tempEvoOverrides`, not `stats`,** and the override carries
  `typeOverride1/2`. Read the wrong one and every Mega ranks as its unevolved species —
  and with the wrong typing, so its STAB is wrong too.

## The model

Sustained cycle DPS at level 40, 15/15/15, against a **neutral** 200-defense target, using
the PvE move table. Best fast+charged pairing wins. Neutral means no type effectiveness
enters: this is raw attacking power, not a matchup. Read the module docstring in
`scripts/rank.py` — it is the spec.

## The scale

One ladder for the whole site, so a B on the Dynamax page means what a B means on the Mega
page. Grades are percentiles of a **reference pool of every fully evolved species plus every
Mega and Primal** — currently 611 forms.

```
S  top 5%   (≥15.3 DPS)      A  top 12%  (≥13.6)      B  top 25%  (≥12.1)
C  top 50%  (≥10.2)          D  below the median
```

Half-evolved Pokémon are excluded from the denominator on purpose: leaving Caterpie and
Magikarp in it flatters everything above them. `power_scale()` raises if the fully-evolved
pool drops under 300, because a broken `evolutionBranch` filter would silently drag every
threshold down and inflate every grade on the site.

**Megas cluster at the top and most of the Dynamax roster does not.** No plain Dynamax
Pokémon is a top-5% attacker in its base form, so that page tops out at A. That is the honest
answer, not a scale problem to tune away — and it is exactly what makes the shared ladder
worth having.

### Sanity-check the ordering before trusting a change

After any change to the damage model or the bands, eyeball the top and bottom:

```
Mega Mewtwo Y 21.1 · Mega Mewtwo X 20.2 · Mega Rayquaza 18.7   ← top
Mega Kangaskhan 9.9 · Mega Mawile 9.1 · Mega Audino 8.4 · Mega Sableye 7.9   ← bottom
```

That is community consensus, arrived at independently. If a change moves Mega Beedrill above
Mega Rayquaza, the change is wrong.

Healthy distributions, for comparison after a retune:

```
megas    S 24 · A 17 · B 7 · C 9 · D 4 · ? 2      (63)
dynamax  A 7 · B 24 · C 29 · D 100                (160)
```

## `?` versus `D`

These mean different things and must not be merged:

- **`?`** — the Game Master has no entry for the species. Missing data. The *caller* sets
  this, and `apply_ranks` leaves it alone.
- **`D`** — including a species with a Game Master entry but **no usable attacking moveset at
  all**. Magikarp is D, not `?`: "cannot fight" is the bottom of the scale, not an unknown.
  Those cards show no DPS line, which is correct — there is no number to show.

## The Max role badge — deliberately not the rank

`MAX ATTACKER` / `MAX GUARD` / `MAX SPIRIT` on a Dynamax card marks the top quarter of the
roster for Attack, Defense or Stamina. It is **not** part of the grade, and that separation is
the point: Blissey is a **D** attacker and the **best Max Spirit in the game**. Power cannot
express that, so the badge does, and a browser check asserts exactly that pair stays true.

## Rules the wording has to keep

- **A grade is never invented for missing data.** No Game Master entry → `?`.
- **A Gigantamax entry ranks on its species' stats.** Its G-Max move hits harder, but that
  damage is not in the Game Master, so no bonus is invented — the data file header says so.
- **The card shows the number, not prose.** `17.6 DPS · Lick + Shadow Ball` is the whole
  explanation a card owes the reader. A ⚑ marks a moveset needing an Elite TM or a Community
  Day move, because the grade is out of reach without it — 22 of the 63 Megas are in that
  position, and Frenzy Plant is worth 15.5% of Mega Sceptile's DPS.

## A rank looks wrong

1. Check the DPS number on the card first — the letter is a pure function of it.
2. Check the entry has a Game Master row at all: `?` is missing data, not weakness.
3. `gm_key` (megas) and `gm_id` (Dynamax) map site names to `pokemonId`. Both raise when too
   many entries fail to map, but a single silent miss is possible for an odd name.
4. Check the typing — it drives STAB, so a wrong type is a wrong number.
5. Only then suspect the model. Re-run the ordering check above before changing anything.

## Where it renders

`UI.rankChip()` and `UI.powerLine()` inside `UI.monCard()` in `web/ui.js` — one card component
for the whole site. Read the `design-system` skill before changing how it looks. **Every grade
is a filled chip and must clear 4.5:1 contrast**; the first build left B, C and D translucent
or hollow and they became unreadable on a collected card, which dims the body. The chip itself
barely dims when ticked, because the rank is a fact about the species, not about your progress.

## Verify

Use the `verify-site` skill. The rank-specific assertions:

- every card has a rank chip, and every card with a DPS shows it,
- a card with **no** DPS line is `?` or `D` — never anything else,
- the rank and its meaning appear in the card's `aria-label`; it lives inside `.name`, and
  `aria-label` replaces card content for a screen reader,
- **every filled grade clears 4.5:1 contrast**, and a collected card keeps the chip at ≥0.8
  opacity,
- the chip is not struck through on a collected card (`inline-flex` blocks the parent's
  `line-through`),
- the Power filter narrows and leaves only matching grades,
- Blissey is rank D with a `MAX SPIRIT` badge — power and role stay separate,
- no card body clips or overflows at 390px.
