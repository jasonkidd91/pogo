#!/usr/bin/env python3
"""Regenerate web/mega-data.js from Bulbapedia. Usage: python3 scripts/update_megas.py"""

import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from bulbapedia import (fetch_wikitext, section, rows, cells, cell_value,
                        find_date, slug, check_sprites, write_js)

OUT = os.path.join(os.path.dirname(__file__), "..", "web", "mega-data.js")

# For Primals and Mega Rayquaza the table's "Boosted types" column is WEATHER-based and is
# not the Pokemon's own typing. Verified on the same page's Effects section.
ACTUAL_TYPES = {
    "Primal Kyogre": ["Water"],
    "Primal Groudon": ["Ground"],
    "Mega Rayquaza": ["Flying", "Dragon"],
}


def mega_name(c):
    m = re.search(r"\{\{p\|([^}|]+)(?:\|([^}]+))?\}\}", c)
    if not m:
        return None
    raw = c.strip()
    if not (raw.startswith("Mega ") or raw.startswith("Primal ")):
        return None
    pre = "Primal" if raw.startswith("Primal") else "Mega"
    return f"{pre} {(m.group(2) or m.group(1)).strip()}"


def art_slug(name):
    """Sprite slug on pokemondb, plus a base-species fallback for GO-original Megas."""
    if name.startswith("Primal "):
        return f"{slug(name[7:])}-primal", slug(name[7:])
    rest = name[5:]
    xy = re.match(r"^(.*) (X|Y)$", rest)
    base = slug(xy.group(1)) if xy else slug(rest)
    primary = f"{base}-mega-{xy.group(2).lower()}" if xy else f"{base}-mega"
    return primary, base


def main():
    txt = fetch_wikitext("Mega_Evolution_(GO)")
    seg = section(txt, "==List of Mega Evolutions and Primal Reversions==")

    out, last = [], {}
    for row in rows(seg):
        cs = cells(row)
        name = next((mega_name(c) for c in cs if mega_name(c)), None)
        if not name:
            continue
        vals = [cell_value(c) for c in cs]
        boosts = next((re.findall(r"\{\{ic/GO\|([A-Za-z]+)\}\}", c)
                       for c in cs if "{{ic/GO|" in c), None)
        cost = next((v.replace(",", "") for v in vals if re.fullmatch(r"[\d,]+", v)), None)
        date = next((d for v in vals if (d := find_date(v))), None)
        atk = next((m.group(1).strip() for c in cs
                    if (m := (re.search(r"\{\{m\|[^|}]+\|([^}]+)\}\}", c)
                              or re.search(r"\{\{m\|([^}|]+)\}\}", c)))), None)
        if cost:
            last["cost"] = cost
        if date:
            last["date"] = date
        if not cost and "cost" not in last:
            raise RuntimeError(f"{name}: no cost and nothing to inherit — check trap 2")
        out.append({"name": name, "boosts": boosts, "energy": int(cost or last["cost"]),
                    "attack": atk, "released": date or last["date"],
                    "_inherited": cost is None})

    if not out:
        raise RuntimeError("parsed zero Megas — page layout changed")

    inherited = [m["name"] for m in out if m["_inherited"]]
    print(f"parsed {len(out)} released Megas")
    print(f"  rows inheriting cost via rowspan (expect only X/Y pairs): {inherited}")
    if len(inherited) > 4:
        raise RuntimeError("too many rows inherited a cost — cell_value is likely failing")

    # sprite verification before we write anything
    pairs = {m["name"]: art_slug(m["name"]) for m in out}
    exists = check_sprites([p for pair in pairs.values() for p in pair])
    missing_both = [n for n, (a, b) in pairs.items() if not exists[a] and not exists[b]]
    if missing_both:
        raise RuntimeError(f"no working sprite for: {missing_both}")

    entries = []
    for m in out:
        primary, fallback = pairs[m["name"]]
        e = {"name": m["name"], "art": primary,
             "types": ACTUAL_TYPES.get(m["name"], m["boosts"]),
             "boosts": m["boosts"], "energy": m["energy"], "released": m["released"]}
        if m["name"] in ACTUAL_TYPES:
            e["weatherBoost"] = True
        if not exists[primary]:
            # No mainline Mega artwork: a GO-original Mega. Fall back to base species.
            e["artFallback"] = fallback
            e["isNew"] = True
        if m["attack"]:
            e["attack"] = m["attack"]
        entries.append(e)

    go_original = [e["name"] for e in entries if e.get("isNew")]
    print(f"  GO-original Megas (no mainline art): {len(go_original)}")
    print(f"  with a Super Max attack: {sum(1 for e in entries if e.get('attack'))}")
    from collections import Counter
    print(f"  cost tiers: {dict(sorted(Counter(e['energy'] for e in entries).items()))}")

    write_js(OUT, HEADER, {"MEGAS": entries})


HEADER = """/**
 * All released Mega Evolutions and Primal Reversions in Pokemon GO.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_megas.py
 * Source: https://bulbapedia.bulbagarden.net/wiki/Mega_Evolution_(GO)
 * Unreleased (HTML-commented) rows are excluded.
 *
 * energy  first-time activation cost; later activations cost far less
 * boosts  party-wide type bonus; weather-based (not own typing) when weatherBoost is set
 * attack  extra Charged Attack unlocked at Super Max Mega Level
 * isNew   GO-original Mega with no mainline artwork; artFallback is base-species art
 */
"""

if __name__ == "__main__":
    main()
