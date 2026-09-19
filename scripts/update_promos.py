#!/usr/bin/env python3
"""Refresh web/promo-data.js — the fallback snapshot for the promo codes page.

Usage: python3 scripts/update_promos.py

WHAT THIS IS FOR. Promo codes are LIVE data: Niantic drops and retires them with no schedule,
so a baked list would be wrong within days — sometimes hours. web/promo-codes.js fetches
LeekDuck's promo codes page itself, live, on every load of promo-codes.html, exactly like
events.js does for the events feed. This snapshot is only what that page shows while the fetch
is in flight or if it fails.

It is ALSO loaded on every other page, unlike events-data.js, because the nav's "new code"
nudge (buildNav() in store.js, via Promos.unseenCount() in web/promos.js) has to know the
current code list without every page paying for a live fetch. That is the one thing that is
allowed to be up to a day stale — the dedicated page always re-fetches live, so opening it
never shows a nudge for a code you've already seen fresher than this file.

SOURCE. https://leekduck.com/promo-codes/ — no JSON feed exists for this the way ScrapedDuck's
events.json does, so this is scraped HTML, same as an individual event page in
scripts/update_events.py. The response carries `access-control-allow-origin: *`, confirmed by
hand, which is what makes the client-side live fetch in promos.js possible at all — if that
ever stops being true the live fetch will fail silently (CORS errors don't reach `catch`
with a useful message) and this snapshot becomes the only source until it's fixed.

CARD SHAPE, as of this writing — verify against the live page if parsing comes up empty:

    <div class="promo-card">
      <h3 class="title">…</h3>
      <div class="description"><p>… <a href="/events/…">here</a>.</p></div>
      <div class="code-display"><p class="text">CODE123</p></div>
      <a class="link-button" href="https://store.pokemongo.com/offer-redemption?passcode=CODE123">
      <li class="reward"><span class="reward-label">Poké Ball</span><div class="quantity">×35</div></li>
      <span class="expiry" data-expires="2026-09-22 20:00:00" data-hide-expiry="false">
    </div>

EXPIRY — two traps. `data-expires` has no consistent timezone: most are a bare
"YYYY-MM-DD HH:MM:SS" (LeekDuck's own copy says "local time" for these — wall clock, same
ambiguity as an events.json stamp with no trailing Z), but some carry an explicit
"-0700"/"-0800" offset when Niantic's own support page states the deadline in Pacific time.
Preserve the string verbatim, exactly like start/end in events-data.js — do not normalise it,
promos.js's expiry parsing (Promos.expiryDate) has to branch on it the same way events.js
branches on a trailing Z.

`data-hide-expiry="true"` means LeekDuck itself doesn't have a confirmed deadline and shows
"Expires: ???" instead of a date — the `data-expires` value on one of these is a far-future
placeholder, not a real deadline. It must never be read as "this code is fine until then";
promos.js only uses it to decide whether the code is ALREADY expired (placeholder dates are
always in the future), never to display a countdown.

DESCRIPTION. Kept as plain text, verbatim from the card — these sentences carry real
constraints (a region carve-out, an alternate reward, a deadline in prose) that must never be
paraphrased, same reasoning as events.js's caveats. The one exception: a trailing inline link
("Research details here.") is pulled out into its own `link` field so the page can render it
as a normal link rather than dead text, mirroring how events.js keeps a `link` field separate
from `blurb`.
"""

import datetime
import html
import json
import os
import re
import subprocess

SOURCE = "https://leekduck.com/promo-codes/"
SITE = "https://leekduck.com"
OUT = os.path.join(os.path.dirname(__file__), "..", "web", "promo-data.js")
UA = "Mozilla/5.0 (pogo-site data updater)"

CARD = re.compile(
    r'<div class="promo-card">.*?(?=<div class="promo-card">|</div></div></div></div><script)',
    re.S)


