#!/usr/bin/env python3
"""Regenerate web/max-data.js from Bulbapedia. Usage: python3 scripts/update_dynamax.py"""

import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from bulbapedia import (fetch_wikitext, section, rows, cells, find_date,
                        slug, check_sprites, write_js)
import gamemaster
from rank import apply_ranks, apply_roles, power_of, power_scale

OUT = os.path.join(os.path.dirname(__file__), "..", "web", "max-data.js")

# Bulbapedia form ids -> pokemondb sprite slug + a human label.
FORMS = {
    "0849A": ("toxtricity-amped", "Amped Form"),
    "0849L": ("toxtricity-low-key", "Low Key Form"),
    "0892":  ("urshifu-single-strike", "Single Strike Style"),
    "0892R": ("urshifu-rapid-strike", "Rapid Strike Style"),
}


def main():
    # ---- Gigantamax ----
    g_txt = fetch_wikitext("Gigantamax_(GO)")
    gmax = []
    for row in rows(section(g_txt, "==List of Gigantamax Pokémon==")):
        m = re.search(r"Gigantamax \{\{p\|([^}|]+)(?:\|([^}]+))?\}\}", row)
        if not m:
            continue
        move = re.search(r"\{\{mcolor\|([^|}]+)", row)
        gmax.append({"name": (m.group(2) or m.group(1)).strip(),
                     "art": slug((m.group(2) or m.group(1)).strip()) + "-gigantamax",
                     "gmaxMove": move.group(1) if move else None,
                     # Every Gigantamax encounter is a Gigantamax Max Battle, six stars —
                     # see the difficulty table on
                     # https://bulbapedia.bulbagarden.net/wiki/Max_Battle. Plain Dynamax
                     # Pokemon get no tier: theirs is a property of the current Power Spot
                     # rotation, not of the species.
                     "raid": "Gigantamax Battle", "stars": 6,
                     "released": find_date(row)})

    # ---- Dynamax ----
    d_txt = fetch_wikitext("Dynamax_(GO)")
    seg = d_txt[d_txt.index("==List of Pokémon capable of Dynamaxing by release date=="):]
    seg = seg[: seg.index("\n==", 5)]

    gnames = {g["name"] for g in gmax}
    dyn, seen = [], set()
    for row in rows(seg):
        date = find_date(row)
        if not date:
            continue
        for fid, nm in re.findall(r"\{\{MSP/GO\|([0-9A-Za-z]+)\|([^}]+)\}\}", row):
            nm = nm.strip()
            art, label = FORMS.get(fid, (slug(nm), None))
            if art in seen:
                continue
            seen.add(art)
            e = {"name": nm, "art": art, "released": date}
            if label:
                e["form"] = label
            if nm in gnames:
                e["hasGmax"] = True
            dyn.append(e)

    if not gmax or not dyn:
        raise RuntimeError("parsed zero rows — page layout changed")

    exists = check_sprites([x["art"] for x in gmax + dyn])
    broken = [x["name"] for x in gmax + dyn if not exists[x["art"]]]
    if broken:
        raise RuntimeError(
            f"no sprite for: {broken}. Add a FORMS mapping for regional/alternate forms."
        )

    print(f"parsed {len(dyn)} Dynamax + {len(gmax)} Gigantamax")
    orphan = [g["name"] for g in gmax if g["name"] not in {d["name"] for d in dyn}]
    print(f"  Gigantamax with no plain-Dynamax entry (expected, not a bug): {orphan}")

    gm_sha, gm_date = add_ranks(gmax, dyn)

    write_js(OUT, header(gm_sha, gm_date), {"GIGANTAMAX": gmax, "DYNAMAX": dyn})


def gm_id(name):
    """Site name -> Game Master pokemonId. 'Ho-Oh' -> 'HO_OH'."""
    return re.sub(r"[^A-Z0-9]+", "_", name.upper())


