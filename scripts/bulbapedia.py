"""
Shared helpers for parsing Bulbapedia wikitext into site data.

Why wikitext and not the rendered page: LLM-summarised fetches of these tables have been
demonstrably wrong — truncating to the first row of each section, and reporting released
Pokemon as unreleased. The wikitext parses deterministically, so we do that instead.

Two traps this module exists to solve. Do not hand-roll around them:

  1. UNRELEASED ENTRIES ARE HTML-COMMENTED. Bulbapedia keeps datamined/unreleased rows in
     the table inside <!-- -->. Parsing without stripping comments pulls in ~32 Megas that
     are not in the game. `fetch_wikitext` strips them.

  2. CELLS CARRY ATTRIBUTES. A cost cell looks like:
         | data-sort-value="100" | 100<ref group="lower-alpha" .../>
     Naively reading the cell yields no number, which then silently inherits the previous
     row's value through the rowspan fallback. `cell_value` strips attributes and refs.

  3. CATEGORY MEMBERSHIP IS NOT IN THE ARTICLE. The Legendary Pokemon article names Ditto,
     Bulbasaur and Cyclizar in prose, so scraping it for {{p|...}} links reports them as
     Legendary. `category_members` asks the MediaWiki category API instead, which is the
     actual membership list.

Bulbapedia sits behind Cloudflare, which answers datacenter IPs (GitHub runners, cloud
containers) with a "Just a moment..." challenge instead of data — first seen 2026-11-12.
Never try to get past it. Instead, every successful fetch is saved to CACHE_DIR, which is
committed, and with BULBAPEDIA_CACHE_FALLBACK=1 a blocked fetch reads that copy. Each use is
recorded in FALLBACKS and stamped into the generated file by `write_js`, so a roster built
from a cached page always says how old that page is. Without the variable a block still
raises: a local run must never quietly use stale data.
"""

import datetime
import json
import os
import re
import subprocess
import urllib.parse

UA = "Mozilla/5.0 (pogo-site data updater)"

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bulbapedia-cache")
FALLBACKS: list[tuple[str, str]] = []  # (cache key, date it was fetched) for each cache hit


class Blocked(RuntimeError):
    """Bulbapedia answered with something other than data (Cloudflare challenge, 403...)."""


def _cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, re.sub(r"[^A-Za-z0-9._()-]+", "_", key) + ".json")


def _fetch(url: str, key: str, valid) -> str:
    """GET `url`; on success cache the body under `key`. If the response fails `valid`,
    fall back to the cache when BULBAPEDIA_CACHE_FALLBACK=1, otherwise raise Blocked."""
    out = subprocess.run(
        ["curl", "-sL", "-A", UA, url], capture_output=True, text=True, check=True
    ).stdout
    if valid(out):
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(_cache_path(key), "w") as f:
            json.dump({"key": key, "url": url, "fetched": datetime.date.today().isoformat(),
                       "body": out}, f, ensure_ascii=False, indent=0)
            f.write("\n")
        return out
    msg = f"{key}: Bulbapedia did not return data (got {out[:120]!r})"
    if os.environ.get("BULBAPEDIA_CACHE_FALLBACK") != "1":
        raise Blocked(msg)
    try:
        with open(_cache_path(key)) as f:
            cached = json.load(f)
    except FileNotFoundError:
        raise Blocked(msg + " and no cached copy exists — run the generator locally once")
    print(f"WARNING: {msg}; using cached copy from {cached['fetched']}")
    FALLBACKS.append((key, cached["fetched"]))
    return cached["body"]


def _is_json(s: str) -> bool:
    try:
        json.loads(s)
        return True
    except ValueError:
        return False


def fetch_wikitext(page: str, strip_comments: bool = True) -> str:
    """Fetch raw wikitext for a Bulbapedia page, e.g. 'Mega_Evolution_(GO)'."""
    url = (
        "https://bulbapedia.bulbagarden.net/w/index.php?"
        + urllib.parse.urlencode({"title": page, "action": "raw"})
    )
    # Wikitext has headings; a challenge page or empty body does not.
    out = _fetch(url, page, lambda s: "==" in s and not s.lstrip().startswith("<!DOCTYPE"))
    return re.sub(r"<!--.*?-->", "", out, flags=re.DOTALL) if strip_comments else out


