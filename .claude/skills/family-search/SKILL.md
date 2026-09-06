---
name: family-search
description: The "Match: Exact / Whole family" chips on the Mega and Dynamax pages — searching one name also finds its evolution line, so Weedle finds Mega Beedrill. Use when family search misses or over-matches, when a Pokémon's family looks wrong, when adding search to another page, or when working on the `fam` field in the generated data files.
---

# Search the whole family

`megas.html` and `dynamax.html` carry a **Match** chip row: *Exact* (the default) or *Whole
family*. On Whole family, an entry also matches when any species in its evolution line does —
searching `weedle` finds Mega Beedrill, `pichu` finds Mega Raichu X and Y.

| Piece | Where |
|---|---|
| The family itself | `families()` in `scripts/gamemaster.py` |
| The `fam` field | written by `update_megas.py` and `update_dynamax.py` into the data files |
| The chips and the match | `UI.FAMILY_FILTER` and `UI.searchMatch()` in `web/ui.js` |

## The families are computed, never typed out

`families()` is a union-find over the Game Master's `evolutionBranch` and `parentPokemonId`,
which agree with each other. A hand-written table of evolution lines would be ~500 rows of
exactly the thing this repo has been burned by twice: plausible, unverifiable, silently wrong.

Two things it must keep doing:

- **A branch carrying only `temporaryEvolution` is a MEGA branch, not an evolution.** It has
  no `evolution` key, which is the same test `rank.py` uses to spot a fully evolved species.
  Linking on it would be harmless (a Mega shares its species' id) but wrong, and copied.
- **An evolution target that is not a canonical species is dropped.** Form-only ids would put
  names in the search index that nothing on the site can ever be.

It raises if any family exceeds 12. Eevee is the largest real one at **nine**; anything much
past that means the graph has welded two lines together and family search is returning
nonsense that nobody would notice from the page.

Healthy distribution, for comparison after a Game Master bump:

```
family sizes: {1: 204, 2: 418, 3: 363, 4: 20, 5: 10, 9: 9}
biggest: EEVEE + its eight evolutions
```

## `fam` in the data files

Lowercase slugs (`ho-oh`, not `Ho-Oh`), because they are **matching keys, not display names**.
The Game Master carries no localised names, so title-casing an id would invent "Ho Oh" and
"Porygon Z". Nothing renders them.

**`fam` is absent when a species is its own whole family** — 18 of the 63 Megas, including
Mega Absol, Mega Audino and every Primal. That is the normal path, not a gap: the search
already matches an entry's own name, and the field would be dead weight on a third of the
roster. `UI.searchMatch`'s `(p.fam || [])` is written for that case.

## Adding it to another page

Two lines. Put `UI.FAMILY_FILTER` in the page's `filters`, and route its search through
`UI.searchMatch(entry, [fields…])` instead of hand-rolling `.includes()`:

```js
if (!UI.searchMatch(m, [m.name, m.raid, m.moves, ...(m.types || [])])) return false;
```

A page **without** the chip gets `'all'` from `activeFilter('match')`, which is not
`'family'`, so it keeps exact matching. Adding the chip is what turns the feature on — there
is no flag to remember.

The page also needs `fam` in its data. `mega-finale.html` deliberately has neither: it has no
search box, and its roster is one event's 30-odd Megas.

## Verify

The assertion that matters is the **negative** one, because a family search accidentally
wired on permanently looks identical to a working toggle until someone wants one exact name:

- `weedle` with **Exact** on `megas.html` returns **nothing** — Weedle is not a Mega
- `weedle` with **Whole family** returns exactly Mega Beedrill
- `charmander` with Whole family returns Mega Charizard X and Y **and nothing else**
- a species that is its own whole family (`absol`) still matches exactly once
- typing/moves/role searching still works with the family chip on — widening the match must
  not replace the fields the page already searched
- `bulbasaur` on `dynamax.html` reaches Venusaur, Gigantamax entries included