def add_ranks(gmax, dyn):
    """Add typing, combat power and the Max role in place; return the Game Master's date.

    The rank is combat power on the same site-wide scale the Mega page uses, so a B here
    means what a B means there. The role badge is separate and is not part of it — see
    scripts/rank.py.
    """
    gm, (gm_sha, gm_date) = gamemaster.fetch()
    species = gamemaster.species(gm)
    moves = gamemaster.moves(gm)

    roster, missing = [], []
    for e in gmax + dyn:
        ps = species.get(gm_id(e["name"]))
        if not ps or "breadTierGroup" not in ps:
            # Missing data, not a weak Pokemon. apply_ranks leaves a "?" alone.
            e["rank"] = "?"
            missing.append(e["name"])
            continue
        # Typing was previously left out of this file entirely, which made a Dynamax card
        # carry noticeably less than a Mega one. The Game Master has it.
        e["types"] = gamemaster.types_of(ps)
        got = power_of(ps["stats"], e["types"], ps, moves)
        if got:
            e["dps"] = got["dps"]
            e["moves"] = got["moves"]
            if got["legacy"]:
                e["legacy"] = True
        e["stats"] = ps["stats"]
        roster.append(e)

    # Trap 1 in gamemaster.py: a species too new for the Game Master gets no rank rather
    # than a guessed one. A handful is normal; the whole roster means gm_id stopped
    # matching, which would silently blank every card.
    if missing:
        print(f"  no Game Master entry, left unranked ({len(missing)}): {missing}")
    if len(missing) > 10:
        raise RuntimeError(
            f"{len(missing)} of {len(gmax) + len(dyn)} have no Game Master entry — gm_id is "
            "probably no longer matching the pokemonId naming"
        )

    scale = power_scale(gm, moves)
    pool = scale.pop("_pool")
    apply_ranks(roster, scale)
    apply_roles(roster)
    for e in roster:
        del e["stats"]                     # a working value, not site data

    from collections import Counter
    print(f"  power scale from {pool} fully-evolved forms: "
          f"{ {k: round(v, 1) for k, v in scale.items()} }")
    print(f"  ranks: {dict(sorted(Counter(e.get('rank', '?') for e in roster).items()))}")
    print(f"  roles: {dict(Counter(e['role'] for e in roster if e.get('role')))}")
    best = sorted((e for e in roster if e.get("dps")), key=lambda e: -e["dps"])[:6]
    print("    strongest: " + ", ".join(f"{e['name']} {e['dps']} ({e['rank']})" for e in best))
    return gm_sha, gm_date


def header(gm_sha, gm_date):
    return HEADER.replace("{GM}", f"{gm_sha} ({gm_date})")


HEADER = """/**
 * All released Dynamax and Gigantamax Pokemon in Pokemon GO.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_dynamax.py
 * Sources: https://bulbapedia.bulbagarden.net/wiki/Dynamax_(GO)
 *          https://bulbapedia.bulbagarden.net/wiki/Gigantamax_(GO)
 *          PokeMiners game_master {GM} — base stats, typing and move tables
 *
 * A Gigantamax form is tracked separately from its Dynamax entry — they are different
 * catches. hasGmax marks a Dynamax entry whose species also has a Gigantamax form.
 *
 * raid/stars is stored for Gigantamax only, where the battle is always a six-star
 * Gigantamax Max Battle (https://bulbapedia.bulbagarden.net/wiki/Max_Battle). The tier of a
 * plain Dynamax Pokemon belongs to the current Power Spot rotation rather than the species,
 * rotates weekly, and is deliberately NOT stored — it would be stale within days.
 *
 * rank   COMBAT POWER ONLY, on the same site-wide scale as web/mega-data.js: S/A/B/C/D by
 *        percentile of every fully evolved Pokemon and Mega in the game. A Gigantamax entry
 *        ranks on its species' stats — its G-Max move hits harder, but that damage is not in
 *        the Game Master and is not invented here.
 * role   Max Attacker / Guard / Spirit, when its stats put it in the top quarter of the
 *        roster for one. NOT part of the rank: Blissey is a D attacker and the best Max
 *        Spirit in the game, and that is the whole reason this field exists.
 * types  the species' own typing, from the Game Master
 * dps    sustained cycle DPS at level 40, 15/15/15, vs a neutral 200-defense target
 * moves  the moveset that DPS assumes; legacy marks one needing an Elite TM or a
 *        Community Day move
 */
"""

if __name__ == "__main__":
    main()
