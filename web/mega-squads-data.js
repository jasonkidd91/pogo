/**
 * Mega Squads — Mega Raid roster
 *
 * VERIFIED 7 Sep 2026 against agreeing sources:
 *   - Official:  https://pokemongo.com/en/news/mega-squads-2026
 *   - Calendar:  https://leekduck.com/events/mega-squads/
 *   - Database:  https://pokemongohub.net/post/event/pokemon-go-mega-squads-event-guide/
 * Mega Energy cost (first-time activation) and Super Max attack: web/mega-data.js
 * (scripts/update_megas.py, sourced from the Game Master and Bulbapedia).
 *
 * GO Pass window: Tue 8 Sep 2026 10:00 – Mon 14 Sep 2026 20:00, LOCAL time (matches the
 * issue's flagged dates). LeekDuck and GO Hub agree the two raid bosses stay a day longer,
 * through 15 September — that longer window is noted on each card, not used for EVENT_END.
 *
 * NOTE: this event is the first appearance of Super Max Mega Level, which raises Beedrill's
 * and Houndoom's ceiling rather than changing what they cost to Mega Evolve the first time.
 * Neither source publishes a separate Super Max energy figure, so none is invented here.
 */

const EVENT = {
  name: 'Mega Squads',
  tagline: 'Mega Raids · local time',
  officialUrl: 'https://pokemongo.com/en/news/mega-squads-2026',
  start: '2026-09-08T10:00:00',
  end: '2026-09-14T20:00:00',
  bonuses: [
    'Chance of Mega Energy from catching Weedle, Pidgey, Houndour, Carvanha or their evolutions',
    '2× Hatch Stardust from rank 15',
    'GO Pass Deluxe: 1/2 Egg Hatch Distance for Eggs placed in an Incubator during the event',
  ],
};

const RAIDS = [
  { name: 'Mega Beedrill', art: 'beedrill-mega', energy: 100, attack: 'Fell Stinger+',
    window: 'In raids Tue 8 – Tue 15 Sep' },
  { name: 'Mega Houndoom', art: 'houndoom-mega', energy: 100, attack: 'Dark Pulse+',
    window: 'In raids Fri 11 – Tue 15 Sep' },
];
