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
 * Storage is localStorage, NOT sessionStorage: a collection log is long-lived data and
 * must survive closing the tab, restarting the browser, and the dev server going away.
 * It is per-origin, so it is shared across every page and tab of the site.
 */

const Store = (() => {
  const KEY = 'pogo.caught.v1';
  const LEGACY_SESSION_KEY = 'pogo.caught.v1';
  const listeners = new Set();

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /** Canonical key builders — the single source of truth for identity across pages. */
  const id = {
    mega: (name) => 'mega:' + slug(name),
    dmax: (artSlug) => 'dmax:' + artSlug,
    gmax: (name) => 'gmax:' + slug(name),
  };

  let set;
  try {
    set = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
    // One-time migration for progress saved before the move off sessionStorage.
    const stale = JSON.parse(sessionStorage.getItem(LEGACY_SESSION_KEY) || '[]');
    if (stale.length) {
      stale.forEach((k) => set.add(k));
      localStorage.setItem(KEY, JSON.stringify([...set]));
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
    }
  } catch {
    set = new Set(); // private mode / blocked site data — stay in memory
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch { /* ignore */ }
    listeners.forEach((fn) => fn());
  }

  return {
    id,
    slug,
    has: (k) => set.has(k),
    count: (keys) => keys.reduce((n, k) => n + (set.has(k) ? 1 : 0), 0),
    toggle(k) { set.has(k) ? set.delete(k) : set.add(k); persist(); },
    /** @param prefixes string, array of strings, or null to clear everything. */
    clear(prefixes) {
      if (prefixes) {
        const list = [].concat(prefixes);
        [...set].forEach((k) => list.some((p) => k.startsWith(p)) && set.delete(k));
      } else {
        set.clear();
      }
      persist();
    },
    onChange(fn) { listeners.add(fn); },
    refresh() {
      try { set = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch {}
      listeners.forEach((fn) => fn());
    },
  };
})();

/** Shared site nav. Each page calls buildNav('<id>'). */
function buildNav(active) {
  const links = [
    ['event', 'index.html', 'Mega Finale'],
    ['megas', 'megas.html', 'Mega Pokémon'],
    ['dynamax', 'dynamax.html', 'Dynamax'],
  ];
  const nav = document.createElement('nav');
  nav.className = 'sitenav';
  nav.innerHTML =
    '<span class="brand">PoGO</span>' +
    links
      .map(([k, href, label]) =>
        `<a href="${href}"${k === active ? ' aria-current="page"' : ''}>${label}</a>`)
      .join('');
  document.body.prepend(nav);
}

// Progress written on another page should show when this one is revealed again.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) Store.refresh();
});

// localStorage fires `storage` in OTHER tabs on write, so open pages stay in sync live.
window.addEventListener('storage', (e) => {
  if (e.key === 'pogo.caught.v1') Store.refresh();
});
