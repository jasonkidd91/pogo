#!/usr/bin/env python3
"""Regenerate web/squad-data.js — the PvE "what do I power up first" squad, by type.

Usage:
    python3 scripts/update_squad.py                 # fetch PogoHub live
    python3 scripts/update_squad.py --from <dir>    # parse saved HTML in <dir>
    python3 scripts/update_squad.py --no-sprite-check   # skip sprite verification

--from takes a directory of raw page HTML named after the PAGES keys in squadhub.py. It is
the same accommodation scripts/check_official_news.py makes with --news: db.pokemongohub.net
is blocked from some containers, and a generator that can never be exercised there rots.


## THE DELIBERATE EXCEPTION TO CLAUDE.md

CLAUDE.md's standing rule is that "how good is this Pokemon" is computed from the Game
Master (scripts/rank.py), never taken from a scraped tier list, because a tier list is
somebody's read of a rotating meta and goes stale silently.

**This generator breaks that rule on purpose, at the owner's explicit request.** Every
ordering here — across Gigantamax, Dynamax, Mega AND plain attackers — is PogoHub's, not
rank.py's. The site's own S/A/B/C/D rank is deliberately NOT shown on this page, because two
different ladders side by side on one card is worse than either alone.

What did NOT move to PogoHub is the ROSTER. Which Pokemon actually have a Gigantamax,
Dynamax or Mega form at all still comes from web/max-data.js and web/mega-data.js, which are
generated from Bulbapedia plus the Game Master. That matters concretely: PogoHub ranks
**Mega Clefable** 8th among Normal attackers and Mega Clefable is not released in Pokemon GO
(CLAUDE.md notes Serebii marks it "Not currently available"). Gating on the site's own
roster drops it. Do not "simplify" that gate away.

If you are tempted to put rank.py back in charge of this page, ask the owner first — it was
a conscious call, not an oversight.


## HOW A TYPE'S SIX PICKS ARE CHOSEN

The owner asked for up to 6 per type, ordered Gigantamax > Dynamax > Mega > plain, with a
Gmax/Dmax pick crowding out a redundant pick of the same evolution line.

Taking that as a strict fill-by-priority empties the page of everything else: measured on
the 2026-11-14 pull, Gmax+Dmax alone covers 6+ candidates in 17 of the 18 types, so no Mega
and no plain attacker would appear anywhere on a page whose stated job is "get stronger at
raiding". It would also make the owner's own crowding-out rule dead letter — a Mega could
never reach a slot to be crowded out of it.

So the priority decides ORDER, and a reserved slot keeps the page honest about both game
modes (Max Battles are Gmax/Dmax; raids and gyms are Mega/plain):

  1. Reserve one slot for the best candidate in each tier that has one.
  2. Fill the remaining slots in strict tier-priority order.
  3. Display Gmax, then Dmax, then Mega, then plain; within a tier, by PogoHub's own rank.

CROWDING OUT is by evolution line, not by name. The line comes from the `fam` field the
other two generators compute from the Game Master's evolution graph; where a species has no
`fam` entry the Pokedex number in PogoHub's own URL is the fallback. A line appears at most
once per type and the highest-priority tier wins, which is the owner's rationale exactly: a
Gigantamax Machamp already covers Machamp, so Dynamax Machamp and Mega Lucario's line-mates
do not need a second slot.


## WEIGHING BULK FOR THE MAX TIERS

Max Battles cap at 4 players, so a Dynamax/Gigantamax Pokemon that soaks hits is worth as
much as a glass cannon. A Max pick is therefore ordered by PogoHub's attacker tier for that
type PLUS its best showing on PogoHub's Max-tank list, equally weighted.

The candidate pool is still the type's attacker table, so a pure wall that cannot deal the
type's damage never enters — the slot exists to deal that type's damage, and bulk breaks
ties and promotes within that pool rather than replacing it.

The tank list is indexed by INCOMING attack type ("tanks against Fire-type attacks"), which
is a different axis from "attacks as Fire". Its 18 tables are therefore read as one bulk
credential per Pokemon — its single best (tier, placing) anywhere on that page, with the
type it was best against carried along so the card can name it. Averaging the 18 instead
would punish a specialist wall for being narrow, which is backwards for a raid squad.

KNOWN EDGE: PogoHub publishes only the top 10 tanks per type, so a Pokemon absent from all
18 tables scores zero bulk. That means "outside the top 10 against every type", not "no
bulk at all", and it is a cliff rather than a slope — Dynamax Darmanitan is an S-tier
attacker with no tank placing and sorts below a B-tier attacker that walls well. Both
numbers are printed on the card so the reader can see which trade they are being offered.
"""

