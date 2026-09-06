---
name: verify-site
description: Verify the pogo site in a real browser before shipping — renders, sign-in gate, trackers, filters, mobile layout, no broken images or console errors. Use after changing anything under web/, before deploying, or when the user reports something looks wrong on a page. Covers getting Chromium running in this container without root, and the assertions that have caught real bugs here.
---

# Verify the site in a browser

There is no test runner in this repo. Verification is a real browser asserting against the
DOM, and it is not optional — every bug this project has shipped was invisible in the source
and obvious in a browser.

## Serve it

```bash
python3 -m http.server 8777 --directory web
```

**Never open a page over `file://`.** The origin is opaque, so Google sign-in and Firestore
both fail and you will debug a problem that does not exist.

## Getting Chromium to launch without root

Playwright's Chromium will not start here out of the box — the container has no root and
`sudo` is unavailable, and the failure reads `Host system is missing dependencies`. Unpack the
shared libraries into a local sysroot instead:

```bash
cd <scratchpad>
apt-get update -o Dir::State::lists=$PWD/apt/lists -o Dir::Cache=$PWD/apt/cache \
  -o Dir::State::status=/dev/null
apt-get download -o Dir::Cache=$PWD/apt/cache <packages...>
for d in *.deb; do dpkg-deb -x "$d" sysroot; done
export LD_LIBRARY_PATH="$PWD/sysroot/usr/lib/aarch64-linux-gnu:$PWD/sysroot/lib/aarch64-linux-gnu"
node yourtest.js
```

Expect to run it twice — the first pass misses transitive deps. Ones that were needed here:
`libavahi-common3 libavahi-client3 libxi6 libwayland-server0` on top of the usual X/GTK set.
Keep the sysroot in the scratchpad and reuse it; rebuilding takes minutes.

## What to assert

### The design system, on every page

Everything visible comes from `web/ui.js` (see the `design-system` skill), so these are
cross-page invariants — a failure means one page has drifted from the others:

- all five layout landmarks present: `.wrap`, `header.hero`, `.summary`, `main`, `footer`
- every card is exactly `img` + `.body` + `.check`, in that order
- **no card contains a bare `"0"` text node.** `list.length && el(…)` evaluates to the number
  `0` for an empty list, and that shipped a stray "0" onto every card without badges
- every filter chip has `data-group` **and** `aria-pressed`, and exactly one chip per group is
  pressed
- every chip row has a `.chip-label`

A static check belongs with them — the only legal hits are constant SVGs:

```bash
grep -n 'createElement\|innerHTML' web/*.js web/*.html | grep -v '^web/ui.js'
```

### Every page

- cards/rows actually rendered, with the count you expect
- no broken images: `[...document.querySelectorAll('img')].filter(i => i.complete && !i.naturalWidth)` is empty
- no console errors and no page errors (listen to both `console` and `pageerror`)
- no horizontal overflow: `document.documentElement.scrollWidth > innerWidth` is false, at 390px too

### Tracker pages (`megas.html`, `dynamax.html`, `mega-finale.html`)

These carry `<body data-tracker>`, which is what makes `auth.js` draw the sign-in gate. Signed
out:

- `body.signed-out` set, `body.auth-busy` cleared once Firebase resolves
- the gate is present and offers Google sign-in, and is not the `.bad` error variant
- every card has `aria-disabled="true"` and `tabIndex = -1`
- clicking a card does **not** tick it, and **does** flash the gate
- Reset is inert

**`aria-disabled` makes Playwright refuse to click** — it reports "element is not enabled".
That is correct assistive-tech semantics, not a bug: a real pointer click still lands. Use
`click({ force: true })` and say why in a comment.

### Rank chips (`megas.html`, `dynamax.html`)

Every card carries an S/A/B/C/D combat-power chip and, when there is a number, a DPS line.
Four assertions here have caught real bugs:

- **measure the contrast, do not eyeball it.** Every filled grade must clear **4.5:1** against
  its own background, and a collected card must keep the chip at ≥0.8 opacity. B, C and D
  shipped translucent once and vanished on ticked cards. Compute the WCAG ratio from
  `getComputedStyle` in the check.
- **the rank is in the card's `aria-label`.** The chip lives inside `.name`, and `aria-label`
  replaces card content for a screen reader — without repeating it, the rank is silently not
  announced at all.
- **the chip is not struck through on a collected card.** `.card.caught .name` sets
  `line-through`, which propagates to children; `inline-flex` on the chip is what blocks it.
- **a card with no DPS line is `?` or `D`, never anything else.** `?` is missing Game Master
  data; `D` includes species like Magikarp with no usable attacking moveset at all.

Also check each filter narrows *and* that what survives matches, and that Blissey stays rank D
with a `MAX SPIRIT` badge — combat power and Max role are separate on purpose. See the
`update-ranks` skill for the rest.

### The events page (`index.html`)

Has no tracker and must have **no gate**. See the `update-events` skill for its assertions.

### Mobile, at 390x844

- the sticky summary collapses to a ~50px strip once scrolled, and is pinned to the top
- tapping the strip re-expands it; scrolling back to the top restores it
- **no collapse/expand flapping** — watch `body.className` with a MutationObserver through a
  continuous wheel scroll and assert at most two flips. Collapsing changes the document
  height, so an oscillation is a real risk, not a theoretical one.
- desktop is unchanged at 1200px

## Test on a slow connection, not just a fast one

The worst bug shipped here was invisible at full speed: the sign-in gate was hidden while the
Firebase SDK downloaded, so `dynamax.html` sat rendered, inert and unexplained for **15.6
seconds** on 3G. At desktop speed that window is 54ms and looks fine.

```js
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 20 * 1024,
});
```

Measure the gap between *content rendered* and *the thing that explains it rendered*. Anything
that waits on the network must paint something first.

**Measure the moment you actually care about.** Timing the resolved state instead of the
first paint produced a "66-second" reading here that was pure measurement error.

## When the user reports a bug you cannot reproduce

Do not argue from a passing test. Load the live page and inspect it. Then keep going — the
reported symptom may be cached HTML (GitHub Pages serves HTML with `max-age=600`, so a stale
copy can persist for ten minutes) while a *different*, real defect sits underneath. That is
exactly what happened with the dynamax gate report.
