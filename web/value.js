/**
 * value.js — Deal Check: is a Pokémon GO Web Store promo actually worth it?
 *
 * Not a tracker — there is nothing to tick, so no sign-in gate and no `data-tracker`, same
 * as the events, promo-codes and squad pages. Nothing here reads or writes the signed-in
 * user's Firestore document; it's a pure calculator against the base rates in
 * web/webstore-data.js, with a promo's own contents and price always typed in live (see that
 * file's header for why they are never stored here).
 *
 * Load order: ui.js -> store.js -> auth.js -> promos.js -> promo-data.js -> webstore-data.js
 * -> value.js. store.js/auth.js/promos.js/promo-data.js are here for the shared nav and its
 * unseen-promo-code nudge, which every page carries, not because this page tracks anything.
 */

const fmt = (n) => `RM ${n.toFixed(2)}`;

/** price ÷ qty for one of WEBSTORE_BASE's three currencies. */
function rate(base) {
  return base.price / base.qty;
}

/**
 * Coins vs. direct purchase, for Raid Pass and Remote Raid Pass. The coins route has a range,
 * not one number: the smallest coin pack and the largest one charge different RM per coin, so
 * "buy coins then spend them" is cheaper or pricier depending which pack you'd actually buy.
 * Direct is a single number — the Web Store's own standalone pass listing.
 */
function renderCoinCompare() {
  const grid = document.getElementById('coincompare');
  grid.textContent = '';

  const smallRate = rate(WEBSTORE_BASE.coins);
  const bulkRate = WEBSTORE_BASE.coins.bulk.price / WEBSTORE_BASE.coins.bulk.qty;

  const rows = [
    { key: 'raidPass', direct: WEBSTORE_BASE.raidPass },
    { key: 'remoteRaidPass', direct: WEBSTORE_BASE.remoteRaidPass },
  ];

  rows.forEach(({ key, direct }) => {
    const coinsNeeded = INGAME_SHOP[key].coins;
    const directRate = rate(direct);
    const viaSmall = coinsNeeded * smallRate;
    const viaBulk = coinsNeeded * bulkRate;
    // Best case for coins is the bulk pack; worst case is the smallest. Compare the direct
    // price against both ends rather than picking one, since which end applies depends
    // entirely on how big a coin pack the trainer would actually buy.
    const beatsSmall = directRate <= viaSmall;
    const beatsBulk = directRate <= viaBulk;
    // Tones name who wins, not good/bad — neither route is a mistake, so this is information,
    // not a warning.
    const tone = beatsSmall && beatsBulk ? 'direct' : !beatsSmall && !beatsBulk ? 'coins' : 'mixed';
    const verdict = beatsSmall && beatsBulk
      ? 'Direct is cheaper either way — buying coins for this never pays off.'
      : !beatsSmall && !beatsBulk
        ? 'Coins are cheaper either way — even the smallest coin pack beats buying this directly.'
        : 'Depends on the coin pack: a small pack loses to buying direct, a bulk pack wins.';

    grid.appendChild(UI.el('div', { class: 'coinrow', data: { tone } },
      UI.el('div', { class: 'coinname', text: direct.label }),
      UI.el('div', { class: 'coinvals' },
        UI.el('div', { class: 'coinval' },
          UI.el('span', { class: 'cvlbl', text: 'Direct (Web Store)' }),
          UI.el('span', { class: 'cvnum', text: fmt(directRate) })),
        UI.el('div', { class: 'coinval' },
          UI.el('span', { class: 'cvlbl', text: `Via coins (${coinsNeeded} coins)` }),
          UI.el('span', { class: 'cvnum', text: `${fmt(viaBulk)} – ${fmt(viaSmall)}`,
            title: 'Cheapest end: buying the largest coin pack. Priciest end: buying the smallest.' }))),
      UI.el('div', { class: 'coinverdict', text: verdict })));
  });
}

/** The verdict band a savings percentage falls into. Order matters: first match wins. */
const VERDICT_BANDS = [
  { min: 30, tone: 'good', text: 'Excellent deal — well below buying these separately.' },
  { min: 15, tone: 'good', text: 'Good deal — comfortably cheaper than buying separately.' },
  { min: 0, tone: 'ok', text: 'Marginal — only worth it if you want these exact items right now.' },
  { min: -Infinity, tone: 'bad', text: "Not a deal — buying separately (or skipping it) is cheaper." },
];

function verdictFor(pct) {
  return VERDICT_BANDS.find((b) => pct >= b.min);
}

