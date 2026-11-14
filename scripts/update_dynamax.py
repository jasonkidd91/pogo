#!/usr/bin/env python3
"""Regenerate web/max-data.js from Bulbapedia. Usage: python3 scripts/update_dynamax.py"""

import argparse, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from bulbapedia import (fetch_wikitext, section, rows, cells, find_date,
                        slug, check_sprites, write_js,
                        Blocked, fallback_allowed, previous_rows, ROSTER_DATE)
import gamemaster
import squadhub
from rank import apply_ranks, apply_roles, power_of, power_scale

OUT = os.path.join(os.path.dirname(__file__), "..", "web", "max-data.js")

# Bulbapedia form ids -> pokemondb sprite slug + a human label.
FORMS = {
    "0849A": ("toxtricity-amped", "Amped Form"),
    "0849L": ("toxtricity-low-key", "Low Key Form"),
    "0892":  ("urshifu-single-strike", "Single Strike Style"),
    "0892R": ("urshifu-rapid-strike", "Rapid Strike Style"),
}


def from_bulbapedia():
    """(gigantamax rows, dynamax rows) from the live Bulbapedia pages."""
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

    return gmax, dyn


# The Bulbapedia-derived fields of each entry. Everything else (types, fam, rank, dps,
# moves, legacy, role) comes from the Game Master and is recomputed on every run.
GMAX_FIELDS = ("name", "art", "gmaxMove", "raid", "stars", "released")
DYN_FIELDS = ("name", "art", "released", "form", "hasGmax")


def from_previous():
    """The same two lists, carried over from the last build of web/max-data.js, plus
    GAP_FILL (below) while Bulbapedia stays blocked."""
    pick = lambda e, keys: {k: e[k] for k in keys if k in e}
    gmax = [pick(e, GMAX_FIELDS) for e in previous_rows(OUT, "GIGANTAMAX")]
    dyn = [pick(e, DYN_FIELDS) for e in previous_rows(OUT, "DYNAMAX")]
    print(f"carried over {len(dyn)} Dynamax + {len(gmax)} Gigantamax from {os.path.relpath(OUT)}")

    added = []
    for e in GAP_FILL_GMAX:
        if e["name"] not in {g["name"] for g in gmax}:
            gmax.append(dict(e)); added.append(e["name"] + " (Gigantamax)")
        match = next((d for d in dyn if d["name"] == e["name"]), None)
        if match:
            match["hasGmax"] = True
    for e in GAP_FILL_DYN:
        if e["name"] not in {d["name"] for d in dyn}:
            dyn.append(dict(e)); added.append(e["name"])
    if added:
        print(f"  gap-fill while Bulbapedia is blocked (verified below): {added}")
    return gmax, dyn


