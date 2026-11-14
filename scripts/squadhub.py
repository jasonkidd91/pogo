#!/usr/bin/env python3
"""Fetch and parse db.pokemongohub.net's PvE ranking pages.

Separated from update_squad.py for the same reason scripts/bulbapedia.py is separate from
the generators that use it: the traps live with the parser, not with the caller.

WHY RAW HTML AND A REAL PARSER. CLAUDE.md's rule — never trust an LLM-summarised fetch of a
large table — applies here exactly as it does to Bulbapedia. Every number on the Squad page
comes from `<td data-column-id="...">` cells parsed below, never from reading the rendered
page. PogoHub's tables are server-rendered Next.js output, so `curl` is enough; there is no
JSON API behind them and no `__NEXT_DATA__` blob to prefer.

THREE TRAPS, all of which fail silently:

1. **The tier cell is rowSpan-grouped.** One `<td data-column-id="tier">` carries
   `rowSpan="4"` and the next three rows have no tier cell at all. Reading each row in
   isolation leaves three quarters of the table with no tier; `rows()` carries the last
   tier forward, which is what the rowspan means.

2. **A listing page holds 18 tables, one per type, and the type is only in the heading.**
   The tables are identical in markup, so pairing each with the nearest preceding heading is
   the only thing that says which type it is. `tables_with_heads()` does that pairing, and
   `by_type()` refuses a page whose headings do not resolve to 18 distinct known types —
   a layout change that silently reshuffled the types would otherwise mislabel every pick.

3. **PogoHub ranks forms the game has not released.** Mega Clefable is ranked 8th for Normal
   and is not in Pokemon GO. Nothing here filters that out: the ROSTER decision stays with
   the site's own generated files (web/mega-data.js, web/max-data.js), per CLAUDE.md. This
   module only reports what PogoHub says.
"""

import html
import re
import subprocess

BASE = "https://db.pokemongohub.net"
UA = "Mozilla/5.0 (pogo-site data updater)"

PAGES = {
    "attackers-per-type": f"{BASE}/best/attackers-per-type",
    "dynamax-attackers-per-type": f"{BASE}/best/dynamax-attackers-per-type",
    "dynamax-tanks-per-type": f"{BASE}/best/dynamax-tanks-per-type",
    "mega-pokemon": f"{BASE}/best/mega-pokemon",
    "overall-attackers": f"{BASE}/best/overall-attackers",
}

TYPES = ["Normal", "Fighting", "Flying", "Poison", "Ground", "Rock", "Bug", "Ghost",
         "Steel", "Fire", "Water", "Grass", "Electric", "Psychic", "Ice", "Dragon",
         "Dark", "Fairy"]

# PogoHub's own ladder, best first. Used only to compare two of its own rows; this is not
# and must not be confused with the site's own S/A/B/C/D rank (scripts/rank.py).
TIERS = ["SS", "S", "A", "B", "C", "D", "E", "F"]
TIER_VALUE = {t: len(TIERS) - i for i, t in enumerate(TIERS)}

_TABLE = re.compile(r"<table\b.*?</table>", re.S)
_ROW = re.compile(r"<tr>(.*?)</tr>", re.S)
_CELL = re.compile(r'<td data-column-id="([^"]+)"[^>]*>(.*?)</td>', re.S)
_HEAD = re.compile(r"<h[23][^>]*>(.*?)</h[23]>", re.S)


class Unreadable(RuntimeError):
    """A page could not be fetched or did not parse — never let this read as 'no data'."""


def text(frag):
    return html.unescape(re.sub(r"<[^>]+>", "", frag)).strip()


def fetch(name, cache_dir=None):
    """Raw HTML for a PAGES key. With cache_dir, read <name>.html from disk instead.

    The offline path is the same accommodation scripts/check_official_news.py makes with
    its --news flag: db.pokemongohub.net is blocked from some containers, and a generator
    that cannot be exercised there is a generator that rots.
    """
    if cache_dir:
        import os
        path = os.path.join(cache_dir, name + ".html")
        if not os.path.exists(path):
            raise Unreadable(f"{path} not found")
        return open(path, encoding="utf-8", errors="replace").read()

    proc = subprocess.run(["curl", "-sL", "--max-time", "90", "-A", UA, PAGES[name]],
                          capture_output=True)
    body = proc.stdout.decode("utf-8", "replace")
    if proc.returncode != 0 or "<table" not in body:
        raise Unreadable(f"{PAGES[name]} returned no table (curl exit {proc.returncode})")
    return body


def tables_with_heads(page):
    """[(heading_text, table_html)] — each table paired with the heading just above it."""
    out = []
    for m in _TABLE.finditer(page):
        heads = _HEAD.findall(page[: m.start()])
        out.append((text(heads[-1]) if heads else "", m.group(0)))
    return out


def rows(table):
    """Parse one table into dicts. Carries the rowSpan-grouped tier forward (trap 1)."""
    out, tier = [], None
    for rm in _ROW.finditer(table):
        cells, raw = {}, {}
        for cm in _CELL.finditer(rm.group(1)):
            cells[cm.group(1)] = text(cm.group(2))
            raw[cm.group(1)] = cm.group(2)
        if not cells:
            continue
        if "tier" in raw:
            found = re.search(r'data-tier="([^"]+)"', raw["tier"])
            if found:
                tier = found.group(1)
        namecell = raw.get("attacker_name") or raw.get("pokemon_name") or ""
        href = re.search(r'href="/pokemon/([^"]+)"', namecell)
        chip = re.search(r'data-pokemon-chip-name="true">(.*?)</span>', namecell, re.S)
        if not href:
            continue
        order = cells.get("order") or cells.get("ranking") or ""
        out.append({
            "tier": tier,
            "order": int(re.sub(r"\D", "", order) or 0),
            "name": text(chip.group(1)) if chip else text(namecell),
            "hub": href.group(1),
            "fast": cells.get("qm_name"),
            "charged": cells.get("cm_name"),
            "dps": cells.get("dps"),
            "tdo": cells.get("tdo"),
            "score": cells.get("score"),
            "maxDamage": cells.get("dynamax_maxMoveDamage"),
            "incomingHP": cells.get("incomingHPPercent"),
        })
    return out


def by_type(page, pattern):
    """{type: [row]} for an 18-table per-type page.

    `pattern` is a regex with one group that pulls the type name out of the heading, e.g.
    r"Top \\d+ (\\w+)-type Attackers". Raises unless all 18 types resolve (trap 2).
    """
    found = {}
    for head, table in tables_with_heads(page):
        m = re.search(pattern, head)
        if not m:
            continue
        name = m.group(1)
        if name not in TYPES:
            continue
        if name in found:
            raise Unreadable(f"two tables claim the {name} heading — layout changed")
        found[name] = rows(table)
    missing = [t for t in TYPES if t not in found]
    if missing:
        raise Unreadable(f"no table found for {missing} — heading layout changed")
    return found


def single(page):
    """The one ranked table on a whole-list page (mega-pokemon, overall-attackers)."""
    best = max(tables_with_heads(page), key=lambda ht: len(rows(ht[1])), default=None)
    got = rows(best[1]) if best else []
    if not got:
        raise Unreadable("no ranked rows on the page — layout changed")
    return got
