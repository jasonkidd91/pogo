#!/usr/bin/env python3
"""Refresh web/events-data.js — the fallback snapshot for the events page.

Usage: python3 scripts/update_events.py

WHAT THIS IS FOR. Events are LIVE data: what is on right now changes daily, so the page
fetches the feed itself on every load and renders whatever it gets. This snapshot is only
what the page shows while that fetch is in flight, or if it fails. It is deliberately a
fallback and the page labels it as one, with the date below.

SOURCE. ScrapedDuck, which scrapes LeekDuck's event list into JSON:
    https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json
LeekDuck is one of the three sources this repo already verifies event data against.

BLURBS. The feed has no description field, and an event called "Mega Squads" tells you
nothing about what it is. So each event's LeekDuck page is fetched once here and its intro
paragraph is kept, along with the page's own contents list (spawns, raids, research…). Those
are baked, because scraping 50 pages from the browser on every load is not reasonable; the
page falls back to a per-type explanation for any event it has no blurb for, which is what
happens for anything announced after this file was last generated.

TIME ZONES — the trap. A start/end WITHOUT a trailing Z is local wall-clock time: a
Community Day that reads 14:00 starts at 14:00 wherever you are, and is a different instant
in Tokyo and in London. A start/end WITH a trailing Z is a real instant, which is how GO
Battle League rotations are published. The two must not be conflated, so the suffix is
preserved verbatim here and events.js branches on it.
"""

import datetime
import html
import json
import os
import re
import subprocess
import time

FEED = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json"
OUT = os.path.join(os.path.dirname(__file__), "..", "web", "events-data.js")
UA = "Mozilla/5.0 (pogo-site data updater)"

# Anything that finished more than this long ago is dropped — the snapshot only has to cover
# "now and next", and the whole feed is mostly history.
KEEP_ENDED_DAYS = 2

# Types whose specifics are already carried by the name and the feed's own fields — the
# LeekDuck copy for these is boilerplate ("Trainers will also receive 4x Stardust") and
# repeats the per-type explanation the page shows anyway.
BLURB_TYPES = {"event", "pokemon-go-fest", "community-day", "raid-day", "max-battles",
               "raid-battles", "season", "go-pass"}

# Sentences that only restate the window this page already shows, or say nothing at all.
NOISE = re.compile(
    r"(will (take place|run|be held|be available)|takes place|runs|is scheduled) (from|on)"
    r"|^stay tuned"
    r"|get the latest info on shiny",
    re.I)
FULL_DATE = re.compile(
    r"(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{1,2},\s+\d{4}")
# "6:00 a.m." must not end a sentence. Protect the dots, split, then put them back.
ABBR = [("a.m.", "a\u2024m\u2024"), ("p.m.", "p\u2024m\u2024"), ("vs.", "vs\u2024")]

# The page's own contents list, minus the parts this site deliberately doesn't carry
# (shop sales, promo graphics).
TOC_KEEP = ["bonuses", "spawns", "eggs", "raids", "research", "moves", "shiny"]


def fetch():
    out = subprocess.run(
        ["curl", "-sL", "-A", UA, "--max-time", "60", FEED],
        capture_output=True, text=True, check=True,
    ).stdout
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        raise RuntimeError(f"feed did not return JSON: {out[:200]!r}")
    if not isinstance(data, list) or len(data) < 10:
        raise RuntimeError(f"feed returned {len(data)} entries — that is not the events list")
    return data


def naive(ts):
    """Compare-only parse. Wall-clock and UTC stamps are both flattened to naive here; the
    page keeps the distinction, this is just for 'is it over yet'."""
    if not ts:
        return None
    return datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)


# ---------------------------------------------------------------------------------------
# CAVEATS — the things that are easy to miss and expensive to miss.
#
# Every caveat QUOTES a sentence from the event's own page. The patterns below only decide
# which sentence to surface and what to label it; nothing here writes a claim of its own.
# That matters more here than anywhere else on the site: "you must evolve before 9 p.m." and
# "this one is regional" are exactly the class of fact that must never be answered from
# memory, and a wrong one costs somebody an evolution they cannot redo.

