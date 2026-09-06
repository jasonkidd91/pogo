---
name: event-reminders
description: Remind me on the events page and the Mega Finale habitat windows — scheduled push notifications via ntfy.sh, the topic that acts as the user's password, and the three-day scheduling limit that shapes the whole design. Use when a reminder does not arrive, when changing what a notification says or when it fires, when working on web/remind.js or a page's reminder button, or when extending reminders to another page.
---

# Event reminders

Signed in, every event on the front page that has not started carries a **Remind me** button.
It arms two push notifications — one 15 minutes before the event starts, one as it begins —
delivered by [ntfy.sh](https://ntfy.sh).

| File | Owns |
|---|---|
| `web/remind.js` | The whole feature: protocol, state machine, **and the setup panel**. Its header is the spec. |
| `web/events.js` | The event-row button's shape |
| `web/app.js` | The Mega Finale habitat-window pill's shape, and the finished-event state |
| `web/store.js` | `reminders` and `ntfyTopic` on the account, and the immediate-write path |
| `web/auth.js` | `saveNow()` — an awaited, merging Firestore write |

**The panel lives in `remind.js`, not in a page.** Two pages render it, and copying it into
each is exactly the drift the design system exists to stop. What a page *does* own is its
button: `Remind.buttonState(id)` hands over the three states and their wording, and the page
decides the shape — a link-row button on the events page, a tappable time pill on Mega
Finale. Add a third caller the same way; do not re-derive the wording.

## The one fact that shapes everything

**ntfy will not accept a scheduled message more than three days ahead** (HTTP 400, code
40006). Most events on that page are further out than that. There is no server in this
project, so a reminder cannot simply be handed over when it is set.

So a reminder has two states, and the UI shows which one you have:

- **armed** — recorded on the account. *Nothing exists on ntfy.* Button is amber and dashed.
- **scheduled** — handed to ntfy, pending on their server. Button is green and solid.

`reconcile()` promotes armed → scheduled on every page load, for anything now inside the
window. The honest consequence, stated in the panel and the footer: an event more than three
days out needs the page opened once inside its last three days. Do not quietly drop that
sentence — it is the difference between a feature and a promise that silently fails.

## Verified server behaviour — do not re-derive it from memory

Every one of these was checked against ntfy.sh, and every one fails as a 400 with a code
rather than as a wrong delivery time:

| Behaviour | Consequence in the code |
|---|---|
| Max delay 3 days (40006) | `WINDOW_MS` is **71h**, not 72 — the server checks against *its* clock, and a browser running fast would be rejected exactly at the boundary |
| Min delay 10s (40005) | `MIN_DELAY_MS` is 60s |
| A past delay is **rejected**, not clamped (40004) | The 15-minute message is *skipped* when the event is already closer than that, never sent late |
| `GET /<topic>/<sid>/delete` returns 200 whether or not anything was pending | Cancelling twice, or cancelling something never scheduled, needs no special case |
| Re-publishing a sequence ID **replaces** the pending message | A double tap cannot produce two notifications |
| Rate limit: 60 requests burst, 1 per 5s refill, 250 messages/day | `reconcile()` schedules at most `PER_LOAD` (8) per page load |
| A publish is not visible to `?poll=1&sched=1` for a second or two | Only matters when testing — see Verify |

## CORS: why the calls look the way they do

Both operations are deliberately **CORS-simple requests**, so the browser never sends a
preflight:

```js
POST https://ntfy.sh/          // JSON in the body, NO headers set at all
GET  https://ntfy.sh/<topic>/<sid>/delete
```

`fetch` labels a string body `text/plain;charset=UTF-8`, which is safelisted. Publishing the
documented way instead — `X-Delay` headers to `/<topic>`, `DELETE` to cancel — works
perfectly by curl and adds an OPTIONS round-trip here. **Do not "tidy" this into headers, and
do not add a `Content-Type`.**

`Access-Control-Allow-Origin: *` is returned on all of it, so failures are readable.

## The topic is the password

ntfy has no accounts: anyone who knows a topic can read it *and publish to it*. So the topic
is generated from `crypto.getRandomValues` (80 bits) and kept at `users/{uid}.ntfy.topic`,
which `firestore.rules` already covers — no rules change was needed for this feature.

**Do not switch it to the Firebase uid, or a slice of one.** A uid cannot be rotated: it is
printed in the Auth console, and once it leaks the user is stuck with a topic strangers can
publish to for the life of the account. `rotate()` exists precisely because a generated topic
can be replaced — it drains the old topic first, then re-arms everything onto the new one.

## Two orderings, chosen so a half-failure errs the safe way

```
set:    publish to ntfy FIRST, then write Firestore
cancel: write Firestore FIRST, then delete at ntfy
```

A partial failure should leave a notification that fires when it need not — noticeable and
recoverable — never a UI claiming a reminder that will never arrive, which is silent and gets
planned around. Sequence IDs are derived from the event id (FNV-1a), not stored, so a
reminder can always be cancelled even if the write that recorded it never landed.

## Time

The delay goes over as **epoch seconds**, never a wall-clock string. Half the feed's stamps
are local wall-clock and half are UTC instants with a trailing `Z`; `new Date()` already
resolves both correctly, and turning that moment back into text for ntfy's natural-language
parser to re-read is how a Community Day reminder would land an hour out. See the TIME note
at the top of `events.js`.

## Where the buttons are

| Page | Control | What is reminded |
|---|---|---|
| `index.html` | a button in each upcoming event's link row | that event starting |
| `mega-finale.html` | the habitat **time pill**, when that window is still ahead | that habitat window opening |

The Mega Finale pills carry the habitat's Pokémon into the notification (`note` on
`Remind.set`). A push is read on a lock screen, away from the page, and "Jungle habitat" on
its own is not something you can act on.

