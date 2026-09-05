---
name: update-dynamax
description: Refresh the Dynamax and Gigantamax lists on the pogo site (web/max-data.js and dynamax.html) from Bulbapedia. Use when new Dynamax Pokémon or Gigantamax forms are released, when the user says the Dynamax list is out of date or missing a Pokémon, or when a Max page image is broken. Runs scripts/update_dynamax.py and verifies in a browser.
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
wrote .../web/max-data.js: GIGANTAMAX=17, DYNAMAX=143
```

Both counts should only ever grow. A drop means the page layout changed — investigate before
shipping.

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
the Gigantamax-only / Dynamax-only filters work.
