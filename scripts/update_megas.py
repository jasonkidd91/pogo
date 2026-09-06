#!/usr/bin/env python3
"""Regenerate web/mega-data.js from Bulbapedia. Usage: python3 scripts/update_megas.py"""

import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from bulbapedia import (fetch_wikitext, section, rows, cells, cell_value,
                        find_date, slug, check_sprites, write_js, category_members)
import gamemaster
from rank import best_cycle, rank_megas, moveset_label

OUT = os.path.join(os.path.dirname(__file__), "..", "web", "mega-data.js")

# For Primals and Mega Rayquaza the table's "Boosted types" column is WEATHER-based and is
# not the Pokemon's own typing. Verified on the same page's Effects section. The typing
# itself now comes from the Game Master, which is the game's own data; this set only marks
# which entries get the weather pill.
WEATHER_BOOSTED = ("Primal Kyogre", "Primal Groudon", "Mega Rayquaza")


def gm_key(name):
    """Site name -> the (pokemonId, tempEvoId) pair the Game Master keys Megas by."""
    if name.startswith("Primal "):
        return (name[7:].upper().replace(" ", "_"), "TEMP_EVOLUTION_PRIMAL")
    m = re.fullmatch(r"Mega (.+?)(?: ([XY]))?", name)
    species = m.group(1).upper().replace(" ", "_").replace("-", "_")
    return (species, "TEMP_EVOLUTION_MEGA" + (f"_{m.group(2)}" if m.group(2) else ""))


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


# Raid class per species, quoted from https://bulbapedia.bulbagarden.net/wiki/Raid_Battle_(GO):
#
#   "Standard Mega Raids feature non-Legendary Pokemon, and these bosses have an HP of 9500,
#    and an Attack and Defence multiplier of 0.79, equivalent to those of a four-star raid."
#   "Legendary Mega Raids feature Mega Evolved Legendary or Mythical Pokemon. They are
#    classified as six-star raids."
#   "Primal Raids feature Primal Groudon or Primal Kyogre. Despite having the same HP as
#    six-star Mega Raid Bosses, they are classified as five-star raids."
#
# This is the battle's class for that species, which is stable. It is NOT a claim that the
# Pokemon is in the raid rotation right now — that changes constantly and is not stored.
#
# Super Mega Raids are deliberately NOT derived here. The same page describes them as a
# harder, shielded variant that a Mega Raid becomes during an event, not a property of the
# species, so deriving one per Pokemon would be confidently wrong.


def base_species(name):
    """'Mega Charizard X' -> 'Charizard', matching Bulbapedia's species article titles."""
    return re.sub(r" (X|Y)$", "", re.sub(r"^(Mega|Primal) ", "", name))


def raid_class(name, special):
    if name.startswith("Primal "):
        return "Primal Raid", 5
    if base_species(name) in special:
        return "Legendary Mega Raid", 6
    return "Mega Raid", 4


