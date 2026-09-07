/**
 * Events page — what is on now, what is on next.
 *
 * The point of this page is to be shorter than the official one. The feed carries a lot per
 * event; this shows the four things you act on — what it is, when it starts, when it ends,
 * and what you get — and links out for the rest.
 *
 * WHERE THE DATA COMES FROM. Events are LIVE: what is on changes daily, so a baked file
 * would be wrong within days. On every load this fetches the feed and renders that.
 * events-data.js is only the fallback shown while that request is in flight or if it fails,
 * and the footer says which of the two you are looking at.
 *
 * TIME. A stamp without a trailing Z is local wall-clock — a Community Day at 14:00 starts
 * at 14:00 wherever you are. With a Z it is a real instant, which is how GO Battle League
 * rotations are published, so it lands at a different clock time depending on where you are.
 * `new Date()` already reads both correctly; the Z only decides whether the card is marked
 * as global. Do not "fix" the parsing by appending a Z.
 *
 * REMINDERS. Every event that has not started carries a Remind me button, backed by
 * remind.js — which this file requires. The protocol, the setup panel and the three-day
 * scheduling limit all live there, because the Mega Finale page renders the same panel; what
 * lives here is the button's shape, since a link-row button and a habitat time pill are the
 * same three states drawn differently.
 *
 * Signing in is required for a reminder and for nothing else on this page, so the panel does
 * the asking and the page still has no sign-in gate.
 */

const FEED = typeof EVENTS_SOURCE !== 'undefined' ? EVENTS_SOURCE
  : 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json';

/** Short label + colour class per feed type. `heading` from the feed is the fallback. */
const TYPES = {
  'pokemon-go-fest':        { label: 'GO Fest',       cls: 'fest',  group: 'big' },
  'community-day':          { label: 'Community Day', cls: 'cday',  group: 'big' },
  'raid-day':               { label: 'Raid Day',      cls: 'raidday', group: 'big' },
  'max-battles':            { label: 'Max Battle Day', cls: 'max',  group: 'max' },
  'max-mondays':            { label: 'Max Monday',    cls: 'max',   group: 'max' },
  'raid-hour':              { label: 'Raid Hour',     cls: 'hour',  group: 'hours' },
  'pokemon-spotlight-hour': { label: 'Spotlight Hour', cls: 'hour', group: 'hours' },
  'raid-battles':           { label: 'Raids',         cls: 'raid',  group: 'raids' },
  'go-battle-league':       { label: 'Battle League', cls: 'gbl',   group: 'league' },
  'go-pass':                { label: 'GO Pass',       cls: 'bg',    group: 'big' },
  'season':                 { label: 'Season',        cls: 'bg',    group: 'big' },
  'event':                  { label: 'Event',         cls: 'event', group: 'big' },
};

/**
 * What each kind of event actually is. Titles like "Mega Squads" or "Twilight Trails" are
 * names, not descriptions, and this is the line that answers "what is this?".
 *
 * These are feature rules, not rotating content — checked against Bulbapedia's Community Day,
 * Pokémon Spotlight Hour and Max Battle articles. Deliberately no weekdays or clock times in
 * them: the cadence does move (Spotlight Hour is no longer the Tuesday it was), and the
 * weekly rhythm box works that out from the schedule instead.
 */
const WHAT_IS = {
  'pokemon-go-fest': 'GO Fest weekend — habitats rotate through the day, each with its own spawns and raids.',
  'community-day': 'Three hours of one Pokémon everywhere, an exclusive move for evolving during it, plus bonuses.',
  'pokemon-spotlight-hour': 'One hour, one Pokémon spawning everywhere, with a single bonus attached.',
  'raid-hour': 'One hour when nearly every gym runs the featured raid boss.',
  'raid-day': 'A short window when one boss takes over raids.',
  'max-mondays': 'One featured Dynamax boss takes over Power Spots — spend Max Particles to battle and catch it.',
  'max-battles': 'A day built around Max Battles at Power Spots.',
  'raid-battles': 'The raid rotation — this boss is in raids for the window shown.',
  'go-battle-league': 'The PvP rotation — which leagues and cups are open this week.',
  'season': 'A months-long season. Spawns, eggs and bonuses shift with it.',
  'go-pass': 'A reward track you work through by playing during the month.',
  'event': 'A limited-time event with its own spawns, bonuses and research.',
};