import argparse
import datetime
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import squadhub as hub
from bulbapedia import check_sprites

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "web", "squad-data.js")

SLOTS = 6
TIER_ORDER = ["gmax", "dmax", "mega", "plain"]
TIER_LABEL = {"gmax": "Gigantamax", "dmax": "Dynamax", "mega": "Mega", "plain": "Attacker"}

HEADINGS = {
    "attackers-per-type": r"Top \d+ (\w+)-type Attackers",
    "dynamax-attackers-per-type": r"Top \d+ (\w+)-type Max Battle attackers",
    "dynamax-tanks-per-type": r"tanks against (\w+)-type Attacks",
}

# pokemondb form slugs. Only forms PogoHub actually ranks need an entry; anything missed
# falls back to the base species and is caught by the sprite check either way.
FORM_SLUG = {
    "black": "black", "white": "white", "resolute": "resolute", "therian": "therian",
    "incarnate": "incarnate", "sky": "sky", "origin": "origin", "altered": "altered",
    "dawn wings": "dawn-wings", "dusk mane": "dusk-mane", "ultra": "ultra",
    "crowned sword": "crowned", "crowned shield": "crowned", "hero": "hero",
    "single strike style": "single-strike", "rapid strike style": "rapid-strike",
    "amped form": "amped", "low key form": "low-key",
}


def slug(s):
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


# ---------- reading the site's own generated roster ----------

def site_rows(path, const):
    src = open(os.path.join(ROOT, path)).read()
    body = re.search(rf"const {const} = \[\n(.*?)\n\];", src, re.S)
    if not body:
        raise RuntimeError(f"{path}: no `const {const} = [` block — file shape changed")
    return [json.loads(l.strip().rstrip(",")) for l in body.group(1).splitlines() if l.strip()]


def roster():
    """The released Gmax / Dmax / Mega forms, keyed the way PogoHub names them."""
    megas = site_rows("web/mega-data.js", "MEGAS")
    gmax = site_rows("web/max-data.js", "GIGANTAMAX")
    dmax = site_rows("web/max-data.js", "DYNAMAX")

    def formkey(e):
        return e["name"] + (f" ({e['form']})" if e.get("form") else "")

    # fam is the Game Master's evolution graph, which is what makes crowding-out line-wide
    # rather than name-wide. Entries with no fam are their own whole family.
    families = {}
    for e in megas + gmax + dmax:
        for member in e.get("fam") or []:
            families[member] = tuple(sorted(e["fam"]))
    return ({e["name"]: e for e in gmax},
            {formkey(e): e for e in dmax},
            {e["name"]: e for e in megas},
            families)


# ---------- candidates ----------

def bulk_credential(tank_tables):
    """{pokemon hub-id: (tier_value, tier, placing, vs_type)} — its single best wall showing."""
    best = {}
    for vs_type, rws in tank_tables.items():
        for r in rws:
            if not r["tier"]:
                continue
            cand = (hub.TIER_VALUE.get(r["tier"], 0), -r["order"], r["tier"], r["order"], vs_type)
            cur = best.get(r["hub"])
            if cur is None or cand > cur:
                best[r["hub"]] = cand
    return {k: (v[0], v[2], v[3], v[4]) for k, v in best.items()}


