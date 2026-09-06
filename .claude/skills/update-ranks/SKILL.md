---
name: update-ranks
description: Work on the S/A/B/C/D "worth investing in" rank shown on each Mega and Dynamax card — the Game Master feed behind it, the scoring model in scripts/rank.py, the bands, and the reason line. Use when a rank looks wrong, when a Pokémon reads "?", when the rank bands need retuning, when a new Pokémon needs rating, or when the user asks what a grade means or wants the rank extended to another page.
---

# The rank on each card

Every Mega and Dynamax card carries a letter answering one question: **should I spend
resources on this, or is it Pokédex filler?** It is computed, never remembered and never
copied from a tier list.

Two files own it:

| File | Owns |
|---|---|
| `scripts/gamemaster.py` | Fetching and parsing the Game Master, and the traps in doing so |
| `scripts/rank.py` | The damage model, the bands, and the wording of the reason line |

Both generators (`update_megas.py`, `update_dynamax.py`) call them. There is no separate
rank generator and there should not be — a rank that can drift out of sync with the roster
it ranks is worse than no rank.

## Where the numbers come from

**PokeMiners' `game_masters/latest/latest.json`** — the game's own data file, ~19 MB, updated
within days of each release. It carries base stats, PvE and PvP move tables, the Mega boost
multipliers (`1.3` same-type / `1.1` off-type, from `MEGA_EVOLUTION_LEVEL_0`) and
`breadTierGroup`, which is the Dynamax candy/XL cost tier. "Bread" is the game's internal
codename for Dynamax.

`gamemaster.fetch()` caches by upstream commit sha in the temp directory, so re-running a
generator is instant and a new upstream commit invalidates the cache by itself. **There is
deliberately no way to pin an older copy.** A stale Game Master ranks a Pokémon on last
month's moves and says nothing about it.

The five traps are documented at the top of `scripts/gamemaster.py`. Every one fails
*silently* — a plausible number, not an error. Read them before touching that file. The two
that bite hardest:

- **The Game Master lags the game.** Megas released in the last few days are simply absent.
  They must render `?` / "Too new to rate", never a guess off the base species.
- **Mega stats live in `tempEvoOverrides`, not `stats`,** and the override carries
  `typeOverride1/2`. Read the wrong one and every Mega ranks as its unevolved species in the
  wrong type pool.

## The model

Read the module docstring in `scripts/rank.py` — it is the spec, and it records why each band
is where it is. In short:

**Megas** are scored on sustained cycle DPS (L40, 15/15/15, neutral 200-defense target) and
on how well their type is already covered. All Megas of a type give the *same* 1.3× party
boost, so "which Fire Mega boosts best" is not a real question; what differs is whether this
is the one you would bring, and how many others cover it.

**Dynamax** entries all have Max Attack, Guard and Spirit, so the rank is the best *role*
their base stats suit, as a placing across the whole 160-strong Max roster.

### Sanity-check the ordering before trusting a change

The model is only as good as its output. After any change to the damage model or the bands,
eyeball the top and bottom:

```
Mega Mewtwo Y 21.1 · Mega Mewtwo X 20.2 · Mega Rayquaza 18.7   ← top
Mega Kangaskhan 9.9 · Mega Mawile 9.1 · Mega Audino 8.4 · Mega Sableye 7.9   ← bottom
Alakazam #1 Max Attacker · Shuckle #1 Max Guard · Blissey #1 Max Spirit
```

That is community consensus, arrived at independently. If a change moves Mega Beedrill above
Mega Rayquaza, the change is wrong — do not ship it and rewrite the bands to fit.

## Rules the wording has to keep

- **The comparison pool is the page's own roster.** "Best Ice Mega" is true; "Best Ice
  attacker" is false — Mamoswine beats Mega Glalie without Mega Evolving at all. Never let
  the reason line make the second claim.
- **Every reason line states the placing**, at every rank: "#2 of 4 Bug Megas, behind Mega
  Heracross". D appends "collection only" on top of that rather than replacing it. The letter
  alone is an opinion; the placing is the evidence for it.
- **A grade must never be invented for missing data.** No Game Master entry → `?`. A
  Gigantamax entry ranks on its species' stats, because its G-Max move's damage is not in the
  Game Master, and that limit is stated in the data file header rather than papered over with
  a made-up bonus.

## Retuning the bands

Bands live in `rank_megas` and `rank_max`. Two failures already found and guarded against —
do not reintroduce either:

- **A knife-edge split mislabels the entry next to it.** A hard median cut put Mega Beedrill,
  #2 of only four Bug Megas, one hundredth of a DPS below the line and called it "collection
  only". D now needs bottom-quartile DPS *and* no scarce type.
- **Per-role percentiles inflate the top grade.** Banding Dynamax as "top 10% of each of the
  three roles" handed an S to 48 of 160. Band on the distribution of each entry's *best* role
  instead, which is what the code does now.

Healthy distributions, for comparison after a retune:

```
megas    S 11 · A 5 · B 11 · C 22 · D 12 · ? 2      (63)
dynamax  S 17 · A 23 · B 41 · C 79                  (160)
```

## Legacy moves

22 of the 63 Megas rank on an Elite TM or Community Day move — Frenzy Plant is worth 15.5%
of Mega Sceptile's DPS. Those are included, because they are the ceiling the Pokémon can
reach, and flagged with `legacy: true` plus the moveset so the card can say *which* move the
grade depends on. Dropping the flag would leave a rank nobody can reach with a plain TM.

## A rank looks wrong

1. Check the reason line first. It names the placing and the leader, so a wrong rank is
   usually a wrong *pool* — the wrong typing, or a name that failed to map.
2. Check the entry has a Game Master row at all: a `?` is missing data, not a low grade.
3. `gm_key` (megas) and `gm_id` (Dynamax) map site names to `pokemonId`. Both raise when too
   many entries fail to map, but a single silent miss is possible for an odd name — an
   apostrophe, a gendered symbol, a new regional form.
4. Only then suspect the model. Re-run the ordering check above before changing anything.

## Verify

Use the `verify-site` skill. The rank-specific assertions:

- every card has a rank chip **and** a non-empty reason line,
- the rank appears in the card's `aria-label` — it lives inside `.name`, and `aria-label`
  replaces card content for a screen reader, so it is otherwise not announced at all,
- the chip is not struck through on a collected card (`inline-flex` blocks the parent's
  `line-through`; a plain `inline` chip gets struck),
- the "Worth it" filter narrows the list and leaves only matching chips,
- on `dynamax.html` the Role filter leaves only cards whose reason names that role,
- no card body clips or overflows at 390px — the reason line is the longest text on a card.