RULES = [
    ("move",     re.compile(r"\bEvolve\b.{0,200}?\b(to get|to receive|that knows|knowing)\b", re.I)),
    ("shiny",    re.compile(r"\b(higher|increased) chance[^,]{0,60}\bShiny\b", re.I)),
    ("shiny",    re.compile(r"\bShiny\b.{0,80}?\b(debut|for the first time)\b", re.I)),
    ("debut",    re.compile(r"\b(mak(es|ing) (its|their)[^.]{0,40}debut|will debut|debuts? in "
                            r"Pokémon GO|for the first time in Pokémon GO|Pokémon GO debut)\b", re.I)),
    ("regional", re.compile(r"\b(will appear in the .{0,60}?region|regional[- ]exclusive"
                            r"|appear(s|ing)? (only )?in the (Asia-Pacific|Europe|Americas))", re.I)),
    ("rare",     re.compile(r"\b(last seen in \d{4}|for the first time since|has not been "
                            r"(available|seen)|returning to Pokémon GO|is back)\b", re.I)),
    ("costume",  re.compile(r"\b(costumed?|wearing (a|an|its|the|[A-Z]))\b", re.I)),
    ("only",     re.compile(r"\b(only[^.]{0,50}during (the|this) event|will not be available"
                            r"|exclusive to this event|event[- ]exclusive)\b", re.I)),
    ("window",   re.compile(r"\bbonus will be active from\b|\bwhile most bonuses\b", re.I)),
]

# Pointers, footnotes and shop copy. These match the caveat patterns and none of them is a
# caveat about catching something.
DROP = re.compile(r"^(leek duck|menu|shiny raids|please note)"
                  r"|check out|for more information|\bblog\b|US\$|web store|\bpricing tier\b"
                  r"|\bsubscri|\bticket|at no cost", re.I)

BLOCK = re.compile(r"</(p|li|h[1-6]|div|td|tr|section|ul|ol)>|<br\s*/?>", re.I)



def text_blocks(frag):
    """Split on block boundaries FIRST. Stripping tags without this glues a heading onto the
    sentence after it — "Shiny Shiny Debut For the first time…" — and the result reads broken."""
    for chunk in BLOCK.split(frag):
        if not chunk or chunk.lower() in ("p", "li", "div", "td", "tr", "section", "ul", "ol") \
                or re.fullmatch(r"h[1-6]", chunk or "", re.I):
            continue
        t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", chunk))).strip()
        t = re.sub(r"\s+([.,!?;:])", r"\1", t)
        if t:
            yield t


def _cav_sentences(t):
    for a, b in (("a.m.", "a․m․"), ("p.m.", "p․m․")):
        t = t.replace(a, b)
    for s in re.split(r"(?<=[.!?])\s+", t):
        for a, b in (("a.m.", "a․m․"), ("p.m.", "p․m․")):
            s = s.replace(b, a)
        yield s.strip()


# Shop sections and the site chrome. Not caveats, and the page promises no shop copy.
STOP_AT = ('<h2 id="sales"', '<h2 id="graphic"', '<h2 id="pokémon-go-web-store', '</main>', '<footer')


def cav_body(page):
    """From the description to the first section we don't read. A raid page has neither
    </main> nor a sales heading, so every terminator has to be optional — requiring one
    silently returned an empty body and dropped every caveat on those pages."""
    i = page.find('<div class="event-description">')
    if i < 0:
        return ""
    seg = page[i:]
    for stop in STOP_AT:
        j = seg.find(stop)
        if j > 0:
            seg = seg[:j]
    return seg


def caveats(page, limit=4):
    out, seen = [], set()
    for block in text_blocks(cav_body(page)):
        for s in _cav_sentences(block):
            # A real sentence, not a stray label or a fragment of a table.
            if len(s) < 30 or len(s) > 260 or not s[:1].isupper() or s[-1] not in ".!?":
                continue
            if DROP.search(s):
                continue
            for kind, pat in RULES:
                if kind in seen:
                    continue
                if pat.search(s):
                    out.append((kind, s))
                    seen.add(kind)
                    break
    return out[:limit]


def page_html(url):
    return subprocess.run(
        ["curl", "-sL", "-A", UA, "--max-time", "30", url],
        capture_output=True, text=True,
    ).stdout


