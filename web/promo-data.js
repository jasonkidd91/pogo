/**
 * Fallback snapshot of the Pokemon GO promo codes list, AND the data the site-wide nav nudge
 * reads on every page — see the module docstring in scripts/update_promos.py for why this one
 * file does both jobs.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_promos.py
 * Source: https://leekduck.com/promo-codes/
 * Fetched: 2026-09-25 22:02 local
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

const PROMO_FETCHED = "2026-09-25 22:02";
const PROMO_SOURCE = "https://leekduck.com/promo-codes/";

const PROMO_SNAPSHOT = [
  {"code": "LEGOxPOKEMONGOxCAP", "title": "LEGO × Pokémon GO Cap Timed Research", "redeem": "https://store.pokemongo.com/offer-redemption?passcode=LEGOxPOKEMONGOxCAP", "expires": "2026-09-30 23:59:00", "hideExpiry": false, "description": "Redeem this promo code for Bonus Timed Research that awards berries, XP, Stardust, and the 2026 LEGO® Pokémon Cap. The Cap Timed Research is unavailable in Japan, Taiwan, Hong Kong, Singapore, Thailand, and Indonesia, where LEGO® Pokémon™ products are not sold. Trainers in these regions can still redeem the code for alternate Timed Research with different rewards, including a Lucky Egg. Tasks must be completed and rewards claimed before Wednesday, September 30, 2026, at 11:59 p.m. local time. Research details here.", "link": "https://leekduck.com/events/lego-pokemon-go-2026/", "rewards": ["Pinap Berry ×3", "Razz Berry ×3", "Nanab Berry ×3", "XP ×1000", "Stardust ×1000", "2026 LEGO® Pokémon Cap"]},
  {"code": "MLBxPOKEMONGO2026", "title": "MLB-branded T-shirt Avatar Item", "redeem": "https://store.pokemongo.com/offer-redemption?passcode=MLBxPOKEMONGO2026", "expires": "2026-09-30 23:59:59 -0700", "hideExpiry": false, "description": "To celebrate the Pokémon GO and Major League Baseball collaboration returning for the 2026 season, trainers can redeem this code to get an exclusive MLB-branded T-shirt avatar item. Offer code available for redemption until September 30, 2026. Learn more here.", "link": "https://pokemongo.com/post/mlb-2026", "rewards": ["MLB-branded T-shirt"]},
  {"code": "LEGOxPOKEMONGOxBERRIES", "title": "LEGO × Pokémon GO Berries", "redeem": "https://store.pokemongo.com/offer-redemption?passcode=LEGOxPOKEMONGOxBERRIES", "expires": "2026-12-31 23:59:59 -0800", "hideExpiry": true, "description": "Promo code for free berries and Poké Balls tied to the Pokémon GO and LEGO Group partnership. Learn more here.", "link": "https://leekduck.com/events/lego-pokemon-go-2026/", "rewards": ["Razz Berry ×5", "Poké Ball ×10", "Pinap Berry ×5", "Nanab Berry ×5"]}
];