/**
 * The easy-to-miss things, labelled. The sentence itself is quoted from the event's page by
 * scripts/update_events.py — these are just the short labels that make one scannable.
 *
 * `move` is the one that actually costs you something: the exclusive-move deadline is often
 * a different time from the end of the event, and an evolution made late cannot be redone.
 */
const CAVEAT = {
  move:     { label: 'Evolve in time', mark: '⏳' },
  window:   { label: 'Different window', mark: '⏳' },
  only:     { label: 'Event only', mark: '⚠' },
  rare:     { label: 'Rarely available', mark: '⚠' },
  regional: { label: 'Region-locked', mark: '🌍' },
  debut:    { label: 'Debut', mark: '✦' },
  costume:  { label: 'Costume', mark: '✦' },
  shiny:    { label: 'Shiny boosted', mark: '✦' },
};

/** The event page's own contents list, in plain words. */
const HAS_LABEL = {
  bonuses: 'Bonuses', spawns: 'Wild spawns', eggs: 'Eggs', raids: 'Raids',
  research: 'Research', moves: 'New moves', shiny: 'New Shinies',
};

/**
 * Events that have a catch-list tracker on this site, by feed id. Deliberately sparse —
 * a tracker page is built on request, not for every event that comes along.
 */
const TRACKERS = {
  'pokemon-go-fest-2026-mega-finale': { href: 'mega-finale.html', label: 'Catch tracker' },
  'mega-squads': { href: 'mega-squads.html', label: 'Catch tracker' },
};

/** Long-running background things. They matter, but not in the same list as a 3-hour event. */
const BACKGROUND = new Set(['season', 'go-pass']);

const DAY = 86400000;

/**
 * Blurbs are scraped per event by scripts/update_events.py and live in the snapshot; the feed
 * itself carries no description. So the live list is merged with the snapshot by id, and
 * anything announced since the snapshot was generated falls back to its WHAT_IS line.
 */
const described = new Map();

let events = [];
let source = 'snapshot';   // snapshot | live | stale
let checkedAt = typeof EVENTS_FETCHED !== 'undefined' ? EVENTS_FETCHED : null;

/* ---------- time ---------- */

const at = (s) => (s ? new Date(s) : null);
const isGlobal = (s) => typeof s === 'string' && s.endsWith('Z');

const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtDay = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Midnight-to-midnight difference, so "tomorrow" doesn't depend on the time of day. */
function daysApart(a, b) {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((y - x) / DAY);
}