def _text(frag):
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", frag))).strip()
    # Stripping inline tags leaves gaps in front of punctuation: "Mega Finale ." -> "Mega Finale."
    return re.sub(r"\s+([.,!?;:])", r"\1", t)


def _sentences(para):
    for a, b in ABBR:
        para = para.replace(a, b)
    for s in re.split(r"(?<=[.!?])\s+", para):
        for a, b in ABBR:
            s = s.replace(b, a)
        yield s.strip()


def _clip(text, limit):
    """Cut at a word boundary, not mid-word."""
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(" ,;:-") + "\u2026"


def _meta(page):
    """The page's own summary. Often more specific than the intro paragraph, which tends to
    be a greeting — but LeekDuck truncates it, so the dangling last word is dropped."""
    m = re.search(r'<meta name="description" content="(.*?)"', page, re.S)
    if not m:
        return None
    t = _text(html.unescape(m.group(1)))
    # Same bar as the intro sentences: a summary that just restates the window is no summary.
    if NOISE.search(t) or len(FULL_DATE.findall(t)) >= 2:
        return None
    if t.endswith("..."):
        t = t[:-3].rstrip()
        # The truncation lands mid-clause; step back to the last complete one.
        cut = max(t.rfind(","), t.rfind(" and "), t.rfind(";"))
        if cut > 60:
            t = t[:cut]
        else:
            t = t.rsplit(" ", 1)[0]
        t = t.rstrip(" ,;:-") + "\u2026"
    return t or None


def blurb_of(page):
    """The event's intro, minus the sentences that say nothing this page doesn't show."""
    m = re.search(r'<div class="event-description">(.*?)</div>', page, re.S)
    if not m:
        return None
    keep = []
    for para in re.findall(r"<p[^>]*>(.*?)</p>", m.group(1), re.S):
        for s in _sentences(_text(para)):
            if len(s) < 20 or NOISE.search(s):
                continue
            # Two full dates in one sentence means it is restating the window.
            if len(FULL_DATE.findall(s)) >= 2:
                continue
            if not s[:1].isupper():          # a fragment left behind by a split
                continue
            # "...on the following dates:" introduces a list this page does not carry.
            if s.endswith(":"):
                continue
            keep.append(s)
    out = " ".join(keep[:2]).strip()
    # A short intro is usually a greeting — "get energized for the Mega Squads event!" — and
    # the page's own summary says more about what is actually in it.
    meta = _meta(page)
    if meta and len(meta) > len(out) and len(out) < 110:
        out = meta
    return _clip(out, 250) if len(out) >= 40 else None


def toc_of(page):
    found = re.findall(r'class="event-toc-item ([a-z-]+)"', page)
    return [t for t in TOC_KEEP if t in found]


def slim(e):
    """Only the fields the page renders. The feed carries a lot the page deliberately drops —
    article images, shiny flags, per-bonus icon URLs — because the point of the page is to be
    less cluttered than the official one."""
    out = {
        "id": e.get("eventID"),
        "name": e.get("name"),
        "type": e.get("eventType"),
        "heading": e.get("heading"),
        "link": e.get("link"),
        "start": e.get("start"),
        "end": e.get("end"),
    }
    extra = e.get("extraData") or {}

    spot = extra.get("spotlight")
    if spot:
        # The bonus is the whole reason to care about a Spotlight Hour.
        out["bonus"] = spot.get("bonus")
        names = [p.get("name") for p in spot.get("list") or [] if p.get("name")]
        if names:
            out["mons"] = names

    cday = extra.get("communityday")
    if cday:
        names = [p.get("name") for p in cday.get("spawns") or [] if p.get("name")]
        if names:
            out["mons"] = names
        bonuses = [b.get("text") for b in cday.get("bonuses") or [] if b.get("text")]
        if bonuses:
            out["bonuses"] = bonuses

    raids = extra.get("raidbattles")
    if raids:
        names = [b.get("name") for b in raids.get("bosses") or [] if b.get("name")]
        if names:
            out["mons"] = names

    return {k: v for k, v in out.items() if v not in (None, [], "")}


