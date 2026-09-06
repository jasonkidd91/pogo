/**
 * ui.js — the design system. Every visible thing on this site is built here.
 *
 * Load it FIRST, before store.js: store.js's buildNav() uses el(), and every page script
 * uses the components below.
 *
 *     ui.js -> store.js -> auth.js -> data file -> page script
 *
 * ## Why this exists
 *
 * Before it, three renderers built a Pokemon card three different ways (collection.js,
 * app.js, events.js), `.day-head` was assembled four different ways — twice via innerHTML —
 * and mega-finale's filter buttons used a different attribute convention from every other
 * page's. Nothing looked wrong, which is exactly the problem: the drift was invisible until
 * one card gained a rank chip and the others silently did not.
 *
 * ## The contract
 *
 * 1. **A page never calls `document.createElement` directly.** If a component does not
 *    exist for what you need, add one here rather than hand-rolling it in a page script.
 * 2. **Structure lives here; content stays with the page.** A component decides what a card
 *    *is*; the page decides which badges go on it. Components take data, not markup.
 * 3. **Never build a component with `innerHTML` from data.** Text goes in as a string and
 *    becomes a text node. The one exception is the inline check SVG, which is a constant.
 * 4. **Class names are the styling contract with styles.css.** Do not invent one in a page
 *    script — the stylesheet will not know about it.
 *
 * ## The page skeleton
 *
 * Every page is the same five landmarks, in this order, and the CSS assumes it:
 *
 *     .wrap > header.hero
 *           > .summary        <- container in HTML, contents from UI.summary()
 *           > main
 *           > footer
 *
 * `.summary` and `header.hero` stay in the HTML rather than being generated. Two reasons,
 * both learned the hard way: `stickySummary()` in store.js binds to `.summary` at nav-build
 * time, and a shell that paints only after its script runs is the same class of bug as the
 * sign-in gate that sat invisible for 15.6s on 3G. Contents are generated; the frame is not.
 */

const ART_BASE = 'https://img.pokemondb.net/sprites/home/normal/';

/**
 * The primitive. `el('div', { class: 'x', text: 'hi' })`, plus:
 *
 *   data: {}   -> dataset          on: {}     -> addEventListener
 *   text       -> textContent      children   -> strings become text nodes
 *
 * A null/false prop or child is skipped, so `cond && el(...)` works inline. Anything that
 * is a real DOM property (className, title, href, tabIndex) is assigned; everything else
 * (aria-*, role, data-*) goes through setAttribute.
 *
 * A child of `0` is skipped too, and that is deliberate. `list.length && el(...)` evaluates
 * to the NUMBER 0 for an empty list, not to false — which shipped a stray "0" onto every
 * card that happened to have no badges. Numbers that are real content go in through `text:`
 * or UI.setStat, so nothing legitimate is lost by dropping a bare 0 here.
 */
