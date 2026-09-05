#!/usr/bin/env python3
"""Regenerate web/max-data.js from Bulbapedia. Usage: python3 scripts/update_dynamax.py"""

import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from bulbapedia import (fetch_wikitext, section, rows, cells, find_date,
                        slug, check_sprites, write_js)

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

    write_js(OUT, HEADER, {"GIGANTAMAX": gmax, "DYNAMAX": dyn})


HEADER = """/**
 * All released Dynamax and Gigantamax Pokemon in Pokemon GO.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_dynamax.py
 * Sources: https://bulbapedia.bulbagarden.net/wiki/Dynamax_(GO)
 *          https://bulbapedia.bulbagarden.net/wiki/Gigantamax_(GO)
 *
 * A Gigantamax form is tracked separately from its Dynamax entry — they are different
 * catches. hasGmax marks a Dynamax entry whose species also has a Gigantamax form.
 * Max Battle tiers are deliberately NOT stored: they rotate weekly and would go stale.
 */
"""

if __name__ == "__main__":
    main()
