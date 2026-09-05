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

TIME ZONES — the trap. A start/end WITHOUT a trailing Z is local wall-clock time: a
Community Day that reads 14:00 starts at 14:00 wherever you are, and is a different instant
in Tokyo and in London. A start/end WITH a trailing Z is a real instant, which is how GO
Battle League rotations are published. The two must not be conflated, so the suffix is
preserved verbatim here and events.js branches on it.
"""

import datetime
import json
import os
import subprocess

FEED = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json"
OUT = os.path.join(os.path.dirname(__file__), "..", "web", "events-data.js")
UA = "Mozilla/5.0 (pogo-site data updater)"

# Anything that finished more than this long ago is dropped — the snapshot only has to cover
# "now and next", and the whole feed is mostly history.
KEEP_ENDED_DAYS = 2


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
