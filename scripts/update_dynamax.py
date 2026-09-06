#!/usr/bin/env python3
"""Regenerate web/max-data.js from Bulbapedia. Usage: python3 scripts/update_dynamax.py"""

import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from bulbapedia import (fetch_wikitext, section, rows, cells, find_date,
                        slug, check_sprites, write_js)
import gamemaster
from rank import rank_max

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
    """Rank the whole Max roster in place, and return the Game Master's (sha, date).

    Gigantamax and Dynamax are ranked together because they are one pool: a Max Battle
    team is picked from everything you own, not from one list or the other.
    """
    gm, (gm_sha, gm_date) = gamemaster.fetch()
    species = gamemaster.species(gm)
    costs = gamemaster.max_move_costs(gm)

    roster, missing = [], []
    for e in gmax + dyn:
        ps = species.get(gm_id(e["name"]))
        if not ps or "breadTierGroup" not in ps:
            missing.append(e["name"])
            continue
        e["stats"] = ps["stats"]
        e["cost"] = costs[ps["breadTierGroup"]]
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

    rank_max(roster)
    for e in roster:
        del e["stats"], e["cost"]          # working values, not site data

    from collections import Counter
    print(f"  ranks: {dict(sorted(Counter(e.get('rank', '?') for e in roster).items()))}")
    print(f"  roles: {dict(Counter(e['role'] for e in roster if e.get('role')))}")
    print("    " + "; ".join(f"{e['name']} — {e['why'].split(' · ')[0]}"
                             for e in roster if e.get("rank") == "S"))
    return gm_sha, gm_date


def header(gm_sha, gm_date):
    return HEADER.replace("{GM}", f"{gm_sha} ({gm_date})")


HEADER = """/**
 * All released Dynamax and Gigantamax Pokemon in Pokemon GO.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_dynamax.py
 * Sources: https://bulbapedia.bulbagarden.net/wiki/Dynamax_(GO)
 *          https://bulbapedia.bulbagarden.net/wiki/Gigantamax_(GO)
 *          PokeMiners game_master {GM} — base stats and Max move upgrade costs
 *
 * A Gigantamax form is tracked separately from its Dynamax entry — they are different
 * catches. hasGmax marks a Dynamax entry whose species also has a Gigantamax form.
 *
 * raid/stars is stored for Gigantamax only, where the battle is always a six-star
 * Gigantamax Max Battle (https://bulbapedia.bulbagarden.net/wiki/Max_Battle). The tier of a
 * plain Dynamax Pokemon belongs to the current Power Spot rotation rather than the species,
 * rotates weekly, and is deliberately NOT stored — it would be stale within days.
 *
 * rank/role  is this worth candy and Max Particles? Every Dynamax Pokemon has all three
 *            Max moves, so the rank is the best ROLE its base stats suit — Attacker,
 *            Guard or Spirit — as a placing across the whole Max roster. See
 *            scripts/rank.py. A Gigantamax entry ranks on its species' stats: its G-Max
 *            move hits harder, but that damage is not in the Game Master and is not
 *            invented here.
 * why        where it places, and what levelling one Max move costs
 */
"""

if __name__ == "__main__":
    main()
