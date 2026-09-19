/**
 * promos.js — the promo-codes model, shared by every page's nav and by promo-codes.js.
 *
 * Loaded on EVERY page (after auth.js, before promo-data.js's own data file), not just
 * promo-codes.html — because buildNav() in store.js needs Promos.unseenCount() to paint the
 * nav nudge no matter which page you're on. That is the one thing here that reads
 * PROMO_SNAPSHOT rather than a live fetch, and it is allowed to be up to a day stale (see the
 * header comment in web/promo-data.js) — the dedicated page always re-checks live.
 *
 * What lives here vs. promo-codes.js: this file is the model — parsing, expiry, and the
 * per-browser "have I seen this code" bookkeeping. Card rendering (the code box, Copy,
 * Redeem, rewards) is promo-codes.js's own, built from UI primitives, because exactly one
 * page needs it — the design-system rule that a page owns its domain-specific components.
 *
 * SEEN STATE IS A BROWSER CONVENIENCE, NOT ACCOUNT STATE — deliberately localStorage, not
 * Firestore. "Have you looked at the promo codes page since this code appeared" has no
 * business following you to another device, doesn't need to survive an account switch, and
 * costs nothing to get wrong; it's exactly what CLAUDE.md's design principles mean by a
 * per-viewer convenience. Wrapped in try/catch because a private window or blocked storage
 * must not break the nav.
 */

const Promos = (() => {
  const SEEN_KEY = 'pogo.promo.seen.v1';
  const SITE = 'https://leekduck.com';

  const source = () => (typeof PROMO_SOURCE !== 'undefined' ? PROMO_SOURCE
    : 'https://leekduck.com/promo-codes/');
  const snapshot = () => (typeof PROMO_SNAPSHOT !== 'undefined' ? PROMO_SNAPSHOT : []);

  function readSeen() {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function writeSeen(set) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); }
    catch { /* private window or blocked storage — the nudge just won't persist */ }
  }

  /**
   * `data-expires` has no single timezone: a bare "YYYY-MM-DD HH:MM:SS" is local wall clock,
   * some carry an explicit "-0700"/"-0800" offset. This is the same fallback chain LeekDuck's
   * own promo-codes.js uses for the same strings, because plain `new Date(s)` is inconsistent
   * across engines for the space-separated (non-"T") form.
   */
  function expiryDate(entry) {
    const s = entry.expires;
    if (!s) return null;
    let d = new Date(s);
    if (!isNaN(d)) return d;
    d = new Date(s.replace(' ', 'T'));
    if (!isNaN(d)) return d;
    d = new Date(s.split(' ').slice(0, 2).join('T'));
    return isNaN(d) ? null : d;
  }

  /**
   * `hideExpiry` only changes what's DISPLAYED (LeekDuck shows "Expires: ???"); a hidden
   * placeholder date is always in the future, so whether it's actually past `now` is still
   * the right test for "can this still be redeemed" — see web/promo-data.js's header.
   */
  function isExpired(entry, now = new Date()) {
    const d = expiryDate(entry);
    return d ? d < now : false;
  }

  /** Active = has a real (or placeholder) expiry that hasn't passed yet. */
  function activeCodes(list) {
    const now = new Date();
    return list.filter((e) => !isExpired(e, now));
  }

  /**
   * Parses a fetched copy of the LeekDuck page into the same shape scripts/update_promos.py
   * writes into web/promo-data.js — mirror the two if you change either.
   */
  function parse(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('.promo-card')].map((card) => {
      const code = card.querySelector('.code-display .text')?.textContent.trim();
      const title = card.querySelector('.title')?.textContent.trim();
      const redeem = card.querySelector('.link-button')?.getAttribute('href');
      const expiryEl = card.querySelector('.expiry[data-expires]');
      if (!code || !title || !redeem || !expiryEl) return null;

      const descP = card.querySelector('.description p');
      const a = descP?.querySelector('a');
      const out = {
        code, title, redeem,
        expires: expiryEl.dataset.expires,
        hideExpiry: expiryEl.dataset.hideExpiry === 'true',
      };
      if (descP) out.description = descP.textContent.replace(/\s+/g, ' ').trim();
      if (a) out.link = new URL(a.getAttribute('href'), SITE).href;
      const rewards = [...card.querySelectorAll('.reward-list .reward')].map((li) => {
        const label = li.querySelector('.reward-label')?.textContent.trim();
        const qty = li.querySelector('.quantity')?.textContent.trim();
        return label && (qty ? `${label} ${qty}` : label);
      }).filter(Boolean);
      if (rewards.length) out.rewards = rewards;
      return out;
    }).filter(Boolean);
  }

  /**
   * How many currently-active codes this browser hasn't looked at yet — the nav nudge's
   * whole job. Reads the snapshot, not a live fetch: see the file header for why that's the
   * one place a day of staleness is acceptable here.
   */
  function unseenCount() {
    const seen = readSeen();
    return activeCodes(snapshot()).filter((e) => !seen.has(e.code)).length;
  }

  /**
   * Call after rendering the dedicated page — marks every code just shown as seen. Prunes
   * anything no longer in the snapshot at the same time, so the stored set can't grow
   * forever across a site with years of rotating codes.
   */
  function markSeen(list) {
    const known = new Set(snapshot().map((e) => e.code));
    const next = new Set([...readSeen()].filter((c) => known.has(c)));
    list.forEach((e) => next.add(e.code));
    writeSeen(next);
  }

  /** A snapshot of what's been seen so far, for the page to decide its own "NEW" tags
   *  against a single frozen set — see promo-codes.js, which caches this once per page load
   *  rather than re-reading after its own markSeen() call marks everything seen. */
  const seenSet = readSeen;

  return {
    source, snapshot, expiryDate, isExpired, activeCodes, parse, unseenCount, markSeen, seenSet,
  };
})();