def main():
    data = fetch()
    now = datetime.datetime.now()
    cutoff = now - datetime.timedelta(days=KEEP_ENDED_DAYS)

    kept = []
    for e in data:
        end = naive(e.get("end")) or naive(e.get("start"))
        if end and end < cutoff:
            continue
        if not e.get("start"):
            continue
        kept.append(slim(e))
    kept.sort(key=lambda e: e["start"])

    # One page fetch per event, in order, with a pause between — this is somebody's site.
    described = structured = eligible = flagged = 0
    for e in kept:
        if e.get("type") not in BLURB_TYPES or not e.get("link"):
            continue
        eligible += 1
        page = page_html(e["link"])
        if not page:
            print(f"  ! no page for {e['id']}")
            continue
        # Whether the container is THERE is the health check for the scrape. Whether it holds
        # anything worth printing is a property of the event: half the schedule is placeholders
        # ("October Community Day", details TBA) with nothing to say yet.
        if '<div class="event-description">' in page:
            structured += 1
        text = blurb_of(page)
        if text:
            e["blurb"] = text
            described += 1
        has = toc_of(page)
        if has:
            e["has"] = has
        found = caveats(page)
        if found:
            e["caveats"] = [{"k": k, "t": t} for k, t in found]
            flagged += 1
        time.sleep(0.4)

    if not kept:
        raise RuntimeError("every event was filtered out — check the system clock and the feed")

    from collections import Counter
    counts = Counter(e["type"] for e in kept)
    live = [e for e in kept
            if naive(e["start"]) <= now <= (naive(e.get("end")) or naive(e["start"]))]
    print(f"feed: {len(data)} entries, kept {len(kept)} current/upcoming")
    print(f"  live right now: {len(live)}")
    for e in live:
        print(f"    {e['type']:22} {e['name'][:60]}")
    print(f"  by type: {dict(counts)}")
    print(f"  caveats: {flagged} events flagged something easy to miss")
    print(f"  blurbs: {described} written, {structured}/{eligible} pages had a description "
          f"block (the rest are placeholders with no details yet)")
    if eligible and structured < eligible * 0.6:
        raise RuntimeError(
            f"only {structured}/{eligible} LeekDuck pages had a .event-description block — "
            "their markup has probably changed; fix the selector before shipping a snapshot "
            "with no descriptions in it"
        )
    print(f"  global (UTC-stamped) entries: {sum(1 for e in kept if e['start'].endswith('Z'))}")

    stamp = now.strftime("%Y-%m-%d %H:%M")
    header = f"""/**
 * Fallback snapshot of the Pokemon GO event list.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_events.py
 * Source: {FEED}
 *         (ScrapedDuck, which scrapes https://leekduck.com/events/)
 * Fetched: {stamp} local
 *
 * EVENTS ARE LIVE DATA. events.js fetches the feed above on every page load and renders
 * that; this file is only what it shows while the fetch is in flight or if it fails, and
 * the page says so on screen. Refreshing this file is not how the page stays current.
 *
 * caveats quote sentences from the event's page verbatim — the exclusive-move deadline, a
 * regional split, boosted Shiny odds, a debut, a bonus window that differs from the event's.
 * They are never composed here, only selected and labelled.
 *
 * blurb/has are scraped from each event's LeekDuck page — what the event actually is, and
 * what it contains. Events announced after this file was generated simply have neither, and
 * events.js falls back to its per-type explanation.
 *
 * start/end WITHOUT a trailing Z are local wall-clock times — 14:00 means 14:00 wherever
 * the player is. WITH a trailing Z they are real instants, which is how GO Battle League
 * rotations are published. events.js branches on the suffix; do not normalise it away.
 */

const EVENTS_FETCHED = {json.dumps(stamp)};
const EVENTS_SOURCE = {json.dumps(FEED)};
"""

    parts = [header, "const EVENTS_SNAPSHOT = [\n"
             + ",\n".join("  " + json.dumps(e, ensure_ascii=False) for e in kept)
             + "\n];\n"]
    open(OUT, "w").write("\n".join(parts))
    print(f"wrote {OUT}: {len(kept)} events")


if __name__ == "__main__":
    main()
