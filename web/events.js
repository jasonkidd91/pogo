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
  const wrap = document.createElement('div');
  wrap.className = 'ecaveats';
  for (const c of list) {
    const info = CAVEAT[c.k] || { label: 'Note', mark: '⚠' };
    const row = document.createElement('p');
    row.className = 'ecaveat';
    row.dataset.k = c.k;
    const tag = document.createElement('span');
    tag.className = 'ctag';
    tag.textContent = `${info.mark} ${info.label}`;
    row.appendChild(tag);
    // A real space, not just the tag's margin — otherwise a screen reader and anyone copying
    // the text get "EVENT ONLYShiny Armored Mewtwo…".
    row.appendChild(document.createTextNode(' ' + c.t));
    row.title = c.t;
    wrap.appendChild(row);
  }
  return wrap;
}

function typeInfo(e) {
  return TYPES[e.type] || { label: e.heading || 'Event', cls: 'event', group: 'big' };
}

function activeGroup() {
  return document.querySelector('[data-group="kind"][aria-pressed="true"]')?.dataset.filter || 'all';
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
  const el = document.createElement('span');
  el.className = 'etype';
  el.dataset.k = info.cls;
  el.textContent = info.label;
  return el;
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
  const a = document.createElement('a');
  a.className = 'elink';
  a.href = e.link;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = 'Details';
  return a;
}

function trackerLink(e) {
  const t = TRACKERS[e.id];
  if (!t) return null;
  const a = document.createElement('a');
  a.className = 'elink track';
  a.href = t.href;
  a.textContent = t.label;
  return a;
}

/** A card for something that is on right now. Urgency first: when it ends. */
function liveCard(e, now) {
  const card = document.createElement('article');
  card.className = 'ecard live';

  const head = document.createElement('div');
  head.className = 'ehead';
  head.appendChild(typePill(e));
  const end = at(e.end);
  if (end) {
    const left = document.createElement('span');
    left.className = 'eleft';
    const ms = end - now;
    left.textContent = ms < DAY ? `Ends in ${rel(ms)}` : `${rel(ms)} left`;
    if (ms < DAY) left.classList.add('urgent');
    head.appendChild(left);
  }
  card.appendChild(head);

  const h = document.createElement('h3');
  h.textContent = e.name;
  card.appendChild(h);

  const when = document.createElement('p');
  when.className = 'ewhen';
  when.textContent = windowText(e);
  if (isGlobal(e.start)) when.appendChild(globalTag());
  card.appendChild(when);

  const detail = detailText(e);
  if (detail) {
    const p = document.createElement('p');
    p.className = 'edetail';
    p.textContent = detail;
    card.appendChild(p);
  }

  card.appendChild(aboutBlock(e));

  const links = document.createElement('div');
  links.className = 'elinks';
  const track = trackerLink(e);
  if (track) links.appendChild(track);
  links.appendChild(linkOut(e));
  card.appendChild(links);
  return card;
}

/**
 * What this kind of event is, then what this particular one is, then what is in it. The first
 * line is always there; the other two only when the snapshot has them.
 */
function aboutBlock(e) {
  const wrap = document.createElement('div');
  wrap.className = 'eabout';
  const { about, has, caveats } = describe(e);

  const kind = document.createElement('p');
  kind.className = 'ekind';
  kind.textContent = WHAT_IS[e.type] || 'A limited-time event.';
  wrap.appendChild(kind);

  if (about) {
    const p = document.createElement('p');
    p.className = 'eblurb';
    p.textContent = about;
    wrap.appendChild(p);
  }

  if (has?.length) {
    const row = document.createElement('p');
    row.className = 'ehas';
    row.textContent = 'Includes: ' + has.map((h) => HAS_LABEL[h] || h).join(' · ');
    wrap.appendChild(row);
  }

  if (caveats?.length) wrap.appendChild(caveatBlock(caveats));
  return wrap;
}

/** Times published in UTC land at a different clock time depending on where you are. */
function globalTag() {
  const el = document.createElement('span');
  el.className = 'gtag';
  el.textContent = 'global';
  el.title = 'Published as a fixed worldwide moment, shown here in your time zone. Most other events run on local time instead.';
  return el;
}

/** A compact row for something that has not started yet. */
function eventRow(e, now, opts = {}) {
  const row = document.createElement('div');
  row.className = 'erow';

  const time = document.createElement('div');
  time.className = 'etime';
  const s = at(e.start);
  time.textContent = opts.withDate ? `${fmtDay(s)} · ${fmtTime(s)}` : fmtTime(s);
  row.appendChild(time);

  const body = document.createElement('div');
  body.className = 'ebody';

  const line = document.createElement('div');
  line.className = 'eline';
  line.appendChild(typePill(e));
  const name = document.createElement('span');
  name.className = 'ename';
  name.textContent = e.name;
  line.appendChild(name);
  if (isGlobal(e.start)) line.appendChild(globalTag());
  body.appendChild(line);

  const t = at(e.end);
  const sub = document.createElement('div');
  sub.className = 'esub';
  const detail = detailText(e);
  const until = t && !sameDay(s, t) ? `until ${fmtDay(t)} ${fmtTime(t)}`
    : t ? `until ${fmtTime(t)}` : '';
  sub.textContent = [until, detail].filter(Boolean).join(' · ');
  if (sub.textContent) body.appendChild(sub);

  // One line saying what it is. The blurb when we have one, the kind of event otherwise.
  const { about, has, caveats } = describe(e);
  const aboutLine = document.createElement('div');
  aboutLine.className = about ? 'eabout-row' : 'eabout-row kind';
  aboutLine.textContent = about || WHAT_IS[e.type] || '';
  if (aboutLine.textContent) {
    aboutLine.title = aboutLine.textContent;
    body.appendChild(aboutLine);
  }

  // What is in it. For an event that is still a name and a date, this is the only answer.
  if (has?.length) {
    const inc = document.createElement('div');
    inc.className = 'ehas';
    inc.textContent = 'Includes: ' + has.map((h) => HAS_LABEL[h] || h).join(' · ');
    body.appendChild(inc);
  }

  if (caveats?.length) body.appendChild(caveatBlock(caveats));

  row.appendChild(body);

  const links = document.createElement('div');
  links.className = 'elinks';
  const track = trackerLink(e);
  if (track) links.appendChild(track);
  links.appendChild(linkOut(e));
  row.appendChild(links);
  return row;
}

