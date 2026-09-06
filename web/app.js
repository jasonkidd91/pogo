/* Mega Finale tracker — rendering. Cards, grids and section heads come from ui.js;
   what is left here is what is genuinely specific to this event: the flat raid list and
   the live-habitat clock. Progress lives in the shared Store (store.js). */

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

/* ---------- live habitat detection ---------- */

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
      const [s, e] = b.split('–').map((t) => {
        const [h, m] = t.trim().split(':').map(Number);
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
 * A habitat's heading: its name, its two windows, and a Live now flag when one is open.
 *
 * `openNow` must already be narrowed to THIS day. Both days run the same clock, so matching
 * a block by its "10:00 – 11:00" string alone lit Saturday's windows green on a Sunday.
 */
function habitatHead(hab, openNow) {
  const isLive = hab.blocks.some((b) => openNow.has(b));
  return UI.el('div', { class: 'habitat-head' },
    UI.el('h3', { text: hab.name }),
    UI.el('div', { class: 'times' },
      hab.blocks.map((b) => UI.el('span', {
        class: 'time' + (openNow.has(b) ? ' live' : ''), text: b,
      }))),
    isLive && UI.el('span', { class: 'live-tag', text: 'Live now' }));
}

const NO_BLOCKS = new Set();

function render() {
  const live = liveBlocks();
  const root = document.getElementById('days');
  root.textContent = '';

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
        habitatHead(hab, openNow),
        UI.grid('default', mons.map(card))));
    }
  }

  if (!root.children.length) {
    root.appendChild(UI.empty(UI.activeFilter('status') === 'have'
      ? 'Nothing checked off yet.'
      : 'All done — every Mega on the list is caught.'));
  }

  renderSummary();
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