def dex(hub_id):
    """'143-Gigantamax' -> 143. PogoHub's own URL carries the Pokedex number."""
    m = re.match(r"(\d+)", hub_id)
    if not m:
        raise RuntimeError(f"PogoHub id {hub_id!r} has no leading Pokedex number")
    return int(m.group(1))


def species_of(name):
    """Display name -> the plain species, for the family lookup."""
    s = re.sub(r"^(Gigantamax|Dynamax|Shadow)\s+", "", name)
    s = re.sub(r"\s*\(.*?\)\s*$", "", s)
    for form in ("Crowned Sword", "Crowned Shield", "Dawn Wings", "Dusk Mane",
                 "Black", "White", "Therian", "Incarnate", "Sky", "Origin", "Altered"):
        s = re.sub(rf"^{form}\s+", "", s)
    return s.strip()


def line_key(name, hub_id, families):
    sp = species_of(name).lower()
    return families.get(sp) or ("dex", dex(hub_id))


def art_for(tier, name, entry):
    """(art, artFallback). Max/Mega picks reuse the slug their own generator verified."""
    if entry is not None:
        return entry["art"], entry.get("artFallback")
    sp = species_of(name)
    base = slug(sp)
    paren = re.search(r"\((.*?)\)", name)
    tail = None
    if paren:
        tail = FORM_SLUG.get(re.sub(r"\s*(Forme|Form|Style)$", "", paren.group(1)).strip().lower()) \
               or FORM_SLUG.get(paren.group(1).strip().lower())
    else:
        lead = re.sub(r"^Shadow\s+", "", name)[: -len(sp)].strip().lower()
        if lead:
            tail = FORM_SLUG.get(lead)
    return (f"{base}-{tail}" if tail else base), (base if tail else None)


def build(atk, dmax_atk, tanks, rosters):
    gmax_r, dmax_r, mega_r, families = rosters
    bulk = bulk_credential(tanks)
    squad, unmatched = [], set()

    for ptype in hub.TYPES:
        cands = []

        for r in dmax_atk[ptype]:
            if r["name"].startswith("Gigantamax "):
                tier, entry = "gmax", gmax_r.get(r["name"][len("Gigantamax "):])
            elif r["name"].startswith("Dynamax "):
                tier, entry = "dmax", dmax_r.get(r["name"][len("Dynamax "):])
            else:
                continue                       # not a Max form the site tracks
            if entry is None:
                unmatched.add(r["name"])
                continue                       # not in the released roster — see docstring
            b = bulk.get(r["hub"])
            cands.append({
                "row": r, "tier": tier, "entry": entry,
                "sort": (hub.TIER_VALUE.get(r["tier"], 0) + (b[0] if b else 0), -r["order"]),
                "bulk": b,
            })

        for r in atk[ptype]:
            is_mega = r["name"].startswith(("Mega ", "Primal "))
            entry = mega_r.get(r["name"]) if is_mega else None
            if is_mega and entry is None:
                unmatched.add(r["name"])
                continue                       # unreleased Mega (e.g. Mega Clefable)
            cands.append({
                "row": r, "tier": "mega" if is_mega else "plain", "entry": entry,
                "sort": (hub.TIER_VALUE.get(r["tier"], 0), -r["order"]), "bulk": None,
            })

        # Crowding out: one evolution line per type, highest-priority tier wins.
        seen, kept = {}, []
        for c in sorted(cands, key=lambda c: (TIER_ORDER.index(c["tier"]), -c["sort"][0], -c["sort"][1])):
            k = line_key(c["row"]["name"], c["row"]["hub"], families)
            if k in seen:
                continue
            seen[k] = True
            kept.append(c)

        # One reserved slot per tier that has a candidate, then fill by tier priority.
        picks, used = [], set()
        for tier in TIER_ORDER:
            pool = [c for c in kept if c["tier"] == tier]
            if pool and len(picks) < SLOTS:
                picks.append(pool[0])
                used.add(id(pool[0]))
        for c in kept:
            if len(picks) >= SLOTS:
                break
            if id(c) not in used:
                picks.append(c)
                used.add(id(c))

        # Display order IS the recommendation order, so it uses the same blended key the
        # selection did. Sorting by raw attack placing here instead would hide the bulk
        # weighting the owner asked for: a wall promoted into the list for soaking hits
        # would appear below a frailer Pokemon it was deliberately ranked above.
        picks.sort(key=lambda c: (TIER_ORDER.index(c["tier"]), -c["sort"][0], -c["sort"][1]))
        squad.append({"type": ptype, "picks": picks})

    return squad, sorted(unmatched)