function el(tag, props, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'data') Object.assign(node.dataset, v);
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false || kid === '' || kid === 0) continue;
    node.appendChild(typeof kid === 'object' ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

/* ---------- atoms ---------- */

/**
 * Every small label on the site. `kind` is the CSS class, so the stylesheet is the list of
 * what exists: type, energy, tag-new, tag-attack, tag-weather, tag-role, gtag, ctag, etype.
 */
function tag(kind, text, title, data) {
  return el('span', { class: kind, text, title, data });
}

/** Type badges — the coloured Grass/Poison row. `data-t` drives the colour. */
function typePills(types) {
  if (!types || !types.length) return null;
  return el('div', { class: 'types' },
    types.map((t) => tag('type', t, null, { t: t.toLowerCase() })));
}

/**
 * The battle this species is fought in — Mega Raid, Legendary Mega Raid, Primal Raid or
 * Gigantamax Battle — with its star rating. This is the class of the battle, not a claim
 * that it is in the rotation today; the data file only carries what is stable.
 */
function raidPill(p) {
  return el('div', {
    class: 'raid',
    data: { stars: String(p.stars) },
    title: `${p.raid} — ${p.stars}-star battle. Whether it is in rotation right now changes constantly.`,
  },
    el('span', { class: 'stars', text: '★'.repeat(p.stars) }),
    // "Mega Raid" -> "MEGA". The trailing noun is the same for every value in a column of
    // these, and dropping it is what keeps the six-star label on one line in a narrow card.
    p.raid.replace(/ (Raid|Battle)$/, ''));
}

/**
 * COMBAT POWER, and nothing else. S/A/B/C/D by percentile of every fully evolved Pokemon
 * and Mega in the game — S is the top 5%, D is below the median — so a B here means the
 * same as a B on any other page. "?" is a species the Game Master has no entry for yet.
 * Computed in scripts/rank.py from the game's own data, never from a tier list.
 *
 * `inline-flex` is load-bearing: `.card.caught .name` sets line-through, which propagates
 * into children, and inline-flex is what stops the letter being struck out.
 */
const RANK_TITLE = {
  S: 'Top 5% attacker of every fully evolved Pokémon and Mega in the game',
  A: 'Top 12% attacker',
  B: 'Top 25% attacker',
  C: 'Above the median attacker',
  D: 'Below-average attacker',
  '?': 'No Game Master entry yet — too new to rate',
};

function rankChip(p) {
  return el('span', {
    class: 'rank', data: { rank: p.rank }, text: p.rank,
    title: RANK_TITLE[p.rank] + (p.dps ? ` · ${p.dps} DPS` : ''),
  });
}

/**
 * The number behind the letter, and the moveset it assumes. This is the whole explanation a
 * card owes the reader — the previous prose line ("#2 of 4 Bug Megas, behind Mega Heracross
 * · 100 energy") mixed a placing and a price into something nobody was asking.
 *
 * `legacy` means the best moveset needs an Elite TM or a Community Day move, so the grade is
 * out of reach without it. That is worth a mark; the moveset alone would just be trivia.
 */
function powerLine(p) {
  if (!p.dps) return null;
  return el('div', { class: 'power' },
    el('b', { text: String(p.dps) }), ' DPS',
    p.moves && el('span', { class: 'mv' }, p.moves),
    p.legacy && el('span', {
      class: 'lg', text: '⚑',
      title: 'Needs an Elite TM or a Community Day move — the grade is out of reach without it',
    }));
}

/** Mega Energy cost. `?` where the cost is deliberately unverified, not unknown-by-accident. */
function energyPill(p) {
  const known = p.energy != null;
  return el('span', {
    class: 'energy',
    data: { e: known ? String(p.energy) : '?' },
    title: p.energyNote,
    text: known ? `${p.energy.toLocaleString()} energy` : '? energy',
  });
}

/**
 * Species artwork, keyed by name on pokemondb. `artFallback` swaps to base-species art on
 * error — the GO-original Megas have no mainline artwork to link to.
 */
function sprite(p) {
  const img = el('img', { loading: 'lazy', alt: p.name, src: ART_BASE + p.art + '.png' });
  if (p.artFallback) {
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      img.src = ART_BASE + p.artFallback + '.png';
    });
  }
  return img;
}

/** The tick in a card's corner. The only constant innerHTML on the site. */
function checkMark() {
  const box = el('div', { class: 'check' });
  box.innerHTML = '<svg viewBox="0 0 16 16"><polyline points="3,8.5 6.5,12 13,4.5"/></svg>';
  return box;
}

/* ---------- the Pokemon card ---------- */

/**
 * THE Pokemon card. Every list of Pokemon on this site renders through here — the Mega and
 * Dynamax collections, and the Mega Finale tracker's habitat grids and Super Mega Raid
 * banners. One function so a change lands everywhere at once.
 *
 * Structure, in order, with each part skipped when its data is absent:
 *
 *     [sprite]  lead · rank + name · form · types · raid · power · badges · sub   [check]
 *
 * @param p     the Pokemon. Renders `rank`, `form`, `types`, `raid` and the power line
 *              (`dps`/`moves`/`legacy`) when present.
 * @param opts  variant  'mon' (collection grids) | 'plain' (event grids) | 'super' (banner)
 *              key      Store key; defaults to p.key ?? p.id
 *              lead     small line above the name, e.g. a Super Mega Raid's tier
 *              badges   [el] for the .meta row — the page decides what belongs there
 *              sub      muted line at the bottom
 */