def main():
    # Legendary/Mythical membership decides the raid class; fetch it before parsing so a
    # category rename fails before we have written anything.
    special = category_members("Legendary Pokémon") | category_members("Mythical Pokémon")
    print(f"Legendary + Mythical species on Bulbapedia: {len(special)}")

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

    # Battle numbers come from the Game Master, never from a tier list or memory. See
    # scripts/rank.py for the model and scripts/gamemaster.py for the traps.
    gm, (gm_sha, gm_date) = gamemaster.fetch()
    gm_moves = gamemaster.moves(gm)
    gm_megas = gamemaster.mega_forms(gm)

    entries = []
    for m in out:
        primary, fallback = pairs[m["name"]]
        raid, stars = raid_class(m["name"], special)
        form = gm_megas.get(gm_key(m["name"]))
        e = {"name": m["name"], "art": primary,
             # Trap 3: the Mega's own typing, not the base species'. Falls back to
             # Bulbapedia's boosted-types column when the Game Master has not caught up.
             "types": form["types"] if form else m["boosts"],
             "boosts": m["boosts"], "energy": m["energy"], "raid": raid, "stars": stars,
             "released": m["released"]}
        if m["name"] in WEATHER_BOOSTED:
            e["weatherBoost"] = True
        if form:
            # Elite-TM and Community Day moves are included: they are the ceiling this
            # Pokemon can actually reach, and 22 of the roster rank on one. `legacy` says
            # so on the card, because the rank is unreachable without that move.
            fast = form["fast"] + form["eliteFast"]
            charged = form["charged"] + form["eliteCharged"]
            best = best_cycle(form["stats"]["baseAttack"], e["types"], fast, charged, gm_moves)
            if best:
                e["dps"] = round(best["dps"], 1)
                e["moves"] = moveset_label(best["fast"], best["charged"])
                if best["fast"] in form["eliteFast"] or best["charged"] in form["eliteCharged"]:
                    e["legacy"] = True
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

    # A miscounted raid class is silent on the page — every Mega would just read four-star.
    # These bounds are here to make that fail loudly instead.
    classes = Counter(e["raid"] for e in entries)
    print(f"  raid classes: {dict(classes)}")
    print("    " + ", ".join(e["name"] for e in entries if e["stars"] != 4))
    if not classes["Legendary Mega Raid"]:
        raise RuntimeError(
            "no Mega classified as Legendary — the Bulbapedia category lookup is failing, "
            "which would flatten every Mega to four-star"
        )
    if classes["Legendary Mega Raid"] > 12:
        raise RuntimeError(
            f"{classes['Legendary Mega Raid']} Legendary Megas is implausible — "
            "category_members is returning something other than species"
        )
    if classes["Primal Raid"] != 2:
        raise RuntimeError(
            f"expected exactly 2 Primals (Kyogre, Groudon), got {classes['Primal Raid']}. "
            "A new Primal shipped — re-read Raid Battle (GO) and confirm its star rating "
            "before trusting the five-star classification"
        )

    # A Mega whose typing the Game Master and Bulbapedia disagree on puts it in the wrong
    # comparison pool, which quietly moves everyone else's placing too.
    disagree = [e["name"] for e in entries
                if e.get("dps") and set(e["types"]) != set(e["boosts"])
                and e["name"] not in WEATHER_BOOSTED]
    if disagree:
        print(f"  typing differs from Bulbapedia's boosted-types column: {disagree}")
    if len(disagree) > 3:
        raise RuntimeError(
            f"{len(disagree)} Megas have a typing the boosted-types column does not match — "
            "either the column stopped meaning typing or gm_key is mapping to wrong forms"
        )

    rank_megas(entries)
    ranks = Counter(e["rank"] for e in entries)
    print(f"  ranks: {dict(sorted(ranks.items()))}")
    print(f"    S: {', '.join(e['name'] for e in entries if e['rank'] == 'S')}")
    unrated = [e["name"] for e in entries if e["rank"] == "?"]
    print(f"    no Game Master entry yet ({len(unrated)}): {unrated}")
    print(f"    ranking on a legacy move: {sum(1 for e in entries if e.get('legacy'))}")

    # Every Mega unrated means the Game Master lookup broke, not that the game shipped
    # sixty Megas this week. Trap 1 in gamemaster.py is about the handful, not the whole.
    if len(unrated) > 8:
        raise RuntimeError(
            f"{len(unrated)} of {len(entries)} Megas have no Game Master entry — gm_key is "
            "probably no longer matching, which would blank the rank on every card"
        )
    if not ranks["S"]:
        raise RuntimeError("no Mega ranked S — every type would have to be led by nothing")

    write_js(OUT, header(gm_sha, gm_date), {"MEGAS": entries})


def header(gm_sha, gm_date):
    return HEADER.replace("{GM}", f"{gm_sha} ({gm_date})")


HEADER = """/**
 * All released Mega Evolutions and Primal Reversions in Pokemon GO.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_megas.py
 * Source: https://bulbapedia.bulbagarden.net/wiki/Mega_Evolution_(GO)
 *         PokeMiners game_master {GM} — stats, moves and the Mega boost multipliers
 * Unreleased (HTML-commented) rows are excluded.
 *
 * energy  first-time activation cost; later activations cost far less
 * raid    battle class for this species: Mega Raid (4 stars), Legendary Mega Raid (6) or
 *         Primal Raid (5). Derived from the rule stated on
 *         https://bulbapedia.bulbagarden.net/wiki/Raid_Battle_(GO) plus Bulbapedia's
 *         Legendary and Mythical categories. It is NOT a claim that the Pokemon is in the
 *         raid rotation right now — that rotates and is deliberately not stored.
 *         Super Mega Raid is an event-driven variant, so it is not derived per species.
 * boosts  party-wide type bonus; weather-based (not own typing) when weatherBoost is set
 * attack  extra Charged Attack unlocked at Super Max Mega Level
 * rank    is this worth Mega Energy? S/A/B/C/D, or "?" when the Game Master has no entry
 *         for it yet. Computed — see scripts/rank.py for the bands and the damage model.
 *         The comparison pool is other MEGAS, so "Best Ice Mega" does not mean best Ice
 *         attacker in the game; Mamoswine beats Mega Glalie without Mega Evolving.
 * why     one line saying where it places and what beats it
 * dps     sustained cycle DPS at level 40, 15/15/15, vs a neutral 200-defense target
 * moves   the moveset that DPS assumes; legacy marks one needing an Elite TM or a
 *         Community Day move, so the rank is unreachable without it
 * isNew   GO-original Mega with no mainline artwork; artFallback is base-species art
 */
"""

if __name__ == "__main__":
    main()
