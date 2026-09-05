/* Shared renderer for the Mega and Dynamax collection pages. */

const ART_BASE = 'https://img.pokemondb.net/sprites/home/normal/';

function sprite(p) {
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

function typePills(types) {
  const wrap = document.createElement('div');
  wrap.className = 'types';
  (types || []).forEach((t) => {
    const el = document.createElement('span');
    el.className = 'type';
    el.dataset.t = t.toLowerCase();
    el.textContent = t;
    wrap.appendChild(el);
  });
  return wrap;
}

/**
 * The battle this species is fought in — Mega Raid, Legendary Mega Raid, Primal Raid or
 * Gigantamax Battle — with its star rating. This is the class of the battle, not a claim
 * that it is in the rotation today; the data file only carries what is stable.
 */
function raidPill(p) {
  const el = document.createElement('div');
  el.className = 'raid';
  el.dataset.stars = String(p.stars);
  el.title = `${p.raid} — ${p.stars}-star battle. Whether it is in rotation right now changes constantly.`;
  const stars = document.createElement('span');
  stars.className = 'stars';
  stars.textContent = '★'.repeat(p.stars);
  el.appendChild(stars);
  // "Mega Raid" -> "MEGA". The trailing noun is the same for every value in a column of
  // these, and dropping it is what keeps the six-star label on one line in a narrow card.
  el.appendChild(document.createTextNode(p.raid.replace(/ (Raid|Battle)$/, '')));
  return el;
}

/**
 * @param p     entry with { name, art, key, ... }
 * @param opts  { badges: [el], sub: string }
 */
function collectionCard(p, opts = {}) {
  const on = Store.has(p.key);
  // Signed out the card still renders — it just can't be ticked. trackerToggle turns the
  // click into a sign-in prompt instead.
  const locked = Store.locked;
  const card = document.createElement('div');
  card.className = 'card mon' + (on ? ' caught' : '');
  card.tabIndex = locked ? -1 : 0;
  card.setAttribute('role', 'checkbox');
  card.setAttribute('aria-checked', String(on));
  if (locked) card.setAttribute('aria-disabled', 'true');
  card.setAttribute('aria-label',
    locked ? `${p.name}, sign in to track` : `${p.name}, ${on ? 'caught' : 'not caught'}`);

  const hit = () => { trackerToggle(p.key); };
  card.addEventListener('click', hit);
  card.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hit(); }
  });

  card.appendChild(sprite(p));

  const body = document.createElement('div');
  body.className = 'body';

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = p.name;
  body.appendChild(name);

  if (p.form) {
    const f = document.createElement('div');
    f.className = 'form';
    f.textContent = p.form;
    body.appendChild(f);
  }

  if (p.types) body.appendChild(typePills(p.types));

  if (p.raid) body.appendChild(raidPill(p));

  if (opts.badges?.length) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    opts.badges.forEach((b) => meta.appendChild(b));
    body.appendChild(meta);
  }

  if (opts.sub) {
    const s = document.createElement('div');
    s.className = 'note';
    s.textContent = opts.sub;
    body.appendChild(s);
  }

  card.appendChild(body);

  const check = document.createElement('div');
  check.className = 'check';
  check.innerHTML = '<svg viewBox="0 0 16 16"><polyline points="3,8.5 6.5,12 13,4.5"/></svg>';
  card.appendChild(check);
  return card;
}

function badge(cls, text, title) {
  const el = document.createElement('span');
  el.className = cls;
  el.textContent = text;
  if (title) el.title = title;
  return el;
}

/** Wires up the search box + filter chips + reset shared by both collection pages. */
function setupControls({ onChange, prefix }) {
  const search = document.getElementById('search');
  if (search) search.addEventListener('input', onChange);

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      document
        .querySelectorAll(`[data-group="${group}"]`)
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      onChange();
    });
  });

  const reset = document.getElementById('reset');
  if (reset) {
    reset.addEventListener('click', () => {
      if (Store.locked) return Auth.prompt();
      if (confirm('Clear tracked progress on this page? This cannot be undone.')) Store.clear(prefix);
    });
  }
  Store.onChange(onChange);
}

function activeFilter(group) {
  return document.querySelector(`[data-group="${group}"][aria-pressed="true"]`)?.dataset.filter || 'all';
}

function searchText() {
  return (document.getElementById('search')?.value || '').trim().toLowerCase();
}

function statusMatch(key, mode) {
  if (mode === 'need') return !Store.has(key);
  if (mode === 'have') return Store.has(key);
  return true;
}
