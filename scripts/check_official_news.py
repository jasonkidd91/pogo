#!/usr/bin/env python3
"""Cross-check the official Pokémon GO news page against the ScrapedDuck events feed.

Usage: python3 scripts/check_official_news.py            # prints JSON to stdout
       python3 scripts/check_official_news.py --news FILE  # parse a saved page instead

WHY THIS EXISTS. The events page has one source: ScrapedDuck's scrape of LeekDuck. In
September 2026 that feed never carried PokéXciting!, the five-city Pokémon 30th anniversary
tour (Kuala Lumpur, Taipei, Singapore, Manila, Bangkok), under any id. Every daily snapshot
from August on was checked. A trainer in Malaysia missed the KL stop because the site never
showed it. One feed has gaps; nothing else here would have noticed.

WHAT IT DOES. Lists every article linked from pokemongo.com/en/news, and reports the ones
whose slug matches no event in the feed. That is the only part of the check that should be
deterministic. Whether an unmatched article is actually a dated event (rather than a
season announcement, update notes or a GBL post), and whether it is already over, is a
judgment made by whoever reads the output: the daily-maintenance job, which files an issue
for a human to review. This script never writes to the site. An event found here has not
been verified, and LIVE data reaches the page only through the feed.

THE FAILURE IT MUST NOT HAVE. "Found no articles" and "found no gaps" must not look the
same. If the news page is unreachable, blocked, or its markup changes so no article links
parse, this raises instead of printing an empty list. An empty list here would read as
"the feed is complete", which is exactly the false confidence that missed PokéXciting!.

THE QUESTION IS "HAS THE SITE EVER SHOWN IT", not "is it in today's feed". The live feed
drops an event a few days after it ends, while the news page keeps its post up for weeks, so
matching only against today's feed would report every recently finished event. Every id
ever committed to web/events-data.js (its git history) counts as covered too.

MATCHING. Slugs and feed ids are written by different people ("event-kuala-lumpur-30th-
anniversary-2026" vs a LeekDuck id). Both are reduced to significant word tokens, and an
article counts as covered when at least two-thirds of its tokens appear in one feed event's
id + name. That errs towards reporting, on purpose: a false positive costs one issue that
a human closes; a false negative is another missed event.
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
NEWS = "https://pokemongo.com/en/news"
FEED = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json"
UA = "Mozilla/5.0 (pogo-site news cross-check)"

# The news index has always carried well over this many posts. Fewer means the page or its
# markup changed, not that Niantic stopped publishing.
MIN_ARTICLES = 5

# Words that say nothing about WHICH event this is.
STOP = {
    "a", "an", "and", "the", "of", "in", "on", "for", "to", "with", "at", "is", "are",
    "en", "news", "event", "events", "pokemon", "go", "save", "date", "announcing",
    "announcement", "celebrate", "celebrating", "celebration", "returns", "return",
    "coming", "new", "get", "ready", "your", "you", "this", "its", "it", "all", "more",
    "2024", "2025", "2026", "2027", "2028",
}

# /news/<slug> or /en/news/<slug>, absolute or relative. Links, not markup structure, so
# a redesign of the card layout does not break discovery.
LINK = re.compile(
    r'<a\b[^>]*\bhref="(?:https?://(?:www\.)?pokemongo(?:live)?\.com)?/(?:[a-z]{2}(?:-[a-z]{2})?/)?'
    r'news/([a-z0-9][a-z0-9-]*)/?"[^>]*>(.*?)</a>',
    re.I | re.S,
)


def curl(url):
    proc = subprocess.run(
        ["curl", "-sSL", "-A", UA, "--max-time", "60", "-w", "\n%{http_code}", url],
        capture_output=True, text=True,
    )
    body, _, code = proc.stdout.rpartition("\n")
    if proc.returncode != 0 or code != "200":
        raise RuntimeError(f"{url}: HTTP {code or '-'} {proc.stderr.strip()[:200]}")
    return body


def tokens(text):
    words = re.findall(r"[a-z0-9]+", text.lower().replace("é", "e"))
    return {w for w in words if w not in STOP and len(w) > 1}


def articles(page):
    seen = {}
    for slug, inner in LINK.findall(page):
        title = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", inner))).strip()
        # A card often links twice (image and heading); keep the one with text.
        if slug not in seen or (title and not seen[slug]):
            seen[slug] = title
    found = [{"slug": s, "title": t, "url": f"https://pokemongo.com/en/news/{s}"}
             for s, t in seen.items()]
    if len(found) < MIN_ARTICLES:
        raise RuntimeError(
            f"only {len(found)} article links parsed from the news page — its markup has "
            "changed or the request was served something else. Not reporting 'no gaps'.")
    return found


def history():
    """Every event the snapshot has ever carried, as {eventID, name} — see the docstring."""
    log = subprocess.run(
        ["git", "-C", ROOT, "log", "-p", "--format=", "--", "web/events-data.js"],
        capture_output=True, text=True,
    ).stdout
    pairs = re.findall(r'"id": "([^"]+)", "name": "([^"]*)"', log)
    return [{"eventID": i, "name": n} for i, n in dict(pairs).items()]


def best_match(article, feed):
    want = tokens(article["slug"])
    if not want:
        return None, 0.0
    best, score = None, 0.0
    for ev in feed:
        have = tokens(ev["eventID"] + " " + ev.get("name", ""))
        s = len(want & have) / len(want)
        if s > score:
            best, score = ev, s
    return best, score


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--news", help="parse this saved HTML file instead of fetching")
    ap.add_argument("--feed", help="read this saved events.json instead of fetching")
    args = ap.parse_args()

    page = open(args.news, encoding="utf-8").read() if args.news else curl(NEWS)
    feed = json.load(open(args.feed, encoding="utf-8")) if args.feed else json.loads(curl(FEED))
    if not isinstance(feed, list) or len(feed) < 10:
        raise RuntimeError("events feed did not return the events list")
    feed = feed + history()

    unmatched = []
    for art in articles(page):
        ev, score = best_match(art, feed)
        if score < 2 / 3:
            art["closest_feed_event"] = ev and ev["eventID"]
            art["overlap"] = round(score, 2)
            unmatched.append(art)

    json.dump({"news_url": NEWS, "unmatched": unmatched}, sys.stdout, indent=2,
              ensure_ascii=False)
    print()


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as e:
        print(f"check_official_news: {e}", file=sys.stderr)
        sys.exit(2)