function monCard(p, opts = {}) {
  const key = opts.key || p.key || p.id;
  const on = Store.has(key);
  // Signed out the card still renders — it just can't be ticked. trackerToggle turns the
  // click into a sign-in prompt instead.
  const locked = Store.locked;
  const variant = opts.variant || 'mon';

  // The rank chip lives inside .name, and aria-label replaces the card's content for a
  // screen reader — so the rank has to be repeated here or it is simply not announced.
  const said = p.rank
    ? `${p.name}, rank ${p.rank}, ${RANK_TITLE[p.rank]}${p.dps ? `, ${p.dps} DPS` : ''}`
    : p.name;

  const hit = () => { trackerToggle(key); };
  const card = el('div', {
    class: (variant === 'super' ? 'super' : variant === 'mon' ? 'card mon' : 'card')
      + (on ? ' caught' : ''),
    tabIndex: locked ? -1 : 0,
    role: 'checkbox',
    'aria-checked': String(on),
    'aria-disabled': locked ? 'true' : null,
    'aria-label': locked ? `${said}, sign in to track`
                         : `${said}, ${on ? 'caught' : 'not caught'}`,
    on: {
      click: hit,
      keydown: (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hit(); }
      },
    },
  },
    sprite(p),
    el('div', { class: 'body' },
      opts.lead && el('div', { class: 'tier', text: opts.lead }),
      el('div', { class: 'name' },
        // A real space, not just the chip's margin, so copied text reads "S Mega Gengar".
        p.rank && rankChip(p), p.rank && ' ', p.name),
      p.form && el('div', { class: 'form', text: p.form }),
      typePills(p.types),
      p.raid && raidPill(p),
      powerLine(p),
      opts.badges?.length > 0 && el('div', { class: 'meta' }, opts.badges),
      opts.sub && el('div', { class: 'note', text: opts.sub })),
    checkMark());
  return card;
}

/* ---------- layout ---------- */

/** The heading above a group of cards: title, a muted note, and a progress count. */
function sectionHead({ title, meta, count }) {
  return el('div', { class: 'day-head' },
    el('h2', { text: title }),
    meta && el('span', { class: 'date', text: meta }),
    count && el('span', { class: 'count', text: count }));
}

/** A card grid. 'wide' is the collection pages' roomier column; 'events' is the event grid. */
function grid(kind, kids) {
  const cls = kind === 'wide' ? 'grid wide' : kind === 'events' ? 'egrid' : 'grid';
  return el('div', { class: cls }, kids || []);
}

/** What a list says when a filter matches nothing. Always a sentence, never a blank area. */
function empty(text) {
  return el('p', { class: 'empty', text });
}

/**
 * Draw the eye to a panel that answers what was just clicked — the sign-in gate when a
 * locked card is ticked, the reminders panel when a signed-out "Remind me" is pressed.
 * Scrolls it into view, pulses its border, and focuses its first control.
 *
 * Generic on purpose: it is an interaction, not an auth thing, and the second caller is
 * what proved that. `.flash` respects prefers-reduced-motion in styles.css.
 */
function flash(node) {
  if (!node) return;
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  node.classList.remove('flash');
  void node.offsetWidth;                 // restart the animation
  node.classList.add('flash');
  node.querySelector('button, a')?.focus({ preventScroll: true });
}

/** Footer source links — where the numbers on this page came from. */
function sources(intro, links, note) {
  return el('div', { class: 'srcs' },
    intro && el('span', { text: intro }),
    links.map((l) => el('a', { href: l.href, text: l.label })),
    note && el('span', { text: note }));
}

/* ---------- the summary bar ---------- */

/**
 * Everything between the hero and the list: the stat row, the progress bar, the search box
 * and the filter chips. Pages declare it instead of hand-writing forty lines of markup, so
 * every page's chips carry the same attributes and `activeFilter()` works the same way on
 * all of them.
 *
 * The `.summary` element itself must already exist in the HTML — see the note at the top.
 *
 * @param target  selector or element for the .summary container
 * @param cfg     stats   [{ id, label, tone: 'ok'|'hl' }]  — value is filled in by render()
 *                bar     true to add a progress bar (its <i> gets id="bar")
 *                search  { placeholder, label } — omit for pages with no search
 *                reset   true to add the Reset button
 *                filters [{ label, group, options: [[value, text], ...] }]
 *                        The FIRST option of each group is the pressed default.
 */
