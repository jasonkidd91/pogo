/* Mega Finale tracker — rendering. Cards, grids and section heads come from ui.js;
   what is left here is what is genuinely specific to this event: the flat raid list, the
   live-habitat clock, and habitat-window reminders. Progress lives in the shared Store.

   THIS EVENT IS TIMED, AND IT ENDS. Nothing here is available outside a habitat window, and
   the whole thing is over after the last one. Two consequences the page has to state rather
   than imply:

     - a window that has passed is drawn as past, and only a FUTURE window can be reminded
       about (remind.js refuses a start in the past anyway — this is so the page does not
       offer something that would be refused);
     - once the last window closes the page says so, in a banner, and stops offering
       reminders entirely. The ticks stay: past the event this page is a record of what you
       caught, and deleting that would be the wrong answer to "the event is over".

   Windows are LOCAL wall-clock — 10:00 means 10:00 wherever you are — so they are handed to
   remind.js as a stamp with no trailing Z, which is exactly the convention the events feed
   uses for the same reason. See the TIME note in events.js. */

/** Flat list of every raid target, in display order. Built once from DAYS. */
const ALL = [];
for (const day of DAYS) {
  ALL.push({ ...day.superRaid, id: Store.id.mega(day.superRaid.name), dayId: day.id, isSuper: true });
  for (const hab of day.habitats) {
    for (const p of hab.pokemon) {
      ALL.push({ ...p, id: Store.id.mega(p.name), dayId: day.id, habitat: hab.name });
    }
  }
}

/* ---------- habitat windows in real time ---------- */

/** "10:00 – 11:00" -> ['10:00', '11:00']. The separator is an EN DASH, not a hyphen. */
const splitBlock = (b) => b.split('–').map((t) => t.trim());

/**
 * A block's real start and end, as local Date objects.
 *
 * `isoDate` + a wall-clock time, built from numeric parts so it is unambiguously LOCAL.
 * The event runs 10:00–18:00 wherever the player is, which is the same rule the events feed
 * encodes by omitting the trailing Z.
 */
function blockTimes(day, block) {
  const [y, mo, d] = day.isoDate.split('-').map(Number);
  const [from, to] = splitBlock(block);
  const mk = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(y, mo - 1, d, h, m, 0, 0);
  };
  return { start: mk(from), end: mk(to) };
}

/** The stamp remind.js stores: local wall-clock, deliberately WITHOUT a Z. */
function localStamp(dt) {
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
       + `T${p(dt.getHours())}:${p(dt.getMinutes())}:00`;
}

/** When the very last habitat window of the event closes. */
function eventEnd() {
  let last = 0;
  for (const day of DAYS) {
    for (const hab of day.habitats) {
      for (const b of hab.blocks) last = Math.max(last, blockTimes(day, b).end.getTime());
    }
  }
  return last;
}

const EVENT_END = eventEnd();

/** True once every window has closed. The page changes what it offers, not what it keeps. */
const isOver = () => Date.now() > EVENT_END;

/**
 * The event runs 10:00–18:00 local on both days, each habitat twice.
 * Returns a Set of "HH:MM – HH:MM" strings that are active right now, or an empty Set
 * when we're outside the event.
 */
function liveBlocks() {
  const now = new Date();
  // Event windows are LOCAL time, so compare against the local date.
  // toISOString() would give the UTC date and mis-fire either side of midnight.
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const day = DAYS.find((d) => d.isoDate === today);
  if (!day) return { day: null, blocks: new Set() };

  const mins = now.getHours() * 60 + now.getMinutes();
  const blocks = new Set();
  for (const hab of day.habitats) {
    for (const b of hab.blocks) {
      const [s, e] = splitBlock(b).map((t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      });
      if (mins >= s && mins < e) blocks.add(b);
    }
  }
  return { day: day.id, blocks };
}

/* ---------- rendering ---------- */

function visible(p) {
  return UI.statusMatch(p.id, UI.activeFilter('status'));
}

/** The badges this event puts on a card: what it costs, and whether it is debuting here. */
function badgesFor(p) {
  return [
    UI.energyPill(p),
    p.isNew && UI.tag('tag-new', 'NEW MEGA',
      'Debuting in this event — no mainline Mega artwork exists yet'),
  ].filter(Boolean);
}

