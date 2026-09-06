---
name: design-system
description: The pogo site's shared UI layer — web/ui.js components and the styles.css token/class contract. Use when adding or changing anything visible (a card, pill, badge, filter chip, stat row, section heading, empty state, page layout), when a page renders inconsistently with the others, when tempted to write document.createElement or innerHTML in a page script, or when building a new page.
---

# The design system

Two files, one contract:

| File | Owns |
|---|---|
| `web/ui.js` | Every DOM node the site renders — components, and the `el()` primitive |
| `web/styles.css` | The tokens and the classes those components emit |

`ui.js` loads **first** on every page, before `store.js`, because `buildNav()` uses `el()`:

```
ui.js -> store.js -> auth.js -> data file -> page script
```

## The rules

1. **A page never calls `document.createElement` or `innerHTML`.** If the component you need
   does not exist, add it to `ui.js`. This is checkable:

   ```bash
   grep -n 'createElement\|innerHTML' web/*.js web/*.html | grep -v '^web/ui.js'
   ```

   The only allowed hit is a **constant** SVG — the check mark in `ui.js`, the Google G in
   `auth.js`. Never data.
2. **Structure lives in `ui.js`; content stays with the page.** `UI.monCard` decides what a
   card *is*; the page decides which badges go on it. Components take data, not markup.
3. **Class names are the contract with `styles.css`.** Do not invent one in a page script —
   the stylesheet will not know about it. Add a class and its component together.
4. **Use the tokens.** `--sp-*` spacing, `--r-*` radii, `--fs-*` type sizes, plus the colour
   set. A new hard-coded `12px` that should have been `var(--sp-4)` is how a design system
   rots.

## What exists

```
el(tag, props, ...kids)          the primitive — see its doc comment

UI.tag(kind, text, title, data)  any small label
UI.typePills(types)              the coloured Grass/Poison row
UI.raidPill(p)                   battle class + stars
UI.rankChip(p)                   the S/A/B/C/D combat-power grade
UI.powerLine(p)                  the DPS number and the moveset behind that grade
UI.energyPill(p)                 Mega Energy cost
UI.sprite(p)                     species art, with artFallback handling
UI.checkMark()                   the corner tick

UI.monCard(p, opts)              THE Pokemon card — every list uses it
UI.sectionHead({title,meta,count})
UI.grid(kind, kids)              'default' | 'wide' | 'events'
UI.empty(text)
UI.sources(intro, links, note)

UI.flash(node)                   pulse a panel that answers what was just clicked

UI.summary(target, cfg)          stats + bar + search + Reset + filter chips
UI.setupControls({onChange, prefix, resetPrompt})
UI.activeFilter(group) · UI.searchText() · UI.statusMatch(key, mode) · UI.STATUS_FILTER
UI.setStat(id, value, of) · UI.setBar(done, total)
```

## The page skeleton

Five landmarks, same order on every page. The CSS and `verify-site` both assume it:

```html
<div class="wrap">
  <header class="hero"> …eyebrow, h1, sub… </header>
  <div class="summary"></div>     <!-- empty: UI.summary() fills it -->
  <main id="…"></main>
  <footer> …prose and sources… </footer>
</div>
```

**`header.hero` and the `.summary` container stay in the HTML.** Only `.summary`'s *contents*
are generated. Two reasons, both learned the hard way here: `stickySummary()` binds to
`.summary` when the nav is built, and a frame that paints only after its script runs is the
same class of bug as the sign-in gate that sat invisible for 15.6 s on 3G.

A page script then declares its summary rather than hand-writing forty lines of markup:

```js
UI.summary('.summary', {
  stats: [{ id: 's-have', label: 'Collected', tone: 'ok' }, …],
  bar: true,
  search: { placeholder: 'Search a Mega…', label: 'Search Mega Pokémon' },
  reset: true,
  filters: [UI.STATUS_FILTER, { label: 'Cost', group: 'cost', options: [['all','Any'], …] }],
});
```

The **first option of each group is the pressed default**. With no search box, Reset rides the
first chip row — giving it a row of its own leaves a visibly empty strip.

## Adding a component

1. Write the builder in `ui.js` with a doc comment saying what it is *for*, not what it does.
2. Add its class to `styles.css`, under the matching section, using tokens.
3. Add it to the component index at the top of `styles.css` — that table is the map between
   the two files and is the first thing a future session reads.
4. Add an assertion to the design-system check in `verify-site` if it has an invariant.

A component that is *generic* goes in `ui.js`; one that belongs to a single page is built in
that page's script **from `UI.el`/`UI.tag`**, which is why `.ecard`, `.erow` and `.remindbox`
live in `events.js`. `UI.flash()` moved the other way and is the example to follow: it started
as auth.js's "flash the sign-in gate", and the moment a second page needed to point at a
different panel it became a primitive rather than being copied.

## Traps

- **`list.length && el(…)` renders a literal `0`.** An empty array's `.length` is the number
  `0`, not `false`, and JSX-style `&&` guards leak it into the DOM. This shipped a stray "0"
  onto every card with no badges. `el()` now skips a `0` child for exactly this reason, and
  guards should still be written `list.length > 0 &&` so the intent is visible.
- **`aria-label` replaces a card's content for a screen reader.** Anything rendered inside the
  card that matters — the rank chip especially — has to be repeated in the label or it is
  announced to nobody.
- **`text-decoration` propagates into children and cannot be removed by them.** `.card.caught
  .name` sets `line-through`; the rank chip escapes it only because it is `inline-flex`.
- **Whitespace between elements is not the same as a text node you appended.** Where a label
  and a sentence sit side by side, append `' ' + text`, or copied text and screen readers run
  them together — "EVENT ONLYShiny Armored Mewtwo…".
- **A collected card dims its own body, so anything low-contrast inside it disappears.** The
  rank chips were translucent or hollow for B, C and D and became unreadable once ticked. Every
  grade is a filled chip clearing **4.5:1**, and the chip barely dims — a browser check measures
  the ratio rather than trusting the eye.
- **`[hidden]` loses to any class that sets `display`.** The UA rule is `display: none` at
  the lowest possible specificity, so `.remindbox { display: flex }` silently beat it and a
  panel that had set `el.hidden = true` stayed on screen. `[hidden] { display: none
  !important }` sits with the reset at the top of `styles.css` for exactly this. Toggling
  `el.hidden` is the right way to show and hide a panel; that line is what makes it work.
- **Card text costs more than it looks.** Anything on a card is read on every card. The rank
  line used to carry a placing and a price — "#2 of 4 Bug Megas, behind Mega Heracross · 100
  energy" — and it was noise. It is now the number and the moveset, nothing else.

## Verifying a change

Any change here touches every page, so prove it changed only what you meant. Serve the
committed version beside the working tree and diff the pixels:

```bash
git worktree add /tmp/baseline HEAD
python3 -m http.server 8778 --directory /tmp/baseline/web &
python3 -m http.server 8777 --directory web &
# screenshot both at 1200px and 390px, then compare
```

When `ui.js` was introduced, `index.html`, `dynamax.html` at 1200px and `megas.html` at 390px
came out **pixel-identical**, and the only intended differences were on `mega-finale.html`.
That is the standard to hold a refactor to. Then run the `verify-site` suite, including the
design-system checks and the throttled-3G first-paint measurement — `ui.js` is another blocking
script, and its cost was measured at ±57 ms, i.e. noise. Re-measure if it grows.
