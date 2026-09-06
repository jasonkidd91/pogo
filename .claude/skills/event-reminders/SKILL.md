---
name: event-reminders
description: Remind me on the events page and the Mega Finale habitat windows, and the notifications.html setup page behind them — scheduled push via ntfy.sh, the subscription the whole feature depends on, the topic that acts as the user's password, and the three-day scheduling limit that shapes the design. Use when a reminder does not arrive, when changing what a notification says or when it fires, when working on web/remind.js, web/notifications.js or a page's reminder button, or when extending reminders to another page.
---

# Event reminders

Signed in, every event on the front page that has not started carries a **Remind me** button.
It arms up to three push notifications delivered by [ntfy.sh](https://ntfy.sh).

| File | Owns |
|---|---|
| `web/remind.js` | The whole feature: protocol, state machine, **and both renderings**. Its header is the spec. |
| `web/notifications.html` / `.js` | The setup page, and the list of every reminder on the account |
| `web/events.js` | The event-row button's shape |
| `web/app.js` | The Mega Finale habitat-window pill's shape, and the finished-event state |
| `web/store.js` | `reminders` and `ntfyTopic` on the account, and the immediate-write path |
| `web/auth.js` | `saveNow()` — an awaited, merging Firestore write |

**Both renderings live in `remind.js`, not in a page.** Copying either into a page is exactly
the drift the design system exists to stop:

- `Remind.setup(target)` — the whole how-to, on `notifications.html`.
- `Remind.panel(target, opts)` — the strip on a page that *has* reminder buttons: what a
  reminder is, how many are set, the topic with a Copy button, a link to the setup page. **No
  steps.** They were there once and they are 300px of instructions above the thing the trainer
  came for.

What a page *does* own is its button: `Remind.buttonState(id)` hands over the three states and
their wording, and the page decides the shape — a link-row button on the events page, a
tappable time pill on Mega Finale. Add a third caller the same way; do not re-derive the
wording.

## What arrives, and when

Each message is included only if it is still genuinely ahead. ntfy **rejects** a delay in the
past (40004) rather than delivering it late, so a shot that has already passed is dropped in
`schedule()` rather than sent at the wrong time:

| Fires | Title | Included when |
|---|---|---|
| `start - 24h` | *Tomorrow: X* | the event is more than **2 days** away |
| `start - 15m` | *In 15 minutes: X* | the start is more than 15 minutes away |
| `start` | *Starting now: X* | always (a past event cannot be armed at all) |

**The two-day floor on the day-before message is what keeps it from being noise.** An event 30
hours out would otherwise get a "tomorrow" push six hours from now on top of the other two,
all inside the same afternoon; below that floor the 15-minute heads-up is the whole warning,
which is what it is for. It also makes the wording safe: exactly 24h before a start is always
the previous calendar day — a DST change makes it 23 or 25 wall-clock hours, never enough to
land on the same day.

Habitat windows on `mega-finale.html` are never more than a day or so out, so in practice only
the events page ever sends the day-before message. That is not a special case in the code.

`SHOTS` is the list of sequence-ID suffixes (`-d`, `-p`, `-a`), and `clear()` and `rotate()`
iterate it. **A fourth message added to `schedule()` and forgotten there is a push nobody can
cancel** — add it to `SHOTS` in the same edit.

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
| Rate limit: 60 requests burst, 1 per 5s refill, 250 messages/day | `reconcile()` schedules at most `PER_LOAD` (6) per page load — **each reminder costs up to three publishes**, so that is 18 requests, not 6 |
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

## Setting a reminder is not the same as receiving one

ntfy has no accounts and no address book: it delivers to a **subscription**. Nothing arrives
anywhere until the trainer installs the app and subscribes to *their* topic. The feature
shipped without saying that once, and the result was a button that silently did nothing.

**The how-to is `notifications.html`, and it is in the nav.** It was briefly folded into the
events page's panel, which is wrong for one reason: reminders are armed from any page with
something time-boxed on it, and instructions pinned to whichever list grew buttons first make
every other page's button look self-explanatory when it is not. A page with buttons links to
the setup page; it does not restate it.

The page carries: the topic in its own labelled row with a **Copy** button, three numbered
steps (install · subscribe · test), app links for iPhone, Android and F-Droid, `Send a test`,
and **every reminder on the account with a Cancel**.

Four things that follow and should not be undone:

- **A signed-in trainer gets a topic minted on sight of either rendering** (`primeTopic()`),
  not on first use. The setup is read *before* the first reminder, so step 2 cannot be blank.
  One Firestore write, once in the life of an account.
- **The topic is fixed for the life of the account.** `rotate()` is in the API and is
  deliberately **not** a button: it would sit beside the one string the trainer just pasted
  into the ntfy app, and pressing it to see what it does silently ends every future
  notification with nothing on screen to say so. Break glass only for a topic that leaked.
- **`Open in ntfy app` renders on Android only.** `ntfy://<host>/<topic>?display=<name>` is
  documented as an *Android* deep link. It shipped unconditionally once; on iOS and on every
  desktop it is a control that does nothing at all — no error, no app, no clue why. Guard it
  with `isAndroid()`, and let step 2 mention the one-tap path only where it exists.
- **Nothing refers to a button "below".** The actions column sits to the right on a desktop
  and underneath on a phone, and half of those sentences were wrong on one of them.

**The reminder list is not decoration.** A reminder is otherwise only cancellable from the
page that set it, and the events feed rotates — an event that drops out takes its button with
it and leaves a notification nobody can stop. `Remind.clearKey(k)` cancels by the stored key,
which is all this list has; `clear(eventId)` is now a one-line wrapper over it.

`Send a test` is the diagnostic everything points at: it publishes immediately, so a missing
subscription is found before an event depends on it.

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
| `notifications.html` | no arming here — the setup, and a **Cancel** per reminder | — |

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

1. **Is the topic subscribed to in the ntfy app?** Nothing arrives otherwise, and this is by
   far the most common answer. *Send a test* on `notifications.html` is exactly this check;
   use it first, and read the three steps beside it.
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
exactly 900s before the start; a 6-hour event gets **no** `-d` message; an event 60 hours out
(inside ntfy's window *and* past the two-day floor) gets all three, with the day-before one
exactly 86400s before the start; an event 5 minutes out gets the start message *only*; an
event 10 days out is armed with nothing on the server; `reconcile()` promotes it once the
stored start moves inside the window; cancelling removes **every** message; cancelling twice
is not an error; `rotate()` drains the old topic. **Wait for the server** before asserting a poll —
a publish is not visible for a second or two, and polling immediately reads an empty topic
and fails every assertion for a reason unrelated to the code.

In a browser, signed out, assert the events page did not grow a gate, that Remind me reveals
and flashes the strip, and that nothing was published. Stub the account for the signed-in
states and **measure the contrast** of every button state — see `verify-site`.

The strip's own assertions: it links to `notifications.html`, it still says a reminder with no
subscription behind it arrives nowhere, it shows the topic and a Copy button, and it does
**not** repeat the three steps.

The setup page's: three steps, three https app links, a topic row with a Copy button, a test
button, the credential warning in plain text, no *New topic* button, **no `ntfy://` link on a
desktop and exactly one under an Android user-agent** in the documented form, the reminder
list sorted soonest-first with Scheduled/Waiting states, Cancel calling `clearKey`, the empty
state, and `Store.setTopic` called once when a signed-in account has no topic yet.

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