function card(p) {
  return UI.monCard(p, {
    variant: p.isSuper ? 'super' : 'plain',
    badges: badgesFor(p),
    lead: p.isSuper ? p.tier : null,
    sub: p.isSuper ? `${p.time} · ${p.energyNote}` : null,
  });
}

/**
 * One habitat window. Three shapes, because a window is in one of three states and they are
 * not interchangeable:
 *
 *   open now  -> a green span. Nothing to remind about; go and play.
 *   past      -> a muted span. Every window is past once the event ends, which is what makes
 *                a finished event read as finished rather than as a page that stopped working.
 *   upcoming  -> a BUTTON that arms a reminder 15 minutes before it opens.
 *
 * The notification carries the habitat's Pokémon, because it is read on a lock screen away
 * from this page and "Jungle habitat" on its own is not something you can act on.
 */
function timePill(day, hab, block, openNow) {
  if (openNow.has(block)) {
    return UI.el('span', { class: 'time live', text: block });
  }
  const { start, end } = blockTimes(day, block);
  if (start.getTime() <= Date.now()) {
    return UI.el('span', { class: 'time past', text: block,
                           title: 'This window has passed' });
  }

  const id = `finale-${day.id}-${Store.slug(hab.name)}-${splitBlock(block)[0]}`;
  const st = Remind.buttonState(id);
  const said = `${hab.name} at ${splitBlock(block)[0]} on ${day.label}`;

  const btn = UI.el('button', {
    class: 'time future' + (st.on ? ' on' : '') + (st.state === 'armed' ? ' armed' : ''),
    text: (st.on ? '\u2713 ' : '') + block,
    disabled: st.busy,
    title: st.title,
    'aria-pressed': String(st.on),
    // The visible label is a bare time range, which says nothing on its own to a screen
    // reader. The accessible name has to carry the habitat, the day and what pressing does.
    'aria-label': (st.on ? 'Cancel reminder for ' : 'Remind me before ') + said,
    on: { click: async () => {
      btn.disabled = true;
      await Remind.toggle({
        id,
        name: `${hab.name} habitat`,
        start: localStamp(start),
        end: localStamp(end),
        label: 'Mega Finale',
        note: hab.pokemon.map((x) => x.name).join(', ') + '.',
      });
      render();
    } },
  });
  return btn;
}

/**
 * A habitat's heading: its name, its two windows, and a Live now flag when one is open.
 *
 * `openNow` must already be narrowed to THIS day. Both days run the same clock, so matching
 * a block by its "10:00 – 11:00" string alone lit Saturday's windows green on a Sunday.
 */
function habitatHead(day, hab, openNow) {
  const isLive = hab.blocks.some((b) => openNow.has(b));
  return UI.el('div', { class: 'habitat-head' },
    UI.el('h3', { text: hab.name }),
    UI.el('div', { class: 'times' },
      hab.blocks.map((b) => timePill(day, hab, b, openNow))),
    isLive && UI.el('span', { class: 'live-tag', text: 'Live now' }));
}

/**
 * What the page says once the last window has closed.
 *
 * The ticks are deliberately left alone. After the event this page is the record of what you
 * caught during it, and wiping that would be the wrong answer to "it is over" — Reset is
 * still there for anyone who wants it gone.
 */
function overBanner() {
  const end = new Date(EVENT_END);
  return UI.el('div', { class: 'overbanner', role: 'status' },
    UI.el('div', { class: 'rb-body' },
      UI.el('strong', { text: 'This event has finished' }),
      UI.el('p', { class: 'rb-note', text:
        `${EVENT.name} ended on ${end.toLocaleDateString([], { weekday: 'long', day: 'numeric',
          month: 'long' })} at ${end.toLocaleTimeString([], { hour: 'numeric',
          minute: '2-digit' })}. Nothing below is catchable any more — what is here is the `
        + 'record of what you caught, kept on your account.' })),
    UI.el('div', { class: 'rb-acts' },
      UI.el('a', { class: 'elink track', href: 'index.html', text: "See what's on now" }),
      UI.el('a', { class: 'elink', href: 'megas.html', text: 'Mega collection' })));
}

const NO_BLOCKS = new Set();

