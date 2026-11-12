#!/usr/bin/env python3
"""Compare the site's Mega / Dynamax / Gigantamax rosters with Serebii's. Report only.

Usage: python3 scripts/check_serebii.py            # markdown report on stdout

Why this exists: Bulbapedia, the roster source for update_megas.py and update_dynamax.py,
is behind a Cloudflare challenge that blocks the weekly runner (first seen 2026-11-12).
While blocked, those generators carry their previous roster over, so a newly released Mega
or Dynamax Pokemon would never appear and nothing would say so. Serebii answers the runner,
so it is the tripwire: every name it lists that the site lacks, or vice versa, goes into
the weekly PR / issue for a human to check.

Why it never edits anything: a roster is a SLOW fact that must be verified against more
than one source (CLAUDE.md, new-event-tracker skill). On the first run Serebii disagreed
with the site in BOTH directions — it lists some Pokemon the site lacks and lacks some the
site lists — and one source cannot settle which side is stale. Serebii also marks an
unreleased Mega with "Not currently available"; those are excluded here, and that marker
is the reason the Game Master alone cannot be the roster (it carries unreleased forms).

Exit status: 0 with a report (differences or none), 2 if Serebii could not be read or
parsed — "unreachable" must never read as "no differences".
"""

import html
import json
import os
import re
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UA = "Mozilla/5.0 (pogo-site data updater)"
MEGA_URL = "https://www.serebii.net/pokemongo/megaevolution.shtml"
MAX_URL = "https://www.serebii.net/pokemongo/maxbattles.shtml"


def lines(url):
    raw = subprocess.run(["curl", "-sL", "--max-time", "60", "-A", UA, url],
                         capture_output=True, check=True).stdout.decode("latin-1")
    raw = re.sub(r"<script.*?</script>|<style.*?</style>", "", raw, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", "\n", raw))
    return [l.strip() for l in text.split("\n") if l.strip()]


def listed(ls, title):
    """Names under a Serebii '#0001 / Name' table, from `title` to the next 'List of'."""
    i = ls.index(title)
    out = []
    for j in range(i + 1, len(ls) - 1):
        if ls[j].startswith("List of"):
            break
        if re.fullmatch(r"#\d{4}", ls[j]):
            out.append((ls[j + 1], ls[j + 2] if j + 2 < len(ls) else ""))
    return out


def site_names(path, const):
    src = open(os.path.join(ROOT, path)).read()
    body = re.search(rf"const {const} = \[\n(.*?)\n\];", src, re.S).group(1)
    return {json.loads(l.strip().rstrip(","))["name"] for l in body.splitlines() if l.strip()}


def main():
    try:
        mega = listed(lines(MEGA_URL), "List of Mega Evolutions in Pokémon GO")
        mx = lines(MAX_URL)
        gmax = listed(mx, "List of Gigantamax Capable Pokémon")
        dyn = listed(mx, "List of Dynamax Capable Pokémon")
    except (subprocess.CalledProcessError, ValueError) as err:
        print(f"Serebii could not be read: {err}", file=sys.stderr)
        return 2
    if len(mega) < 30 or len(gmax) < 5 or len(dyn) < 50:
        print(f"Serebii parsed implausibly few rows (mega={len(mega)} gmax={len(gmax)} "
              f"dynamax={len(dyn)}) — page layout changed?", file=sys.stderr)
        return 2

    released_megas = {n for n, nxt in mega if not nxt.startswith("Not currently available")}
    checks = [
        # Serebii lists Primal Reversions apart from this table, so they are left out of
        # the comparison rather than reported as missing every week.
        ("Megas", "web/mega-data.js",
         released_megas, {n for n in site_names("web/mega-data.js", "MEGAS")
                          if not n.startswith("Primal ")}),
        ("Gigantamax", "web/max-data.js",
         {n for n, _ in gmax}, site_names("web/max-data.js", "GIGANTAMAX")),
        ("Dynamax", "web/max-data.js",
         {n for n, _ in dyn}, site_names("web/max-data.js", "DYNAMAX")),
    ]

    print("### Roster cross-check against Serebii\n")
    print("Serebii is a second opinion, not the source: nothing below has been applied. "
          "Check each name on Bulbapedia (in a browser) or pokemongo.com before adding or "
          "removing it.\n")
    any_diff = False
    for label, path, theirs, ours in checks:
        only_theirs, only_ours = sorted(theirs - ours), sorted(ours - theirs)
        if not (only_theirs or only_ours):
            print(f"- **{label}:** matches ({len(ours)}).")
            continue
        any_diff = True
        print(f"- **{label}** (`{path}`, site {len(ours)} / Serebii {len(theirs)}):")
        if only_theirs:
            print(f"  - On Serebii, not on the site: {', '.join(only_theirs)}")
        if only_ours:
            print(f"  - On the site, not on Serebii: {', '.join(only_ours)}")
    print()
    if not any_diff:
        print("No roster differences.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
