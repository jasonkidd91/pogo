/**
 * Fallback snapshot of the Pokemon GO promo codes list, AND the data the site-wide nav nudge
 * reads on every page — see the module docstring in scripts/update_promos.py for why this one
 * file does both jobs.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_promos.py
 * Source: https://leekduck.com/promo-codes/
 * Fetched: 2026-10-10 07:41 local
 *
 * PROMO CODES ARE LIVE DATA. promo-codes.js fetches the page above on every load of
 * promo-codes.html and renders that; this file is only what it shows while the fetch is in
 * flight or if it fails, same relationship as events-data.js has to events.js.
 *
 * `expires` is copied verbatim and is NOT consistently in one timezone — most are a bare
 * local wall-clock stamp, some carry an explicit "-0700"/"-0800" offset. Do not normalise it;
 * web/promos.js's expiry parsing branches on it. `hideExpiry: true` means LeekDuck has no
 * confirmed deadline for this one and `expires` is a placeholder that must never be shown as
 * a real date — only used to detect an ALREADY-past deadline.
 */

const PROMO_FETCHED = "2026-10-10 07:41";
const PROMO_SOURCE = "https://leekduck.com/promo-codes/";

const PROMO_SNAPSHOT = [
  {"code": "LEGOxPOKEMONGOxBERRIES", "title": "LEGO × Pokémon GO Berries", "redeem": "https://store.pokemongo.com/offer-redemption?passcode=LEGOxPOKEMONGOxBERRIES", "expires": "2026-12-31 23:59:59 -0800", "hideExpiry": true, "description": "Promo code for free berries and Poké Balls tied to the Pokémon GO and LEGO Group partnership. Learn more here.", "link": "https://leekduck.com/events/lego-pokemon-go-2026/", "rewards": ["Razz Berry ×5", "Poké Ball ×10", "Pinap Berry ×5", "Nanab Berry ×5"]},
  {"code": "FENDIxFRGMTxPOKEMON", "title": "FENDI x FRGMT x POKÉMON Hoodie Avatar Item", "redeem": "https://store.pokemongo.com/offer-redemption?passcode=FENDIxFRGMTxPOKEMON", "expires": "2027-01-04 23:59:59 -0800", "hideExpiry": true, "description": "Trainers can redeem this code to get an exclusive FENDI x FRGMT x POKÉMON hoodie avatar item. (This code should have expired on January 4, 2025 but it appears to still work.)", "rewards": ["FENDI x FRGMT x POKÉMON hoodie"]}
];
