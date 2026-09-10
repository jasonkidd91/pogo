/**
 * Shared collection state for every page on the site.
 *
 * Keys are CANONICAL and derived from the Pokémon's name, so the same creature is the
 * same key no matter which page ticks it. Mega Beedrill checked on the event page shows
 * as checked on the Mega list, and vice versa.
 *
 *   mega:mega-beedrill      Mega Evolutions and Primal Reversions
 *   dmax:bulbasaur          Dynamax-capable Pokémon
 *   gmax:venusaur           Gigantamax forms (distinct from the Dynamax entry)
 *
 * WHERE IT LIVES: Firestore, at users/{uid}.caught — progress follows the Google account,
 * not the browser. This file holds the in-memory set and the identity rules only; auth.js
 * owns Firebase and installs itself as the backend via Store._install().
 *
 * The same document also carries the events page's reminders and its ntfy topic (see
 * remind.js). They are separate top-level fields written separately, and every write is a
 * merge, so a reminder and a tick never overwrite one another. Same free-tier reasoning as
 * the catch list: one document, one read, arrays rewritten whole.
 *
 * SIGNED OUT THERE IS NO STORE. The set stays empty, `locked` is true, and every toggle is
 * refused — the lists still render, but nothing can be ticked. That is deliberate: a
 * browser-local fallback would silently diverge from the account and then have to be
 * reconciled on sign-in.
 *
 * Load order: ui.js → store.js → auth.js → data file → page script.
 * buildNav() below builds its markup with el() from ui.js, so ui.js must come first.
 */

const Store = (() => {
  /** Progress written before sign-in existed. Read once, on first sign-in, then dropped. */
  const LEGACY_KEY = 'pogo.caught.v1';
  const listeners = new Set();

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /** Canonical key builders — the single source of truth for identity across pages. */
  const id = {
    mega: (name) => 'mega:' + slug(name),
    dmax: (artSlug) => 'dmax:' + artSlug,
    gmax: (name) => 'gmax:' + slug(name),
  };

  let set = new Set();
  let user = null;      // { uid, name, email, photo } once signed in
  let loaded = false;   // the first Firestore snapshot has landed
  let backend = null;   // { save(keys), saveNow(patch) } — installed by auth.js
  let reminders = [];   // events-page reminders; shape is remind.js's business
  let ntfy = null;      // the ntfy topic this account publishes its reminders to

  const emit = () => listeners.forEach((fn) => fn());

  /** Push the whole set down to Firestore. One write, however many keys changed. */
  const save = () => backend && backend.save([...set]);

  return {
    id,
    slug,

    /** The signed-in Google account, or null. */
    get user() { return user; },
    /** True when nothing can be ticked, i.e. nobody is signed in. */
    get locked() { return !user; },
    /** True once this account's saved progress has actually arrived. */
    get loaded() { return loaded; },
    /** Event reminders on this account. Read-only here — set them via setReminders. */
    get reminders() { return reminders; },
    /** The ntfy topic reminders are published to, or null until the first one is set. */
    get ntfyTopic() { return ntfy; },

    has: (k) => set.has(k),
    count: (keys) => keys.reduce((n, k) => n + (set.has(k) ? 1 : 0), 0),

    /** @returns false when signed out — the caller should prompt instead. */
    toggle(k) {
      if (!user) return false;
      set.has(k) ? set.delete(k) : set.add(k);
      emit();
      save();
      return true;
    },

    /**
     * @param prefixes string, array of strings, or null to clear everything.
     *                 Full keys work too — they're just prefixes that match one entry.
     * @returns false when signed out.
     */
    clear(prefixes) {
      if (!user) return false;
      if (prefixes) {
        const list = [].concat(prefixes);
        [...set].forEach((k) => list.some((p) => k.startsWith(p)) && set.delete(k));
      } else {
        set.clear();
      }
      emit();
      save();
      return true;
    },

    onChange(fn) { listeners.add(fn); },

    /* ---------- reminders (events page) ---------- */
    //
    // Unlike a tick, setting a reminder is paired with a call to an outside service, so it
    // is written immediately rather than through the 1.5s debounce — the caller has to know
    // it landed. Both apply optimistically and roll back if the write is refused, so the
    // button never settles on a state the account does not actually hold.

    async setReminders(list) {
      const before = reminders;
      reminders = list;
      emit();
      try {
        await backend?.saveNow({ reminders: list });
      } catch (err) {
        reminders = before;
        emit();
        throw err;
      }
    },

    async setTopic(topic) {
      const before = ntfy;
      ntfy = topic;
      emit();
      try {
        await backend?.saveNow({ ntfy: { topic } });
      } catch (err) {
        ntfy = before;
        emit();
        throw err;
      }
    },

    /* ---------- wiring, for auth.js only ---------- */

    _install(b) { backend = b; },
    /** Called on every auth transition. Progress arrives separately, via _receive. */
    _setUser(u) {
      user = u; loaded = false; set = new Set(); reminders = []; ntfy = null; emit();
    },
    /** A Firestore snapshot landed. `doc` is the whole document, or null for a new account. */
    _receive(keys, doc) {
      set = new Set(keys);
      reminders = (doc && doc.reminders) || [];
      ntfy = (doc && doc.ntfy && doc.ntfy.topic) || null;
      loaded = true;
      emit();
    },
    /** Everything ticked before sign-in existed, for the one-time upgrade. */
    _legacy() {
      try { return JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'); } catch { return []; }
    },
    _dropLegacy() { try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ } },
  };
})();