# --------------------------------------------------------------------------------------
# GAP FILL — while Bulbapedia is blocked (see BULBAPEDIA_FALLBACK in bulbapedia.py), the
# carried-over roster above is frozen and scripts/check_serebii.py's weekly diff against
# Serebii is report-only. These ten names were flagged there as present on Serebii but
# missing on the site; each is verified here against independent sources before being
# added, per the "one source cannot settle a roster" rule (CLAUDE.md). Delete an entry
# once a live Bulbapedia run (Bulbapedia unblocked) carries it naturally — this list
# exists only to cover the gap, not to replace Bulbapedia going forward.
#
# Checked 2026-11-14, all via WebSearch/WebFetch (Bulbapedia itself still 403s):
#   - Dialga, Palkia: official GO Wild Area 2026: Global event (leekduck.com/events/
#     pokemon-go-wild-area-2026-global/, pokemongo.com news) — Dynamax Dialga in six-star
#     Max Battles Sat Nov 14 2026, Dynamax Palkia Sun Nov 15 2026.
#   - Uxie, Mesprit, Azelf: Dynamax Lake Trio Max Battle Day, Sat Oct 24 2026
#     (leekduck.com/events/dynamax-uxie-mesprit-azelf-max-battle-day-2026/, matched by
#     pokemongohub.net, nintendowire.com, pocketmonsters.net independently).
#   - Regidrago: official Into the Wild 2026 announcement (pokemongo.com/en/news/
#     into-the-wild-2026, read directly) — Dynamax debut in five-star Max Battles,
#     Thu Nov 12 2026.
#   - Meltan: same official Into the Wild 2026 announcement, read directly — Dynamax
#     debut via GO Pass: Into the Wild, released Nov 9 2026.
#   - Sizzlipede, Centiskorch: Max Monday, Mon Oct 5 2026 (leekduck.com/events/
#     max-mondays-2026-10-05/, matched by a PokemonGOHub tweet and world-today-news.com).
#   - Duraludon (Gigantamax; the plain Dynamax entry already matched Serebii): debuted
#     in person at GO Wild Area 2026: Sendai • Tohoku, Nov 6 2026 (nisu.io, pogoskill.com
#     independently), G-Max move G-Max Depletion (db.pokemongohub.net/pokemon/884-
#     Gigantamax, bulbapedia's G-Max Depletion article via search cache).
#
# Explicitly NOT added, for the opposite reason — still unresolved or contradicted:
#   - Mawile: Serebii's Dynamax-capable list includes it, but db.pokemongohub.net's
#     dedicated Dynamax roster does not, and a direct search says plainly "Mawile cannot
#     Dynamax... it can be encountered in Dynamax raids" (i.e. a non-Dynamax bonus
#     encounter at a Max Battle, not a Dynamax form of its own). Two sources disagree;
#     left out.
#   - Melmetal (plain Dynamax and Gigantamax): one search result claimed a Nov 9 2026
#     GO Pass debut alongside Meltan, but reading the actual Into the Wild 2026
#     announcement directly shows no mention of Melmetal at all, and the Gigantamax-side
#     sources only gave the 2020 HOME-compatibility date, which is the mainline-game
#     date, not Pokemon GO's. Left out until a primary source actually names a GO date.
#
# All ten added names have a normal Game Master entry (stats + breadTierGroup), so they
# rank normally rather than showing "?" — the Game Master carries every species' base
# stats regardless of Dynamax eligibility; it has no "can Dynamax" flag of its own, which
# is exactly why this roster question needs an outside source at all.
GAP_FILL_DYN = [
    {"name": "Dialga",      "art": "dialga",      "released": "Nov 14, 2026"},
    {"name": "Palkia",      "art": "palkia",      "released": "Nov 15, 2026"},
    {"name": "Uxie",        "art": "uxie",        "released": "Oct 24, 2026"},
    {"name": "Mesprit",     "art": "mesprit",     "released": "Oct 24, 2026"},
    {"name": "Azelf",       "art": "azelf",       "released": "Oct 24, 2026"},
    {"name": "Regidrago",   "art": "regidrago",   "released": "Nov 12, 2026"},
    {"name": "Meltan",      "art": "meltan",      "released": "Nov 9, 2026"},
    {"name": "Sizzlipede",  "art": "sizzlipede",  "released": "Oct 5, 2026"},
    {"name": "Centiskorch", "art": "centiskorch", "released": "Oct 5, 2026"},
]
GAP_FILL_GMAX = [
    {"name": "Duraludon", "art": "duraludon-gigantamax", "gmaxMove": "G-Max Depletion",
     "raid": "Gigantamax Battle", "stars": 6, "released": "Nov 6, 2026"},
]


# --------------------------------------------------------------------------------------
# COUNTERS LINK — each card's "Counters" button out to Pokemon GO Hub's own best-counters
# page for that form, e.g. https://db.pokemongohub.net/pokemon/380-Dynamax/counters-max-battles.
#
# The slug is NEVER invented here. Hub's URL scheme encodes a Pokedex number plus a form
# suffix that does not follow a fixed formula for every alternate forme (compare
# "892-Dynamax_Single_Strike" with "849-Dynamax_Amped"), and guessing it for a form this
# generator has not actually seen Hub name is exactly the unverifiable-table failure mode
# CLAUDE.md exists to prevent — a wrong guess is a silent 404, not a visible error.
#
# Instead this reads Hub's own "Top N Max Battle attackers" tables (the same page
# scripts/squadhub.py already parses for the Squad page, via by_type() — which returns
# every row of all 18 per-type tables, not just the few squad.html keeps) and only ever
# copies a slug Hub printed next to that exact name.
#
# COVERAGE IS PARTIAL AND THAT IS FINE. Hub's tables are a "Top N" per type, so a card for a
# Pokemon that doesn't place in any type's attacker table gets no `hub` field and dynamax.js
# simply renders no Counters link for it, rather than a guessed one.
def hub_formkey(e):
    """DYNAMAX entry -> the name Hub prints, e.g. 'Toxtricity (Amped Form)'. Mirrors
    scripts/update_squad.py's formkey() so the two stay in sync with Hub's own naming."""
    return e["name"] + (f" ({e['form']})" if e.get("form") else "")