function render() {
  const live = liveBlocks();
  const over = isOver();
  const root = document.getElementById('days');
  root.textContent = '';

  document.body.classList.toggle('event-over', over);
  if (over) root.appendChild(overBanner());
  // The banner is a child of #days, so "did anything render?" below has to discount it.
  const chrome = root.children.length;

  for (const day of DAYS) {
    const shown = ALL.filter((p) => p.dayId === day.id && visible(p));
    if (!shown.length) continue;
    // Only the day we are actually in can have an open window.
    const openNow = live.day === day.id ? live.blocks : NO_BLOCKS;

    const dayTotal = ALL.filter((p) => p.dayId === day.id);
    const dayDone = dayTotal.filter((p) => Store.has(p.id)).length;
    root.appendChild(UI.sectionHead({
      title: day.label,
      meta: `${day.date} · 10:00 – 18:00 local`,
      count: `${dayDone} / ${dayTotal.length} caught`,
    }));

    // Super Mega Raid — a full-width banner rather than a grid cell.
    const superP = ALL.find((p) => p.dayId === day.id && p.isSuper);
    if (visible(superP)) root.appendChild(card(superP));

    for (const hab of day.habitats) {
      const mons = hab.pokemon
        .map((p) => ALL.find((x) => x.id === Store.id.mega(p.name)))
        .filter(visible);
      if (!mons.length) continue;

      root.appendChild(UI.el('section', { class: 'habitat' },
        habitatHead(day, hab, openNow),
        UI.grid('default', mons.map(card))));
    }
  }

  if (root.children.length === chrome) {
    root.appendChild(UI.empty(UI.activeFilter('status') === 'have'
      ? 'Nothing checked off yet.'
      : 'All done — every Mega on the list is caught.'));
  }

  renderSummary();

  // This page has its own sign-in gate, so the panel never needs to do the asking. Once the
  // event is over there is nothing left to be reminded about, so it goes entirely.
  Remind.panel('#reminders', {
    hidden: over,
    hint: 'Tap an upcoming habitat window below to be reminded 15 minutes before it opens.',
  });
  Remind.reconcile();
}

function renderSummary() {
  const total = ALL.length;
  const done = ALL.filter((p) => Store.has(p.id)).length;
  const remaining = ALL.filter((p) => !Store.has(p.id));

  // One raid pass per Pokémon still needed.
  UI.setStat('s-passes', remaining.length);
  UI.setStat('s-caught', done, total);
  // Mega Energy for what's left, excluding the two unpriced Super Mega Raid bosses.
  UI.setStat('s-energy', remaining.reduce((sum, p) => sum + (p.energy || 0), 0));
  UI.setBar(done, total);

  const unpriced = remaining.filter((p) => p.energy == null).length;
  document.getElementById('s-energy-note').textContent = unpriced
    ? `excl. ${unpriced} Super Mega Raid${unpriced > 1 ? 's' : ''}`
    : 'Mega Energy left';
}

/* ---------- controls ---------- */

document.addEventListener('DOMContentLoaded', () => {
  UI.summary('.summary', {
    stats: [
      { id: 's-passes', label: 'Raid passes needed', tone: 'hl' },
      { id: 's-caught', label: 'Caught', tone: 'ok' },
      { id: 's-energy', label: 'Mega Energy left', labelId: 's-energy-note' },
    ],
    bar: true,
    reset: true,
    // Same group name and values as every other tracker page, so activeFilter('status')
    // and statusMatch() behave identically here. Only the wording is event-specific.
    filters: [{ label: 'Show', group: 'status', options: [
      ['all', 'All'], ['need', 'Still needed'], ['have', 'Caught']] }],
  });

  document.getElementById('ev-name').textContent = EVENT.name;
  document.getElementById('ev-official').href = EVENT.officialUrl;
  document.getElementById('bonuses').append(
    ...EVENT.bonuses.map((b) => UI.el('li', { text: b })));

  UI.setupControls({
    onChange: render,
    prefix: ALL.map((p) => p.id),
    resetPrompt: 'Clear the Megas tracked for this event? This cannot be undone.',
  });

  buildNav('finale');
  render();
  // Keep the "Live now" badge honest as habitats rotate on the hour.
  setInterval(render, 60_000);
});