/**
 * Tick a tracker card. Signed out this refuses and asks for a sign-in instead, which is
 * how every card on every page enforces the gate — go through this, never Store.toggle.
 */
function trackerToggle(key) {
  if (Store.toggle(key)) return true;
  if (typeof Auth !== 'undefined') Auth.prompt();
  return false;
}

/**
 * Collapse the sticky summary bar once the page scrolls. Phones only — the CSS that acts on
 * `body.scrolled` and `.summary.open` is inside a max-width media query.
 *
 * The panel is pinned at the top of a list that can run to 160 cards, and at full height it
 * eats close to half a small viewport. Collapsed it is a one-line strip; a tap on the strip
 * opens it again, and scrolling back to the top restores it for good.
 */
function stickySummary() {
  const summary = document.querySelector('.summary');
  if (!summary) return;

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const scrolled = window.scrollY > 4;
      document.body.classList.toggle('scrolled', scrolled);
      // Back at the top the panel is full size anyway, so drop any manual expansion.
      if (!scrolled) summary.classList.remove('open');
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  summary.addEventListener('click', (e) => {
    // A tap on a filter chip, the search box or Reset is a tap on that control, not on the
    // strip — only bare panel area toggles.
    if (e.target.closest('button, input, a, label')) return;
    summary.classList.toggle('open');
  });
}

/** Shared site nav. Each page calls buildNav('<id>'). */
function buildNav(active) {
  const links = [
    ['events', 'index.html', "What's on"],
    ['megas', 'megas.html', 'Mega Pokémon'],
    ['dynamax', 'dynamax.html', 'Dynamax'],
    ['notify', 'notifications.html', 'Notifications'],
    ['archive', 'archive.html', 'Archive'],
  ];
  document.body.prepend(el('nav', { class: 'sitenav' },
    el('span', { class: 'brand', text: 'PoGO' }),
    links.map(([k, href, label]) =>
      el('a', { href, text: label, 'aria-current': k === active ? 'page' : null })),
    el('span', { class: 'spacer' }),
    el('div', { class: 'authbox', id: 'authbox' })));

  // The sign-in control and the gate banner are painted by auth.js, which may not have
  // finished loading Firebase yet — it repaints on every auth change regardless.
  if (typeof Auth !== 'undefined') Auth.mount();

  stickySummary();
}
