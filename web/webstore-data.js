/**
 * webstore-data.js — base, non-promotional unit prices from the Pokémon GO Web Store
 * (Malaysia / MYR). Hand-written, not generated: there is no public feed for this the way
 * ScrapedDuck covers the events page, and the store itself only renders region pricing to a
 * signed-in, region-matched session, so a headless fetch can't be automated the way
 * update_events.py does. Refreshing this means saving store.pokemongo.com from a Malaysia
 * session again and updating the numbers below by hand — see the Deal Check page's footer.
 *
 * WHAT THIS IS AND ISN'T. Every rate below comes from the store's own STANDALONE, full-price
 * listing for that item — never from a promo bundle. A promo's contents and price are exactly
 * the rotating "23 HOURS LEFT, ends tomorrow" kind of fact CLAUDE.md calls LIVE and says not
 * to bake into a static file, so they are never stored here — Deal Check always takes them as
 * live input, typed in from whatever the store is showing right now.
 *
 * Source: https://store.pokemongo.com/ (Malaysia web store)
 * Checked: 2026-11-20
 */

const WEBSTORE_CHECKED = '2026-11-20';

// The three currencies Deal Check compares a promo against. `via` names the exact
// standalone listing the rate was read from, since none of these items are sold as a
// literal single unit — the smallest non-promotional pack stands in as the base rate.
const WEBSTORE_BASE = {
  raidPass: {
    label: 'Raid Pass', price: 5.90, qty: 3,
    via: '"Premium Battle Pass" — 3 Raid Passes for MYR 5.90',
  },
  remoteRaidPass: {
    label: 'Remote Raid Pass', price: 5.90, qty: 2,
    via: '"Remote Raid Pass" — 2 for MYR 5.90',
  },
  coins: {
    label: 'PokéCoins', price: 1.90, qty: 110,
    via: '"110 PokéCoins" — the smallest coin pack, MYR 1.90',
  },
};

// A handful of other standalone items, for pricing out whatever else rides along in a promo
// bundle (potions, berries, incubators…). Same rule as above: every row is that item's own
// non-promotional listing, price divided by quantity — never a bundle price.
const WEBSTORE_ITEMS = [
  { label: 'Egg Incubator', price: 5.90, qty: 3 },
  { label: 'Super Incubator', price: 5.90, qty: 2 },
  { label: 'Max Potion', price: 3.90, qty: 10 },
  { label: 'Max Revive', price: 3.90, qty: 15 },
  { label: 'Golden Razz Berry', price: 3.90, qty: 15 },
  { label: 'Silver Pinap Berry', price: 3.90, qty: 10 },
  { label: 'Lucky Egg', price: 9.90, qty: 8 },
  { label: 'Star Piece', price: 11.50, qty: 8 },
  { label: 'Max Particle Pack', price: 15.50, qty: 6 },
  { label: 'Max Mushroom', price: 18.90, qty: 3 },
];