function summary(target, cfg) {
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root) throw new Error('UI.summary: no .summary container in the page');

  root.appendChild(el('div', { class: 'stats' },
    (cfg.stats || []).map((s) => el('div', { class: 'stat' + (s.tone ? ' ' + s.tone : '') },
      el('div', { class: 'num', id: s.id, text: '0' }),
      el('div', { class: 'lbl', id: s.labelId, text: s.label })))));

  if (cfg.bar) root.appendChild(el('div', { class: 'bar' }, el('i', { id: 'bar' })));

  const resetButton = () => cfg.reset && [
    el('span', { class: 'spacer' }),
    el('button', { id: 'reset', class: 'danger', text: 'Reset' }),
  ];

  if (cfg.search) {
    root.appendChild(el('div', { class: 'controls' },
      el('input', {
        id: 'search', class: 'search', type: 'search',
        placeholder: cfg.search.placeholder, 'aria-label': cfg.search.label,
      }),
      resetButton()));
  }

  (cfg.filters || []).forEach((row, n) => {
    root.appendChild(el('div', { class: 'controls' },
      el('span', { class: 'chip-label', text: row.label }),
      row.options.map(([value, text], i) => el('button', {
        text,
        data: { group: row.group, filter: value },
        'aria-pressed': String(i === 0),
      })),
      // With no search box there is no row for Reset to sit on, and giving it one of its
      // own leaves a visibly empty strip. It rides the first chip row instead.
      !cfg.search && n === 0 && resetButton()));
  });

  if (!cfg.search && !cfg.filters?.length && cfg.reset) {
    root.appendChild(el('div', { class: 'controls' }, resetButton()));
  }
  return root;
}

/* ---------- filter + search plumbing ---------- */

/** Wires up the search box, the filter chips and Reset. One handler for every page. */
function setupControls({ onChange, prefix, resetPrompt }) {
  const search = document.getElementById('search');
  if (search) search.addEventListener('input', onChange);

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      document.querySelectorAll(`[data-group="${group}"]`)
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      onChange();
    });
  });

  const reset = document.getElementById('reset');
  if (reset) {
    reset.addEventListener('click', () => {
      if (Store.locked) return Auth.prompt();
      if (confirm(resetPrompt || 'Clear tracked progress on this page? This cannot be undone.')) {
        Store.clear(prefix);
      }
    });
  }
  Store.onChange(onChange);
}

/** Which chip is pressed in a group. 'all' when the group does not exist on this page. */
function activeFilter(group) {
  return document.querySelector(`[data-group="${group}"][aria-pressed="true"]`)?.dataset.filter || 'all';
}

function searchText() {
  return (document.getElementById('search')?.value || '').trim().toLowerCase();
}

/** The shared Show filter: all / need / have, against a Store key. */
function statusMatch(key, mode) {
  if (mode === 'need') return !Store.has(key);
  if (mode === 'have') return Store.has(key);
  return true;
}

/** The Show chips, identical on every tracker page. */
const STATUS_FILTER = {
  label: 'Show', group: 'status',
  options: [['all', 'All'], ['need', 'Still needed'], ['have', 'Collected']],
};

/**
 * The Match chips: search one name, or the whole evolution family. Both collection pages
 * carry it, so it lives here rather than being declared twice.
 */
const FAMILY_FILTER = {
  label: 'Match', group: 'match',
  options: [['exact', 'Exact'], ['family', 'Whole family']],
};

/**
 * Does this entry match what is in the search box?
 *
 * @param p       the entry; `p.fam` is its evolution family, generated from the Game Master
 * @param fields  the page's own searchable strings — name, typing, moveset, whatever it
 *                decided is worth finding by
 *
 * With the Match chip set to 'family' an entry also matches when any species in its family
 * does, which is what makes searching "weedle" find Mega Beedrill. A page without the chip
 * gets 'all' from activeFilter and therefore exact matching, so adding the chip is opt-in.
 *
 * `fam` is absent on a species that is its own whole family — a third of the Mega roster —
 * so the `|| []` is the normal path, not a defensive one.
 */
function searchMatch(p, fields) {
  const q = searchText();
  if (!q) return true;
  if (fields.some((f) => f && String(f).toLowerCase().includes(q))) return true;
  return activeFilter('match') === 'family' && (p.fam || []).some((n) => n.includes(q));
}

/** Sets a stat's number. Pass `of` for the "3 / 63" form. */
function setStat(id, value, of) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = typeof value === 'number' ? value.toLocaleString() : String(value);
  if (of != null) node.appendChild(el('small', { text: ` / ${of}` }));
}

function setBar(done, total) {
  const bar = document.getElementById('bar');
  if (bar) bar.style.width = `${total ? (done / total) * 100 : 0}%`;
}

const UI = {
  el, tag, typePills, raidPill, rankChip, powerLine, energyPill, sprite, checkMark,
  monCard, sectionHead, grid, empty, sources, flash,
  summary, setupControls, activeFilter, searchText, statusMatch, searchMatch,
  STATUS_FILTER, FAMILY_FILTER,
  setStat, setBar, ART_BASE,
};