function sectionHead(text, note) {
  const h = document.createElement('div');
  h.className = 'day-head';
  h.innerHTML = `<h2>${text}</h2>`;
  if (note) {
    const n = document.createElement('span');
    n.className = 'date';
    n.textContent = note;
    h.appendChild(n);
  }
  return h;
}

function empty(text) {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = text;
  return p;
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
  for (const e of buckets.background) {
    const chip = document.createElement('a');
    chip.className = 'bgchip';
    chip.href = e.link;
    chip.target = '_blank';
    chip.rel = 'noopener';
    const lbl = document.createElement('strong');
    // "GO Pass: September" already says GO Pass — only prefix when the name doesn't.
    const label = typeInfo(e).label;
    lbl.textContent = e.name.toLowerCase().startsWith(label.toLowerCase())
      ? e.name : `${label}: ${e.name}`;
    chip.appendChild(lbl);
    const start = at(e.start);
    const end = at(e.end);
    const note = document.createElement('span');
    if (start > now) {
      chip.classList.add('soon');
      note.textContent = `starts ${fmtDay(start)} · in ${rel(start - now)}`;
    } else if (end) {
      note.textContent = `ends ${fmtDay(end)} · ${rel(end - now)} left`;
    }
    if (note.textContent) chip.appendChild(note);
    bg.appendChild(chip);
  }

  // Happening now
  const nowWrap = document.getElementById('now');
  nowWrap.textContent = '';
  const live = filtered(buckets.live);
  nowWrap.appendChild(sectionHead('Happening now', live.length ? `${live.length} running` : ''));
  if (live.length) {
    const grid = document.createElement('div');
    grid.className = 'egrid';
    live.forEach((e) => grid.appendChild(liveCard(e, now)));
    nowWrap.appendChild(grid);
  } else {
    nowWrap.appendChild(empty('Nothing running under this filter right now.'));
  }

  // Next seven days, grouped by day
  const soonWrap = document.getElementById('soon');
  soonWrap.textContent = '';
  const soon = filtered(buckets.soon);
  soonWrap.appendChild(sectionHead('Next 7 days', soon.length ? `${soon.length} starting` : ''));
  if (soon.length) {
    let day = null;
    let list = null;
    for (const e of soon) {
      const s = at(e.start);
      const label = dayLabel(s, now);
      if (label !== day) {
        day = label;
        const h = document.createElement('div');
        h.className = 'dayrow';
        h.textContent = label;
        soonWrap.appendChild(h);
        list = document.createElement('div');
        list.className = 'erows';
        soonWrap.appendChild(list);
      }
      list.appendChild(eventRow(e, now));
    }
  } else {
    soonWrap.appendChild(empty('Nothing starting in the next week under this filter.'));
  }

  // Later, grouped by month
  const laterWrap = document.getElementById('later');
  laterWrap.textContent = '';
  const later = filtered(buckets.later);
  laterWrap.appendChild(sectionHead('Later', later.length ? `${later.length} scheduled` : ''));
  if (later.length) {
    let month = null;
    let list = null;
    for (const e of later) {
      const s = at(e.start);
      const label = s.toLocaleDateString([], { month: 'long', year: 'numeric' });
      if (label !== month) {
        month = label;
        const h = document.createElement('div');
        h.className = 'dayrow';
        h.textContent = label;
        laterWrap.appendChild(h);
        list = document.createElement('div');
        list.className = 'erows';
        laterWrap.appendChild(list);
      }
      list.appendChild(eventRow(e, now, { withDate: true }));
    }
  } else {
    laterWrap.appendChild(empty('Nothing further out under this filter.'));
  }

  // Weekly rhythm
  const rh = document.getElementById('rhythm');
  rh.textContent = '';
  for (const r of rhythm(now)) {
    const el = document.createElement('div');
    el.className = 'rh';
    const pill = document.createElement('span');
    pill.className = 'etype';
    pill.dataset.k = r.cls;
    pill.textContent = r.label;
    el.appendChild(pill);
    const when = document.createElement('span');
    when.textContent = r.when;
    el.appendChild(when);
    rh.appendChild(el);
  }

  // Counts and freshness
  document.getElementById('c-live').textContent = buckets.live.length;
  document.getElementById('c-soon').textContent = buckets.soon.length;
  document.getElementById('c-later').textContent = buckets.later.length;
  paintSource();
}

function paintSource() {
  const el = document.getElementById('freshness');
  if (!el) return;
  el.className = 'freshness ' + source;
  const text = {
    live: `Live from the LeekDuck feed · checked ${checkedAt}`,
    snapshot: `Loading the live list… showing the saved copy from ${checkedAt}`,
    stale: `Live feed unreachable — showing the saved copy from ${checkedAt}. Times may have moved.`,
  }[source];
  el.textContent = text;
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

  document.querySelectorAll('[data-group="kind"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-group="kind"]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    });
  });

  // Countdowns drift and events roll over; the minute is the smallest unit shown.
  setInterval(render, 60_000);
  // Coming back to the tab after a while should not show yesterday's list.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
});