def fetch():
    out = subprocess.run(
        ["curl", "-sL", "-A", UA, "--max-time", "30", SOURCE],
        capture_output=True, text=True, check=True,
    ).stdout
    if "promo-container" not in out or "Available Promo Codes" not in out:
        raise RuntimeError(
            "leekduck.com/promo-codes/ did not return the expected page shape — "
            "the markup has probably changed; fix the parser before shipping a snapshot"
        )
    return out


def _text(frag):
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", frag))).strip()
    return re.sub(r"\s+([.,!?;:])", r"\1", t)


def _field(card, pattern):
    m = re.search(pattern, card, re.S)
    return html.unescape(m.group(1)) if m else None


def description_of(card):
    m = re.search(r'<div class="description"><p>(.*?)</p></div>', card, re.S)
    if not m:
        return None, None
    frag = m.group(1)
    link = None
    a = re.search(r'<a href="([^"]+)"[^>]*>', frag)
    if a:
        href = a.group(1)
        link = href if href.startswith("http") else SITE + href
    return _text(frag), link


def rewards_of(card):
    out = []
    for li in re.findall(r'<li class="reward".*?</li>', card, re.S):
        label = _field(li, r'class="reward-label">([^<]*)<')
        qty = _field(li, r'class="quantity">(×[\d,]+)<')
        if not label:
            continue
        out.append(f"{label} {qty}" if qty else label)
    return out


def card_of(card):
    title = _field(card, r'<h3 class="title">([^<]*)</h3>')
    code = _field(card, r'class="text">([^<]*)</p>')
    redeem = _field(card, r'class="link-button" href="([^"]+)"')
    exp = re.search(
        r'class="expiry" data-expires="([^"]+)" data-hide-expiry="([^"]+)"', card)
    if not (title and code and redeem and exp):
        raise RuntimeError(
            f"a promo-card is missing title/code/redeem/expiry (got title={title!r} "
            f"code={code!r} redeem={redeem!r} expiry={bool(exp)}) — markup has changed"
        )
    description, link = description_of(card)
    out = {
        "code": code,
        "title": title,
        "redeem": redeem,
        "expires": exp.group(1),
        "hideExpiry": exp.group(2) == "true",
    }
    if description:
        out["description"] = description
    if link:
        out["link"] = link
    rewards = rewards_of(card)
    if rewards:
        out["rewards"] = rewards
    return out


def main():
    page = fetch()
    cards = CARD.findall(page)
    codes = [card_of(c) for c in cards]

    print(f"promo-codes.html: {len(codes)} active code(s)")
    for c in codes:
        flag = " (no confirmed expiry)" if c["hideExpiry"] else ""
        print(f"  {c['code']:24} expires {c['expires']}{flag}")

    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    header = f"""/**
 * Fallback snapshot of the Pokemon GO promo codes list, AND the data the site-wide nav nudge
 * reads on every page — see the module docstring in scripts/update_promos.py for why this one
 * file does both jobs.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_promos.py
 * Source: {SOURCE}
 * Fetched: {stamp} local
 *
 * PROMO CODES ARE LIVE DATA. promo-codes.js fetches the page above on every load of
 * promo-codes.html and renders that; this file is only what it shows while the fetch is in
 * flight or if it fails, same relationship as events-data.js has to events.js.
 *
 * `expires` is copied verbatim and is NOT consistently in one timezone — most are a bare
 * local wall-clock stamp, some carry an explicit "-0700"/"-0800" offset. Do not normalise it;
 * web/promos.js's expiry parsing branches on it. `hideExpiry: true` means LeekDuck has no
 * confirmed deadline for this one and `expires` is a placeholder that must never be shown as
 * a real date — only used to detect an ALREADY-past deadline.
 */

const PROMO_FETCHED = {json.dumps(stamp)};
const PROMO_SOURCE = {json.dumps(SOURCE)};
"""
    body = ("const PROMO_SNAPSHOT = [\n"
            + ",\n".join("  " + json.dumps(c, ensure_ascii=False) for c in codes)
            + "\n];\n")
    open(OUT, "w").write(header + "\n" + body)
    print(f"wrote {OUT}: {len(codes)} code(s)")


if __name__ == "__main__":
    main()