/** "in 2 days", "in 3 h", "in 12 min" — the coarsest unit that is still useful. */
function rel(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'any moment';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.round(hrs / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

/** "Today", "Tomorrow", then the weekday. */
function dayLabel(d, now) {
  const diff = daysApart(now, d);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return fmtDay(d);
}

/**
 * The window in words. One day: "Sat 5 Sep, 10:00 – 18:00". Across days: both dates.
 * A missing end is common for open-ended entries.
 */
function windowText(e) {
  const s = at(e.start);
  const t = at(e.end);
  if (!t) return `${fmtDay(s)}, ${fmtTime(s)}`;
  if (sameDay(s, t)) return `${fmtDay(s)}, ${fmtTime(s)} – ${fmtTime(t)}`;
  return `${fmtDay(s)} ${fmtTime(s)} – ${fmtDay(t)} ${fmtTime(t)}`;
}

/* ---------- classify ---------- */

function describe(e) {
  const extra = described.get(e.id);
  return {
    about: extra?.blurb || null,
    has: extra?.has || null,
    caveats: extra?.caveats || null,
  };
}

/** Heads-up block. Each line is the source's own sentence, with a short label in front. */
function caveatBlock(list) {
  return UI.el('div', { class: 'ecaveats' }, list.map((c) => {
    const info = CAVEAT[c.k] || { label: 'Note', mark: '⚠' };
    // The label and the sentence are separated by a real space, not just the tag's margin —
    // otherwise a screen reader and anyone copying the text get "EVENT ONLYShiny Armored…".
    return UI.el('p', { class: 'ecaveat', data: { k: c.k }, title: c.t },
      UI.tag('ctag', `${info.mark} ${info.label}`), ' ' + c.t);
  }));
}

function typeInfo(e) {
  return TYPES[e.type] || { label: e.heading || 'Event', cls: 'event', group: 'big' };
}

function activeGroup() {
  return UI.activeFilter('kind');
}

function passesFilter(e) {
  const f = activeGroup();
  return f === 'all' || typeInfo(e).group === f;
}

function classify(now) {
  const out = { background: [], live: [], soon: [], later: [] };
  for (const e of events) {
    const s = at(e.start);
    const t = at(e.end) || s;
    if (!s) continue;
    if (t < now) continue;                         // finished
    if (BACKGROUND.has(e.type)) { out.background.push(e); continue; }
    if (s <= now) out.live.push(e);
    else if (daysApart(now, s) <= 7) out.soon.push(e);
    else out.later.push(e);
  }
  // Running now first (soonest to end), then the ones that have not started.
  out.background.sort((a, b) => {
    const aFuture = at(a.start) > now, bFuture = at(b.start) > now;
    if (aFuture !== bFuture) return aFuture ? 1 : -1;
    return aFuture ? at(a.start) - at(b.start)
                   : at(a.end || a.start) - at(b.end || b.start);
  });
  out.live.sort((a, b) => at(a.end || a.start) - at(b.end || b.start));
  out.soon.sort((a, b) => at(a.start) - at(b.start));
  out.later.sort((a, b) => at(a.start) - at(b.start));
  return out;
}

/* ---------- pieces ---------- */

function typePill(e) {
  const info = typeInfo(e);
  return UI.tag('etype', info.label, null, { k: info.cls });
}

/** The one line of detail worth carrying over from the feed, if there is one. */
function detailText(e) {
  const bits = [];
  if (e.bonus) bits.push(e.bonus);
  // "Armored Mewtwo in 5-star Raid Battles" does not need "Armored Mewtwo" repeated under it.
  const mons = (e.mons || []).filter((m) => !e.name.toLowerCase().includes(m.toLowerCase()));
  if (mons.length) {
    bits.push(mons.length > 4 ? `${mons.slice(0, 4).join(', ')} +${mons.length - 4} more`
      : mons.join(', '));
  }
  if (e.bonuses?.length) bits.push(e.bonuses.join(' · '));
  return bits.join(' — ');
}

function linkOut(e) {
  return UI.el('a', { class: 'elink', href: e.link, target: '_blank', rel: 'noopener',
                      text: 'Details' });
}

function trackerLink(e) {
  const t = TRACKERS[e.id];
  return t && UI.el('a', { class: 'elink track', href: t.href, text: t.label });
}

/** A long-running season or pass, shown as a chip in the header strip rather than a card. */
function bgChip(e, now) {
  // "GO Pass: September" already says GO Pass — only prefix when the name doesn't.
  const label = typeInfo(e).label;
  const start = at(e.start);
  const end = at(e.end);
  const note = start > now ? `starts ${fmtDay(start)} · in ${rel(start - now)}`
    : end ? `ends ${fmtDay(end)} · ${rel(end - now)} left` : '';
  return UI.el('a', {
    class: 'bgchip' + (start > now ? ' soon' : ''),
    href: e.link, target: '_blank', rel: 'noopener',
  },
    UI.el('strong', { text: e.name.toLowerCase().startsWith(label.toLowerCase())
      ? e.name : `${label}: ${e.name}` }),
    note && UI.el('span', { text: note }));
}

/**
 * Rows under a running heading — by day for the next week, by month after that. Both lists
 * grouped themselves identically; this is that logic, once.
 */
function appendGrouped(wrap, list, labelOf, rowOf) {
  let current = null;
  let rows = null;
  for (const e of list) {
    const label = labelOf(e);
    if (label !== current) {
      current = label;
      wrap.appendChild(UI.el('div', { class: 'dayrow', text: label }));
      rows = UI.el('div', { class: 'erows' });
      wrap.appendChild(rows);
    }
    rows.appendChild(rowOf(e));
  }
}

/** Tracker link first, Details second — same order on a card and on a row. */
function linkRow(e, opts = {}) {
  return UI.el('div', { class: 'elinks' },
    opts.remind && remindButton(e), trackerLink(e), linkOut(e));
}

/* ---------- remind me ---------- */

/**
 * The per-event button. Only on events that have not started — a reminder for something
 * already running is nothing to act on.
 *
 * The three states and their wording come from Remind.buttonState, shared with the Mega
 * Finale page; what this function owns is the shape, which here is a link-row button.
 */
function remindButton(e) {
  const st = Remind.buttonState(e.id);
  const btn = UI.el('button', {
    class: 'elink' + (st.on ? ' on' : '') + (st.state === 'armed' ? ' armed' : ''),
    text: (st.on ? '\u2713 ' : '') + st.label,
    title: st.title,
    disabled: st.busy,
    'aria-pressed': String(st.on),
    on: { click: async () => {
      btn.disabled = true;
      await Remind.toggle({
        id: e.id, name: e.name, start: e.start, end: e.end, link: e.link,
        label: typeInfo(e).label,
      });
      render();
    } },
  });
  return btn;
}

/** How much of it is left, and whether that is urgent. */
function timeLeft(e, now) {
  const end = at(e.end);
  if (!end) return null;
  const ms = end - now;
  return UI.el('span', { class: 'eleft' + (ms < DAY ? ' urgent' : ''),
                         text: ms < DAY ? `Ends in ${rel(ms)}` : `${rel(ms)} left` });
}

/** A card for something that is on right now. Urgency first: when it ends. */
function liveCard(e, now) {
  const detail = detailText(e);
  return UI.el('article', { class: 'ecard live' },
    UI.el('div', { class: 'ehead' }, typePill(e), timeLeft(e, now)),
    UI.el('h3', { text: e.name }),
    UI.el('p', { class: 'ewhen' }, windowText(e), isGlobal(e.start) && globalTag()),
    detail && UI.el('p', { class: 'edetail', text: detail }),
    aboutBlock(e),
    linkRow(e));
}

/**
 * What this kind of event is, then what this particular one is, then what is in it. The first
 * line is always there; the other two only when the snapshot has them.
 */
function aboutBlock(e) {
  const { about, has, caveats } = describe(e);
  return UI.el('div', { class: 'eabout' },
    UI.el('p', { class: 'ekind', text: WHAT_IS[e.type] || 'A limited-time event.' }),
    about && UI.el('p', { class: 'eblurb', text: about }),
    has?.length > 0 && UI.el('p', { class: 'ehas', text: includesText(has) }),
    caveats?.length > 0 && caveatBlock(caveats));
}

/** "Includes: Raids · Field Research" — the feed's own table of contents, relabelled. */
function includesText(has) {
  return 'Includes: ' + has.map((h) => HAS_LABEL[h] || h).join(' · ');
}

/** Times published in UTC land at a different clock time depending on where you are. */
function globalTag() {
  return UI.tag('gtag', 'global',
    'Published as a fixed worldwide moment, shown here in your time zone. '
    + 'Most other events run on local time instead.');
}

/** A compact row for something that has not started yet. */
function eventRow(e, now, opts = {}) {
  const s = at(e.start);
  const t = at(e.end);
  const until = t && !sameDay(s, t) ? `until ${fmtDay(t)} ${fmtTime(t)}`
    : t ? `until ${fmtTime(t)}` : '';
  const sub = [until, detailText(e)].filter(Boolean).join(' · ');
  // One line saying what it is. The blurb when we have one, the kind of event otherwise.
  const { about, has, caveats } = describe(e);
  const aboutLine = about || WHAT_IS[e.type] || '';

  return UI.el('div', { class: 'erow' },
    UI.el('div', { class: 'etime',
                   text: opts.withDate ? `${fmtDay(s)} · ${fmtTime(s)}` : fmtTime(s) }),
    UI.el('div', { class: 'ebody' },
      UI.el('div', { class: 'eline' },
        typePill(e),
        UI.el('span', { class: 'ename', text: e.name }),
        isGlobal(e.start) && globalTag()),
      sub && UI.el('div', { class: 'esub', text: sub }),
      aboutLine && UI.el('div', { class: about ? 'eabout-row' : 'eabout-row kind',
                                  title: aboutLine, text: aboutLine }),
      // What is in it. For an event that is still a name and a date, this is the only answer.
      has?.length > 0 && UI.el('div', { class: 'ehas', text: includesText(has) }),
      caveats?.length > 0 && caveatBlock(caveats)),
    // Every row in this list is an event that has not started, which is exactly the set
    // worth a reminder — the live cards above deliberately do not get one.
    linkRow(e, { remind: true }));
}

/* ---------- the weekly rhythm ---------- */

/**
 * Derived from the upcoming entries, not from memory: for each repeating type, the weekday
 * and window it actually lands on in the feed. This is the bit that is hard to learn from
 * the official site, where every week is announced separately as if it were new.
 */
function rhythm(now) {
  const repeats = ['max-mondays', 'pokemon-spotlight-hour', 'raid-hour', 'community-day'];
  const out = [];
  for (const type of repeats) {
    const future = events.filter((e) => e.type === type && at(e.start) >= now);
    if (future.length < 2) continue;
    const days = future.map((e) => at(e.start).getDay());
    const modal = [...new Set(days)].sort(
      (a, b) => days.filter((d) => d === b).length - days.filter((d) => d === a).length)[0];
    const sample = future.find((e) => at(e.start).getDay() === modal);
    const weekday = at(sample.start).toLocaleDateString([], { weekday: 'long' });
    const win = at(sample.end)
      ? `${fmtTime(at(sample.start))} – ${fmtTime(at(sample.end))}` : fmtTime(at(sample.start));
    out.push({ label: TYPES[type].label, cls: TYPES[type].cls, when: `${weekday}s, ${win}` });
  }
  return out;
}

/* ---------- render ---------- */

function render() {
  const now = new Date();
  const buckets = classify(now);
  const filtered = (list) => list.filter(passesFilter);

  // Background strip
  const bg = document.getElementById('background');
  bg.textContent = '';
  bg.append(...buckets.background.map((e) => bgChip(e, now)));

  // Happening now
  const nowWrap = document.getElementById('now');
  nowWrap.textContent = '';
  const live = filtered(buckets.live);
  nowWrap.appendChild(UI.sectionHead({ title: 'Happening now', meta: live.length ? `${live.length} running` : '' }));
  if (live.length) {
    nowWrap.appendChild(UI.grid('events', live.map((e) => liveCard(e, now))));
  } else {
    nowWrap.appendChild(UI.empty('Nothing running under this filter right now.'));
  }

  // Next seven days, grouped by day
  const soonWrap = document.getElementById('soon');
  soonWrap.textContent = '';
  const soon = filtered(buckets.soon);
  soonWrap.appendChild(UI.sectionHead({ title: 'Next 7 days', meta: soon.length ? `${soon.length} starting` : '' }));
  if (soon.length) {
    appendGrouped(soonWrap, soon, (e) => dayLabel(at(e.start), now), (e) => eventRow(e, now));
  } else {
    soonWrap.appendChild(UI.empty('Nothing starting in the next week under this filter.'));
  }

  // Later, grouped by month
  const laterWrap = document.getElementById('later');
  laterWrap.textContent = '';
  const later = filtered(buckets.later);
  laterWrap.appendChild(UI.sectionHead({ title: 'Later', meta: later.length ? `${later.length} scheduled` : '' }));
  if (later.length) {
    appendGrouped(laterWrap, later,
      (e) => at(e.start).toLocaleDateString([], { month: 'long', year: 'numeric' }),
      (e) => eventRow(e, now, { withDate: true }));
  } else {
    laterWrap.appendChild(UI.empty('Nothing further out under this filter.'));
  }

  // Weekly rhythm
  const rh = document.getElementById('rhythm');
  rh.textContent = '';
  for (const r of rhythm(now)) {
    rh.appendChild(UI.el('div', { class: 'rh' },
      UI.tag('etype', r.label, null, { k: r.cls }),
      UI.el('span', { text: r.when })));
  }

  // Counts and freshness
  UI.setStat('c-live', buckets.live.length);
  UI.setStat('c-soon', buckets.soon.length);
  UI.setStat('c-later', buckets.later.length);
  paintSource();
  // No sign-in gate on this page, so signed out the panel stays hidden until someone
  // reaches for Remind me — see Remind.prompt().
  Remind.panel('#reminders', { reveal: true });

  // Hand ntfy anything that has come inside its three-day window. Cheap to call — it rate-
  // limits itself and returns immediately when there is nothing waiting or nobody signed in.
  Remind.reconcile();
}

function paintSource() {
  const node = document.getElementById('freshness');
  if (!node) return;
  node.className = 'freshness ' + source;
  const text = {
    live: `Live from the LeekDuck feed · checked ${checkedAt}`,
    snapshot: `Loading the live list… showing the saved copy from ${checkedAt}`,
    stale: `Live feed unreachable — showing the saved copy from ${checkedAt}. Times may have moved.`,
  }[source];
  node.textContent = text;
}

/* ---------- live feed ---------- */

/** The feed's shape, mapped to what this page renders. Mirrors scripts/update_events.py. */
function slim(e) {
  const x = e.extraData || {};
  const out = {
    id: e.eventID, name: e.name, type: e.eventType, heading: e.heading,
    link: e.link, start: e.start, end: e.end,
  };
  if (x.spotlight) {
    out.bonus = x.spotlight.bonus;
    out.mons = (x.spotlight.list || []).map((p) => p.name).filter(Boolean);
  }
  if (x.communityday) {
    out.mons = (x.communityday.spawns || []).map((p) => p.name).filter(Boolean);
    out.bonuses = (x.communityday.bonuses || []).map((b) => b.text).filter(Boolean);
  }
  if (x.raidbattles) {
    out.mons = (x.raidbattles.bosses || []).map((b) => b.name).filter(Boolean);
  }
  return out;
}

async function refresh() {
  try {
    const res = await fetch(FEED, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length < 10) throw new Error('feed shape changed');
    events = raw.filter((e) => e && e.eventID && e.start).map(slim);
    source = 'live';
    checkedAt = new Date().toLocaleString([], {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch (err) {
    // The snapshot is already on screen; say it is a snapshot rather than blanking the page.
    console.warn('[events] live feed unavailable, keeping the saved copy', err);
    source = 'stale';
  }
  render();
}

/* ---------- boot ---------- */

document.addEventListener('DOMContentLoaded', () => {
  UI.summary('.summary', {
    stats: [
      { id: 'c-live', label: 'On now', tone: 'ok' },
      { id: 'c-soon', label: 'Next 7 days', tone: 'hl' },
      { id: 'c-later', label: 'Later' },
    ],
    // No search, no bar, no Reset: this page is a summary of what is on, not a tracker.
    filters: [{ label: 'Show', group: 'kind', options: [
      ['all', 'Everything'], ['big', 'Events'], ['raids', 'Raids'],
      ['max', 'Max Battles'], ['hours', 'Hours'], ['league', 'Battle League']] }],
  });

  buildNav('events');

  if (typeof EVENTS_SNAPSHOT !== 'undefined') {
    EVENTS_SNAPSHOT.forEach((e) => {
      if (e.blurb || e.has || e.caveats) {
        described.set(e.id, { blurb: e.blurb, has: e.has, caveats: e.caveats });
      }
    });
  }
  events = typeof EVENTS_SNAPSHOT !== 'undefined' ? EVENTS_SNAPSHOT.slice() : [];
  render();          // paint the snapshot immediately — never an empty page while fetching
  refresh();

  // Same chip plumbing as every tracker page, minus the search box and Reset it has no
  // use for — setupControls skips both when the elements are absent.
  UI.setupControls({ onChange: render });

  // Countdowns drift and events roll over; the minute is the smallest unit shown.
  setInterval(render, 60_000);
  // Coming back to the tab after a while should not show yesterday's list.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
});