function num(id) {
  const v = parseFloat(document.getElementById(id).value);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

function renderRefGrid() {
  const grid = document.getElementById('refgrid');
  grid.textContent = '';
  const rows = [
    { label: WEBSTORE_BASE.raidPass.label, rate: rate(WEBSTORE_BASE.raidPass), via: WEBSTORE_BASE.raidPass.via },
    { label: WEBSTORE_BASE.remoteRaidPass.label, rate: rate(WEBSTORE_BASE.remoteRaidPass), via: WEBSTORE_BASE.remoteRaidPass.via },
    { label: `${WEBSTORE_BASE.coins.label} (each)`, rate: rate(WEBSTORE_BASE.coins), via: WEBSTORE_BASE.coins.via },
    ...WEBSTORE_ITEMS.map((it) => ({ label: it.label, rate: it.price / it.qty, via: `${it.qty} for ${fmt(it.price)}` })),
  ];
  rows.forEach((r) => grid.appendChild(UI.el('div', { class: 'refrow', title: `From: ${r.via}` },
    UI.el('span', { class: 'refname', text: r.label }),
    UI.el('span', { class: 'refrate', text: fmt(r.rate) }))));
}

function render() {
  const raidQty = num('c-raid');
  const remoteQty = num('c-remote');
  const coinQty = num('c-coins');
  const other = num('c-other');
  const price = num('c-price');

  const raidValue = raidQty * rate(WEBSTORE_BASE.raidPass);
  const remoteValue = remoteQty * rate(WEBSTORE_BASE.remoteRaidPass);
  const coinValue = coinQty * rate(WEBSTORE_BASE.coins);
  const baseline = raidValue + remoteValue + coinValue + other;

  const out = document.getElementById('c-result');
  out.textContent = '';

  if (baseline <= 0) {
    out.appendChild(UI.empty('Enter what the bundle contains above to see what it would cost bought separately.'));
    return;
  }

  const lines = [
    raidQty > 0 && `${raidQty} Raid Pass${raidQty === 1 ? '' : 'es'} · ${fmt(raidValue)}`,
    remoteQty > 0 && `${remoteQty} Remote Raid Pass${remoteQty === 1 ? '' : 'es'} · ${fmt(remoteValue)}`,
    coinQty > 0 && `${coinQty.toLocaleString()} PokéCoins · ${fmt(coinValue)}`,
    other > 0 && `Other items (your estimate) · ${fmt(other)}`,
  ].filter(Boolean);

  const breakdown = UI.el('div', { class: 'cbreak' },
    lines.map((l) => UI.el('div', { class: 'cbrow', text: l })));

  const totals = UI.el('div', { class: 'ctotals' },
    UI.el('div', { class: 'ctot' },
      UI.el('span', { class: 'ctlbl', text: 'Bought separately' }),
      UI.el('span', { class: 'ctval', text: fmt(baseline) })),
    UI.el('div', { class: 'ctot' },
      UI.el('span', { class: 'ctlbl', text: 'This promo' }),
      UI.el('span', { class: 'ctval', text: price > 0 ? fmt(price) : '—' })));

  out.appendChild(breakdown);
  out.appendChild(totals);

  if (price <= 0) {
    out.appendChild(UI.empty('Enter the promo price to see the verdict.'));
    return;
  }

  const savings = baseline - price;
  const pct = (savings / baseline) * 100;
  const verdict = verdictFor(pct);

  out.appendChild(UI.el('div', { class: 'cverdict', data: { tone: verdict.tone } },
    UI.el('div', { class: 'cpct', text: `${savings >= 0 ? '−' : '+'}${Math.abs(pct).toFixed(0)}%` }),
    UI.el('div', { class: 'cvbody' },
      UI.el('div', { class: 'cvsave', text: savings >= 0
        ? `Saves ${fmt(savings)} versus buying these separately.`
        : `Costs ${fmt(-savings)} more than buying these separately.` }),
      UI.el('div', { class: 'cvtext', text: verdict.text }))));
}

document.addEventListener('DOMContentLoaded', () => {
  UI.summary('.summary', {
    stats: [
      { id: 's-raid', label: 'Raid Pass (base)' },
      { id: 's-remote', label: 'Remote Raid Pass (base)' },
      { id: 's-coins', label: 'PokéCoins (per 100, base)' },
    ],
  });
  UI.setStat('s-raid', fmt(rate(WEBSTORE_BASE.raidPass)));
  UI.setStat('s-remote', fmt(rate(WEBSTORE_BASE.remoteRaidPass)));
  UI.setStat('s-coins', fmt(rate(WEBSTORE_BASE.coins) * 100));

  buildNav('value');
  renderCoinCompare();
  renderRefGrid();

  ['c-raid', 'c-remote', 'c-coins', 'c-other', 'c-price'].forEach((id) => {
    document.getElementById(id).addEventListener('input', render);
  });
  render();

  const stamp = document.getElementById('freshness');
  if (stamp) stamp.textContent = `Base prices checked ${WEBSTORE_CHECKED}.`;
});