def _carry_hub_links(gmax, dyn):
    """Previous build's `hub` fields, by name/form key — used when PogoHub can't be reached
    this run. Same acceptance as BULBAPEDIA_FALLBACK's roster carryover: a link can go a run
    or two stale (e.g. Hub renames a slug) rather than every card losing its Counters button
    the moment Hub is briefly unreachable. A run that CAN reach Hub always overwrites these."""
    try:
        prev_gmax = {e["name"]: e.get("hub") for e in previous_rows(OUT, "GIGANTAMAX")}
        prev_dyn = {hub_formkey(e): e.get("hub") for e in previous_rows(OUT, "DYNAMAX")}
    except (OSError, RuntimeError) as err:
        print(f"  no previous build to carry Counters links from: {err}")
        return
    carried = 0
    for e in gmax:
        h = prev_gmax.get(e["name"])
        if h:
            e["hub"] = h
            carried += 1
    for e in dyn:
        h = prev_dyn.get(hub_formkey(e))
        if h:
            e["hub"] = h
            carried += 1
    print(f"  Counters links: carried {carried}/{len(gmax) + len(dyn)} over from the previous build")


def add_hub_links(gmax, dyn, cache_dir=None):
    try:
        page = squadhub.fetch("dynamax-attackers-per-type", cache_dir)
        by_type = squadhub.by_type(
            page, r"Top \d+ (\w+)-type Max Battle attackers")
    except squadhub.Unreadable as err:
        # Non-fatal: the roster itself does not depend on Hub, only this one button does.
        print(f"WARNING: PogoHub unreadable ({err}); carrying previous Counters links over")
        _carry_hub_links(gmax, dyn)
        return

    # Every type's table carries the same Pokemon under the same slug; collapse to one
    # {name: hub} map and raise if any two types disagree, which would mean Hub's own
    # pages are inconsistent or this is pairing two different Pokemon by name collision.
    seen, conflicts = {}, []
    for rws in by_type.values():
        for r in rws:
            prev = seen.get(r["name"])
            if prev is not None and prev != r["hub"]:
                conflicts.append((r["name"], prev, r["hub"]))
            seen[r["name"]] = r["hub"]
    if conflicts:
        raise RuntimeError(f"PogoHub gave different slugs for the same name across its "
                            f"per-type tables — investigate before trusting any: {conflicts}")

    gmax_by_name = {e["name"]: e for e in gmax}
    dyn_by_key = {hub_formkey(e): e for e in dyn}
    matched = 0
    for name, hub_id in seen.items():
        if name.startswith("Gigantamax "):
            entry = gmax_by_name.get(name[len("Gigantamax "):])
        elif name.startswith("Dynamax "):
            entry = dyn_by_key.get(name[len("Dynamax "):])
        else:
            continue                       # a plain (non-Max) attacker row; not ours
        if entry is not None:
            entry["hub"] = hub_id
            matched += 1

    total = len(gmax) + len(dyn)
    print(f"  Counters links: {matched}/{total} matched a PogoHub Max Battle attacker row")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hub-from", dest="hub_cache",
                     help="directory of saved PogoHub HTML (see squadhub.py), instead of "
                          "fetching db.pokemongohub.net live")
    args = ap.parse_args()

    try:
        gmax, dyn = from_bulbapedia()
        ROSTER_DATE[OUT] = "live"
    except Blocked as err:
        if not fallback_allowed():
            raise
        print(f"WARNING: {err}")
        print("WARNING: Bulbapedia blocked; carrying the roster over (BULBAPEDIA_FALLBACK=1)")
        gmax, dyn = from_previous()
        ROSTER_DATE[OUT] = "carried"

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

    add_hub_links(gmax, dyn, args.hub_cache)

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
    fams = gamemaster.families(gm)

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
        # See update_megas.py: the evolution family, for family search. Only when there is
        # more than the species itself in it.
        fam = fams.get(gm_id(e["name"])) or []
        if len(fam) > 1:
            e["fam"] = [gamemaster.name_slug(x) for x in fam]
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
 *          Game Master {GM} — base stats, typing and move tables
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
 * fam    every species in this Pokemon's evolution family, lowercase, for the page's
 *        "search the whole family" toggle. Absent when the species is its own whole family.
 * hub    Pokemon GO Hub's own page slug (https://db.pokemongohub.net/pokemon/<hub>), present
 *        only where Hub's "Top N Max Battle attackers" tables actually rank this form — never
 *        invented for a form Hub hasn't named. Absent means no Counters button on the card,
 *        not a broken link. See add_hub_links() in scripts/update_dynamax.py.
 */
"""

if __name__ == "__main__":
    main()
