/**
 * Promo codes page — every currently-redeemable Pokémon GO promo code, with Copy and Redeem.
 *
 * Same relationship to its source as events.js has to the events feed: this fetches
 * LeekDuck's promo codes page live on every load and renders that, painting PROMO_SNAPSHOT
 * (web/promo-data.js) immediately so the page is never blank while the request is in flight,
 * and falling back to it if the request fails. The footer's freshness line says which of the
 * two is on screen. See web/promos.js for the model (parsing, expiry, the "seen" bookkeeping
 * behind the nav nudge) — this file is only the rendering.
 *
 * DISABLING AN EXPIRED CODE. A code that expired between this page's last daily-snapshot
 * refresh and now still has to be caught: it's shown, struck through, with no Copy or Redeem
 * — never silently offered as if it still worked. Recomputed every render, same reasoning as
 * events.js recomputing "is this live right now" rather than trusting a baked flag.
 *
 * Load order: ui.js -> store.js -> auth.js -> promos.js -> promo-data.js -> promo-codes.js.
 */

const SOURCE = Promos.source();

let codes = [];
let source = 'snapshot';   // snapshot | live | stale
let checkedAt = typeof PROMO_FETCHED !== 'undefined' ? PROMO_FETCHED : null;

// Captured once, before this page's own markSeen() call marks everything seen — otherwise a
// 60-second re-render would wipe every "NEW" tag out from under someone still reading the page.
let seenAtLoad = null;
let marked = false;

function dateText(d) {
  return d.toLocaleString([], {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

/** "in 2 days", "in 3 h" — same coarsening events.js uses for a countdown. */
function rel(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'any moment';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.round(hrs / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

const DAY = 86400000;

function expiryLine(entry, now) {
  const d = Promos.expiryDate(entry);
  if (!d) return { text: 'No expiry given', urgent: false };
  if (d < now) {
    return { text: entry.hideExpiry ? 'Expired' : `Expired ${dateText(d)}`, urgent: false };
  }
  if (entry.hideExpiry) return { text: 'Expires: date not confirmed', urgent: false };
  const ms = d - now;
  const urgent = ms < DAY;
  return { text: urgent ? `Expires in ${rel(ms)}` : `Expires ${dateText(d)} · ${rel(ms)} left`,
           urgent };
}

function codeRow(entry, expired) {
  const textEl = UI.el('code', { class: 'pcode-text', text: entry.code });
  if (expired) return UI.el('div', { class: 'pcode' }, textEl);

  const copyBtn = UI.el('button', { class: 'elink', text: 'Copy', on: { click: () => {
    navigator.clipboard.writeText(entry.code).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    }, () => {
      // Clipboard API refused (non-secure origin, or the browser blocked it) — select the
      // text instead so Ctrl-C / Cmd-C still works. Same fallback remind.js uses for the
      // ntfy topic, and for the same reason: one extra keystroke beats a dead button.
      const range = document.createRange();
      range.selectNodeContents(textEl);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      copyBtn.textContent = 'Select & Ctrl-C';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });
  } } });

  return UI.el('div', { class: 'pcode' },
    textEl, copyBtn,
    UI.el('a', { class: 'elink', href: entry.redeem, target: '_blank', rel: 'noopener',
                 text: 'Redeem' }));
}

function promoCard(entry, now) {
  const expired = Promos.isExpired(entry, now);
  const isNew = !expired && seenAtLoad && !seenAtLoad.has(entry.code);
  const exp = expiryLine(entry, now);

  return UI.el('article', { class: 'pcard' + (expired ? ' expired' : '') },
    UI.el('div', { class: 'phead' },
      UI.el('h3', { text: entry.title }),
      isNew && UI.tag('tag-new', 'NEW', 'Added since you last checked this page')),
    entry.description && UI.el('p', { class: 'pdesc', text: entry.description }),
    entry.rewards?.length > 0
      && UI.el('p', { class: 'prewards', text: 'Rewards: ' + entry.rewards.join(' · ') }),
    codeRow(entry, expired),
    UI.el('div', { class: 'pfoot' },
      UI.el('span', { class: 'pexpiry' + (exp.urgent ? ' urgent' : '') + (expired ? ' expired' : ''),
                      text: exp.text }),
      entry.link && UI.el('a', { class: 'elink', href: entry.link, target: '_blank',
                                  rel: 'noopener', text: 'Details' })));
}

function render() {
  const now = new Date();
  if (!seenAtLoad) seenAtLoad = Promos.seenSet();

  const active = Promos.activeCodes(codes);
  const expired = codes.filter((e) => !active.includes(e));
  const sorted = [...active].sort(
    (a, b) => Promos.expiryDate(a) - Promos.expiryDate(b));

  const list = document.getElementById('list');
  list.textContent = '';
  if (!codes.length) {
    list.appendChild(UI.empty('No promo codes are listed right now.'));
  } else {
    list.appendChild(UI.grid('wide', sorted.map((e) => promoCard(e, now))));
    if (expired.length) {
      list.appendChild(UI.sectionHead({ title: 'Recently expired', count: String(expired.length) }));
      list.appendChild(UI.grid('wide', expired.map((e) => promoCard(e, now))));
    }
  }

  UI.setStat('c-active', active.length);
  UI.setStat('c-soon', active.filter((e) => {
    const d = Promos.expiryDate(e);
    return d && !e.hideExpiry && d - now < 3 * DAY;
  }).length);

  paintSource();

  if (!marked) { Promos.markSeen(active); marked = true; }
}

function paintSource() {
  const node = document.getElementById('freshness');
  if (!node) return;
  node.className = 'freshness ' + source;
  node.textContent = {
    live: `Live from LeekDuck · checked ${checkedAt}`,
    snapshot: `Loading the live list… showing the saved copy from ${checkedAt}`,
    stale: `Live page unreachable — showing the saved copy from ${checkedAt}. A code here may have already expired.`,
  }[source];
}

async function refresh() {
  try {
    const res = await fetch(SOURCE, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const parsed = Promos.parse(await res.text());
    if (!parsed.length && !document.querySelector('.pcard')) {
      // Could be a genuinely code-free day, or the parser silently matching nothing — only
      // treat it as failure when there's no snapshot already on screen to fall back to.
      throw new Error('parsed 0 cards');
    }
    codes = parsed;
    source = 'live';
    checkedAt = new Date().toLocaleString([], {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch (err) {
    console.warn('[promo-codes] live fetch unavailable, keeping the saved copy', err);
    source = 'stale';
  }
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  UI.summary('.summary', {
    stats: [
      { id: 'c-active', label: 'Active codes', tone: 'ok' },
      { id: 'c-soon', label: 'Expiring within 3 days', tone: 'hl' },
    ],
  });

  buildNav('promos');

  codes = typeof PROMO_SNAPSHOT !== 'undefined' ? PROMO_SNAPSHOT.slice() : [];
  render();          // paint the snapshot immediately — never an empty page while fetching
  refresh();

  setInterval(render, 60_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
});
