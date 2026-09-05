/* Mega Finale tracker — rendering. Progress lives in the shared Store (store.js). */

const ART_BASE = 'https://img.pokemondb.net/sprites/home/normal/';

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

/* ---------- state ---------- */

let filter = 'all';

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

function spriteFor(p) {
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = p.name;
  img.src = ART_BASE + p.art + '.png';
  if (p.artFallback) {
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      img.src = ART_BASE + p.artFallback + '.png';
    });
  }
  return img;
}

function energyBadge(p) {
  const el = document.createElement('span');
  el.className = 'energy';
  el.dataset.e = p.energy == null ? '?' : String(p.energy);
  el.textContent = p.energy == null ? '? energy' : `${p.energy.toLocaleString()} energy`;
  if (p.energyNote) el.title = p.energyNote;
  return el;
}

function visible(p) {
  if (filter === 'remaining') return !Store.has(p.id);
  if (filter === 'caught') return Store.has(p.id);
  return true;
}

function makeCard(p, cls) {
  const card = document.createElement('div');
  card.className = cls + (Store.has(p.id) ? ' caught' : '');
  card.tabIndex = 0;
  card.setAttribute('role', 'checkbox');
  card.setAttribute('aria-checked', String(Store.has(p.id)));
  card.setAttribute('aria-label', `${p.name}, ${Store.has(p.id) ? 'caught' : 'not caught'}`);

  const onActivate = () => Store.toggle(p.id);
  card.addEventListener('click', onActivate);
  card.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onActivate(); }
  });

  card.appendChild(spriteFor(p));

  const body = document.createElement('div');
  body.className = 'body';

  if (p.isSuper) {
    const tier = document.createElement('div');
    tier.className = 'tier';
    tier.textContent = p.tier;
    body.appendChild(tier);
  }

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = p.name;
  body.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.appendChild(energyBadge(p));
  if (p.isNew) {
    const tag = document.createElement('span');
    tag.className = 'tag-new';
    tag.textContent = 'NEW MEGA';
    tag.title = 'Debuting in this event — no mainline Mega artwork exists yet';
    meta.appendChild(tag);
  }
  body.appendChild(meta);

  if (p.isSuper) {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = `${p.time} · ${p.energyNote}`;
    body.appendChild(note);
  }

  card.appendChild(body);

  const check = document.createElement('div');
  check.className = 'check';
  check.innerHTML = '<svg viewBox="0 0 16 16"><polyline points="3,8.5 6.5,12 13,4.5"/></svg>';
  card.appendChild(check);

  return card;
}

function render() {
  const live = liveBlocks();
  const root = document.getElementById('days');
  root.textContent = '';

  for (const day of DAYS) {
    const shown = ALL.filter((p) => p.dayId === day.id && visible(p));
    if (!shown.length) continue;

    const dayTotal = ALL.filter((p) => p.dayId === day.id);
    const dayDone = dayTotal.filter((p) => Store.has(p.id)).length;

    const head = document.createElement('div');
    head.className = 'day-head';
    head.innerHTML =
      `<h2>${day.label}</h2><span class="date">${day.date} · 10:00 – 18:00 local</span>` +
      `<span class="count">${dayDone} / ${dayTotal.length} caught</span>`;
    root.appendChild(head);

    // Super Mega Raid
    const superP = ALL.find((p) => p.dayId === day.id && p.isSuper);
    if (visible(superP)) root.appendChild(makeCard(superP, 'super'));

    for (const hab of day.habitats) {
      const mons = hab.pokemon
        .map((p) => ALL.find((x) => x.id === Store.id.mega(p.name)))
        .filter(visible);
      if (!mons.length) continue;

      const sec = document.createElement('section');
      sec.className = 'habitat';

      const hh = document.createElement('div');
      hh.className = 'habitat-head';
      const isLive = live.day === day.id && hab.blocks.some((b) => live.blocks.has(b));
      hh.innerHTML =
        `<h3>${hab.name}</h3>` +
        `<div class="times">${hab.blocks
          .map((b) => `<span class="time${live.blocks.has(b) ? ' live' : ''}">${b}</span>`)
          .join('')}</div>` +
        (isLive ? '<span class="live-tag">Live now</span>' : '');
      sec.appendChild(hh);

      const grid = document.createElement('div');
      grid.className = 'grid';
      mons.forEach((p) => grid.appendChild(makeCard(p, 'card')));
      sec.appendChild(grid);
      root.appendChild(sec);
    }
  }

  if (!root.children.length) {
    const msg = document.createElement('p');
    msg.className = 'empty';
    msg.textContent =
      filter === 'caught' ? 'Nothing checked off yet.' : 'All done — every Mega on the list is caught.';
    root.appendChild(msg);
  }

  renderSummary();
}

function renderSummary() {
  const total = ALL.length;
  const done = ALL.filter((p) => Store.has(p.id)).length;
  const remaining = ALL.filter((p) => !Store.has(p.id));

  // One raid pass per Pokémon still needed.
  const passes = remaining.length;
  // Mega Energy for what's left, excluding the two unpriced Super Mega Raid bosses.
  const energy = remaining.reduce((sum, p) => sum + (p.energy || 0), 0);
  const unpriced = remaining.filter((p) => p.energy == null).length;

  document.getElementById('s-passes').textContent = passes;
  document.getElementById('s-caught').innerHTML = `${done}<small> / ${total}</small>`;
  document.getElementById('s-energy').textContent = energy.toLocaleString();
  document.getElementById('s-energy-note').textContent = unpriced
    ? `excl. ${unpriced} Super Mega Raid${unpriced > 1 ? 's' : ''}`
    : 'Mega Energy left';
  document.getElementById('bar').style.width = `${(done / total) * 100}%`;
}

/* ---------- controls ---------- */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ev-name').textContent = EVENT.name;
  document.getElementById('ev-official').href = EVENT.officialUrl;
  document.getElementById('bonuses').innerHTML = EVENT.bonuses
    .map((b) => `<li>${b}</li>`)
    .join('');

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      document
        .querySelectorAll('[data-filter]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    });
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('Clear the Megas tracked for this event? This cannot be undone.')) {
      Store.clear(ALL.map((p) => p.id));
    }
  });

  buildNav('event');
  Store.onChange(render);
  render();
  // Keep the "Live now" badge honest as habitats rotate on the hour.
  setInterval(render, 60_000);
});