## A tracker outlives its event

The Mega Finale page keeps working long after the event ends, and it has to say so rather
than sit there looking like a list you could still go and complete. `app.js` derives
`EVENT_END` from the habitat windows themselves — nothing is hard-coded — and:

- a **past** window is drawn struck through and unfilled; a window that is **open now** is
  green and *not* a button, because there is nothing left to be reminded about;
- once the last window closes, a banner says when it finished and points at What's on, no
  window is tappable, and the reminders panel is hidden entirely (`Remind.panel(..., { hidden })`);
- **the ticks stay.** Past the event this page is the record of what you caught, and wiping
  it would be the wrong answer to "it's over". Reset is still there for anyone who wants it.

## Things that look like omissions but aren't

- **The events page has no sign-in gate and must not grow one.** Browsing is the whole point
  of it. The reminders panel does the asking instead, and signed out it is not rendered at
  all until someone presses Remind me — then `UI.flash()` points at it.
- **Live events get no button.** A reminder for something already running is nothing to act
  on.
- **Reminders are not on the collection pages.** `megas.html` and `dynamax.html` list species,
  not scheduled things — there is no time to be reminded about. `remind.js` loads on
  `index.html` and `mega-finale.html` only.
- **A finished event's reminder is pruned** by `reconcile()` after a day, or the account
  document grows forever.

## A reminder did not arrive

In this order — the first two are almost always it:

1. **Is the topic subscribed to in the ntfy app?** Nothing arrives otherwise. This is what
   *Send a test* in the panel is for; use it first.
2. **Was it still `armed`?** An amber dashed button means ntfy never had it. If the page was
   not opened inside the last three days, that is working as designed.
3. Poll the topic for what is actually pending:
   `curl -s "https://ntfy.sh/<topic>/json?poll=1&sched=1"`
4. Check the browser console for a 400 from ntfy — the error body names the limit.
5. Only then suspect the code.

## Verify

The state machine is testable without a browser and should be, because Google sign-in is not
reachable from a headless one. Stub `Store` and drive `remind.js` directly against ntfy.sh,
asserting **what is on the server** via `?poll=1&sched=1` rather than that `fetch` resolved:

```js
const src = fs.readFileSync('web/remind.js', 'utf8');
const Remind = new Function('Store', 'console', src + '\n;return Remind;')(fakeStore, console);
```

Worth asserting, all of which have a real failure mode behind them: the heads-up lands
exactly 900s before the start; an event 5 minutes out gets the start message *only*; an event
10 days out is armed with nothing on the server; `reconcile()` promotes it once the stored
start moves inside the window; cancelling removes both messages; cancelling twice is not an
error; `rotate()` drains the old topic. **Wait for the server** before asserting a poll —
a publish is not visible for a second or two, and polling immediately reads an empty topic
and fails every assertion for a reason unrelated to the code.

In a browser, signed out, assert the page did not grow a gate, that Remind me reveals and
flashes the panel, and that nothing was published. Stub the account to check the signed-in
panel and **measure the contrast** of every button state — see `verify-site`.

Three traps in testing this, all of which produced a confident wrong answer here first:

- **Stub `Remind.buttonState`, not `Remind.status`.** A page renders from the former, and it
  calls the module-private `status()` directly — replacing the exported one is not observed.
- **Faking the page clock does not fake ntfy's.** Shifting `Date` to reach a habitat window
  that has already passed in real time gets the publish rejected (40004) and the reminder
  silently never records. Anything that arms a *real* reminder needs a genuinely future time;
  use the shifted clock only for what the page renders.
- **Let the style settle.** Adding a state class and reading `getComputedStyle` in the same
  breath returned the pre-class colour here and made three passing states look like failures.

Clean up after a test run: leave nothing scheduled on a test topic.

**Space out the suites that touch ntfy.** ntfy allows 60 requests of burst per visitor and
refills one per five seconds. Running the protocol suite and the browser suite back to back
exhausts it, and the failure surfaces as a Playwright timeout rather than as a 429 — which
reads like a code bug and is not one. Run them a minute apart, or one at a time.