def to_entry(c):
    r, tier, entry = c["row"], c["tier"], c["entry"]
    art, fallback = art_for(tier, r["name"], entry)
    out = {
        "name": r["name"],
        "tier": tier,
        "art": art,
        "hub": r["hub"],
        "phTier": r["tier"],
        "place": r["order"],
        "moves": " + ".join(x for x in (r["fast"], r["charged"]) if x),
    }
    if fallback:
        out["artFallback"] = fallback
    if tier in ("gmax", "dmax"):
        if r["maxDamage"]:
            out["maxDamage"] = int(r["maxDamage"])
        if c["bulk"]:
            _, btier, bplace, bvs = c["bulk"]
            out["bulkTier"] = btier
            out["bulkPlace"] = bplace
            out["bulkVs"] = bvs
    else:
        if r["dps"]:
            out["dps"] = float(r["dps"])
        if r["tdo"]:
            out["tdo"] = float(r["tdo"].replace(",", ""))
    return out


HEADER = """/**
 * The Squad — which Pokemon to power up first for each of the 18 types, PvE only.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_squad.py
 * Sources (fetched {DATE}):
 *   https://db.pokemongohub.net/best/attackers-per-type
 *   https://db.pokemongohub.net/best/dynamax-attackers-per-type
 *   https://db.pokemongohub.net/best/dynamax-tanks-per-type
 *   https://db.pokemongohub.net/best/mega-pokemon
 *   Roster gate: web/mega-data.js, web/max-data.js (Bulbapedia + Game Master)
 *
 * DELIBERATE EXCEPTION TO CLAUDE.md, at the owner's explicit request: every ORDERING on
 * this page is PogoHub's tier list, for all four tiers, not the site's own computed
 * S/A/B/C/D rank. CLAUDE.md's usual rule is to compute from the Game Master and never trust
 * a scraped tier list; that rule is suspended here and only here. The site's rank is not
 * shown on this page at all. Ask the owner before changing it back.
 *
 * What is still computed, not scraped: WHICH Pokemon have a Gigantamax, Dynamax or Mega
 * form. That gate is why Mega Clefable, which PogoHub ranks 8th for Normal, is absent — it
 * is not released. See scripts/update_squad.py for the full reasoning.
 *
 * tier      gmax | dmax | mega | plain — the display order, and the owner's priority
 * phTier    PogoHub's own letter tier (SS best, then S A B C D E F)
 * place     PogoHub's placing within that type's table
 * hub       the PogoHub page path: https://db.pokemongohub.net/pokemon/<hub>
 * maxDamage Max-move damage, the Max tiers' attack number
 * bulkTier  best showing on PogoHub's Max-tank list, with the incoming type it was best
 *           against — Max Battles cap at 4 players, so soaking hits counts as much as DPS
 * dps/tdo   PogoHub's raid-sim damage per second and total damage output
 *
 * SIX PICKS PER TYPE: one slot reserved for the best of each tier that has a candidate,
 * the rest filled in tier-priority order, one evolution line per type.
 */
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="cache", help="directory of saved page HTML")
    ap.add_argument("--no-sprite-check", action="store_true")
    args = ap.parse_args()

    pages = {}
    for name in ("attackers-per-type", "dynamax-attackers-per-type",
                 "dynamax-tanks-per-type", "mega-pokemon"):
        pages[name] = hub.fetch(name, args.cache)

    atk = hub.by_type(pages["attackers-per-type"], HEADINGS["attackers-per-type"])
    dmax_atk = hub.by_type(pages["dynamax-attackers-per-type"],
                           HEADINGS["dynamax-attackers-per-type"])
    tanks = hub.by_type(pages["dynamax-tanks-per-type"], HEADINGS["dynamax-tanks-per-type"])
    megas = hub.single(pages["mega-pokemon"])
    print(f"parsed PogoHub: {sum(len(v) for v in atk.values())} attacker rows, "
          f"{sum(len(v) for v in dmax_atk.values())} Max attacker rows, "
          f"{sum(len(v) for v in tanks.values())} Max tank rows, {len(megas)} Megas")

    rosters = roster()
    squad, unmatched = build(atk, dmax_atk, tanks, rosters)

    # Tripwire, not a filter. A name PogoHub ranks that the site's roster does not carry is
    # either an unreleased form (correctly dropped) or a gap in the site's roster that a
    # human needs to look at. Same spirit as scripts/check_serebii.py: report, never edit.
    if unmatched:
        print(f"NOTE: {len(unmatched)} ranked form(s) not in the site's released roster, "
              f"so not shown:")
        for n in unmatched:
            print(f"  - {n}")

    thin = [s["type"] for s in squad if len(s["picks"]) < SLOTS]
    if thin:
        print(f"NOTE: fewer than {SLOTS} picks for: {thin}")
    if len(squad) != 18:
        raise RuntimeError(f"built {len(squad)} type sections, expected 18")
    empty = [s["type"] for s in squad if not s["picks"]]
    if empty:
        raise RuntimeError(f"no picks at all for {empty} — matching broke")

    out = [{"type": s["type"], "picks": [to_entry(c) for c in s["picks"]]} for s in squad]

    # Sprite verification before writing anything — a wrong slug is a silently broken image.
    # Max and Mega picks reuse slugs their own generator already verified; the plain tier is
    # the only place this generator invents one, and the fallback is the base species.
    if not args.no_sprite_check:
        want = []
        for s in out:
            for p in s["picks"]:
                want += [p["art"]] + ([p["artFallback"]] if p.get("artFallback") else [])
        exists = check_sprites(want)
        broken = [p["name"] for s in out for p in s["picks"]
                  if not exists.get(p["art"]) and not exists.get(p.get("artFallback"))]
        if broken:
            raise RuntimeError(f"no working sprite for: {broken}")
        # A form slug that 404s is KEPT, with its verified base-species artFallback beside
        # it, so UI.sprite() swaps at runtime exactly as it does on the Mega page. Baking
        # the fallback in here instead would quietly diverge from every other card on the
        # site the day pokemondb adds the missing art.
        fellback = [p["name"] for s in out for p in s["picks"] if not exists.get(p["art"])]
        if fellback:
            print(f"  no mainline art, using artFallback at runtime: {fellback}")

    date = datetime.date.today().isoformat()
    header = HEADER.replace("{DATE}", date)
    body = ",\n".join("  " + json.dumps(s, ensure_ascii=False) for s in out)
    with open(OUT, "w") as fh:
        fh.write(header + "\n"
                 + f"const SQUAD_FETCHED = {json.dumps(date)};\n\n"
                 + f"const SQUAD = [\n{body}\n];\n")
    total = sum(len(s["picks"]) for s in out)
    print(f"wrote {OUT}: 18 types, {total} picks")


if __name__ == "__main__":
    main()