def category_members(category: str) -> set[str]:
    """Species in a Bulbapedia category, e.g. category_members('Legendary Pokémon').

    Returns bare species names — the API's "Charizard (Pokémon)" titles with the suffix
    dropped. Non-species members (the category's own article, sub-topics) are discarded.
    See trap 3: never scrape the article for this.
    """
    names, cont, pages = set(), None, 0
    while True:
        params = {"action": "query", "list": "categorymembers",
                  "cmtitle": "Category:" + category, "cmlimit": "500", "format": "json"}
        if cont:
            params["cmcontinue"] = cont
        url = "https://bulbapedia.bulbagarden.net/w/api.php?" + urllib.parse.urlencode(params)
        data = json.loads(_fetch(url, f"Category:{category}#{pages}", _is_json))
        for m in data.get("query", {}).get("categorymembers", []):
            hit = re.fullmatch(r"(.+) \(Pokémon\)", m["title"])
            if hit:
                names.add(hit.group(1))
        cont = data.get("continue", {}).get("cmcontinue")
        pages += 1
        if not cont or pages > 10:
            break
    if not names:
        raise RuntimeError(f"Category:{category} listed no species — renamed or API changed?")
    return names


def section(text: str, heading: str) -> str:
    """The wikitable body following a '==Heading==', up to its closing '|}'."""
    if heading not in text:
        raise RuntimeError(f"heading not found: {heading!r} — page layout changed?")
    seg = text[text.index(heading):]
    return seg[: seg.index("\n|}")]


def rows(seg: str) -> list[str]:
    return seg.split("\n|-")


def cells(row: str) -> list[str]:
    """Split a wikitext row into raw cells, joining continuation lines."""
    out, cur = [], None
    for line in row.split("\n"):
        if line.startswith("|") and not line.startswith("|-"):
            if cur is not None:
                out.append(cur)
            cur = line[1:]
        elif cur is not None and line.strip() and not line.startswith("!"):
            cur += " " + line.strip()
    if cur is not None:
        out.append(cur)
    return out


def cell_value(c: str) -> str:
    """Strip <ref> tags and cell attributes, leaving the displayed value. See trap 2."""
    c = re.sub(r"<ref[^>]*?/>", "", c)
    c = re.sub(r"<ref.*?</ref>", "", c, flags=re.DOTALL)
    c = re.sub(r"<ref[^>]*>.*", "", c)
    if "|" in c:
        head, _, tail = c.rpartition("|")
        if re.search(r"(rowspan|colspan|data-sort-value|style|class)\s*=", head):
            c = tail
    return c.strip()


MONTHS = ("January|February|March|April|May|June|July|August|September|October|"
          "November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec")


def find_date(s: str):
    m = re.search(rf"({MONTHS})\s+\d{{1,2}},\s+\d{{4}}", s)
    return m.group(0) if m else None


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def check_sprites(slugs, base="https://img.pokemondb.net/sprites/home/normal/"):
    """Return {slug: bool_exists}. ALWAYS run before writing data — a wrong slug is a
    silently broken image on the page."""
    result = {}
    for s in sorted(set(slugs)):
        code = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-L", f"{base}{s}.png"],
            capture_output=True, text=True,
        ).stdout.strip()
        result[s] = code == "200"
    return result


def write_js(path: str, header: str, blocks: dict):
    """Write `const NAME = [...]` blocks as a plain (non-module) JS data file."""
    parts = [header]
    if FALLBACKS:
        # The weekly workflow ignores lines containing "bulbapedia-cache" when deciding
        # whether anything changed, so this stamp alone never opens a PR.
        oldest = min(d for _, d in FALLBACKS)
        parts.append(f"// Bulbapedia was unreachable; built from scripts/bulbapedia-cache "
                     f"(oldest page fetched {oldest}). The Game Master data is current.\n")
    for name, arr in blocks.items():
        body = ",\n".join("  " + json.dumps(x, ensure_ascii=False) for x in arr)
        parts.append(f"const {name} = [\n{body}\n];\n")
    open(path, "w").write("\n".join(parts))
    print(f"wrote {path}: " + ", ".join(f"{k}={len(v)}" for k, v in blocks.items()))
