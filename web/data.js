/**
 * Pokémon GO Fest 2026: Mega Finale — Mega Raid roster
 *
 * VERIFIED 5 Sep 2026 against three agreeing sources:
 *   - Official:   https://pokemongo.com/gofest/megafinale
 *   - Calendar:   https://leekduck.com/events/pokemon-go-fest-2026-mega-finale/
 *   - Database:   https://pokemongohub.net/post/event/pokemon-go-fest-2026-mega-finale/
 * Mega Energy costs (first-time activation):
 *   - https://bulbapedia.bulbagarden.net/wiki/Mega_Evolution_(GO)
 *
 * Event window: Sat 5 Sep 2026 10:00 – 18:00 and Sun 6 Sep 2026 10:00 – 18:00, LOCAL time.
 * Each of the four daily habitats runs twice: once in the morning block, once in the afternoon.
 *
 * NOTE: neither the official event page nor GO Hub publishes per-Pokémon Mega Energy costs for
 * this event, so costs below are the standing FIRST-TIME activation costs, parsed from
 * Bulbapedia's wikitext. Mega Mewtwo X/Y sit in their own 7,500 tier, confirmed both in that
 * page's cost-tier table and in their roster rows.
 */

const EVENT = {
  name: 'Pokémon GO Fest 2026: Mega Finale',
  tagline: 'Free · unticketed · global',
  officialUrl: 'https://pokemongo.com/gofest/megafinale',
  bonuses: [
    'No limit on Remote Raids for the whole event',
    'All Mega-Evolved Pokémon get an extra CP boost',
    'Armored Mewtwo in 5★ raids both days',
  ],
};

/** Sprite art: mainline Mega artwork where it exists, base-species art otherwise. */
const ART = 'https://img.pokemondb.net/sprites/home/normal/';

/**
 * `art` is the Mega slug; `artFallback` is used when no mainline Mega artwork exists.
 * The seven GO-original Megas (Victreebel, Starmie, Malamar, Raichu, Skarmory, Falinks,
 * Dragonite) have no mainline Mega form, so they fall back to base-species art.
 */
const DAYS = [
  {
    id: 'sat',
    label: 'Saturday',
    date: '5 September 2026',
    isoDate: '2026-09-05',
    superRaid: {
      name: 'Mega Mewtwo X',
      art: 'mewtwo-mega-x',
      energy: 7500,
      energyNote: 'Mega Mewtwo sits in its own 7,500 cost tier',
      tier: 'Super Mega Raid',
      time: 'All day · 10:00 – 18:00',
    },
    habitats: [
      {
        name: 'Verdant Overgrowth',
        blocks: ['10:00 – 11:00', '14:00 – 15:00'],
        pokemon: [
          { name: 'Mega Beedrill', art: 'beedrill-mega', energy: 100 },
          { name: 'Mega Victreebel', art: 'victreebel-mega', artFallback: 'victreebel', energy: 300, isNew: true },
          { name: 'Mega Pinsir', art: 'pinsir-mega', energy: 200 },
          { name: 'Mega Abomasnow', art: 'abomasnow-mega', energy: 200 },
        ],
      },
      {
        name: 'Mindworks Canal',
        blocks: ['11:00 – 12:00', '15:00 – 16:00'],
        pokemon: [
          { name: 'Mega Alakazam', art: 'alakazam-mega', energy: 200 },
          { name: 'Mega Slowbro', art: 'slowbro-mega', energy: 100 },
          { name: 'Mega Starmie', art: 'starmie-mega', artFallback: 'starmie', energy: 300, isNew: true },
          { name: 'Mega Medicham', art: 'medicham-mega', energy: 100 },
        ],
      },
      {
        name: 'Eerie Alley',
        blocks: ['12:00 – 13:00', '16:00 – 17:00'],
        pokemon: [
          { name: 'Mega Gengar', art: 'gengar-mega', energy: 200 },
          { name: 'Mega Houndoom', art: 'houndoom-mega', energy: 100 },
          { name: 'Mega Banette', art: 'banette-mega', energy: 100 },
          { name: 'Mega Malamar', art: 'malamar-mega', artFallback: 'malamar', energy: 300, isNew: true },
        ],
      },
      {
        name: 'Circuit Plaza',
        blocks: ['13:00 – 14:00', '17:00 – 18:00'],
        pokemon: [
          { name: 'Mega Raichu X', art: 'raichu-mega-x', artFallback: 'raichu', energy: 300, isNew: true },
          { name: 'Mega Ampharos', art: 'ampharos-mega', energy: 200 },
          { name: 'Mega Manectric', art: 'manectric-mega', energy: 100 },
        ],
      },
    ],
  },
  {
    id: 'sun',
    label: 'Sunday',
    date: '6 September 2026',
    isoDate: '2026-09-06',
    superRaid: {
      name: 'Mega Mewtwo Y',
      art: 'mewtwo-mega-y',
      energy: 7500,
      energyNote: 'Mega Mewtwo sits in its own 7,500 cost tier',
      tier: 'Super Mega Raid',
      time: 'All day · 10:00 – 18:00',
    },
    habitats: [
      {
        name: 'Iron Frostworks',
        blocks: ['10:00 – 11:00', '14:00 – 15:00'],
        pokemon: [
          { name: 'Mega Steelix', art: 'steelix-mega', energy: 200 },
          { name: 'Mega Skarmory', art: 'skarmory-mega', artFallback: 'skarmory', energy: 300, isNew: true },
          { name: 'Mega Aggron', art: 'aggron-mega', energy: 200 },
          { name: 'Mega Glalie', art: 'glalie-mega', energy: 200 },
        ],
      },
      {
        name: 'Battle District',
        blocks: ['11:00 – 12:00', '15:00 – 16:00'],
        pokemon: [
          { name: 'Mega Sharpedo', art: 'sharpedo-mega', energy: 200 },
          { name: 'Mega Camerupt', art: 'camerupt-mega', energy: 200 },
          { name: 'Mega Lopunny', art: 'lopunny-mega', energy: 200 },
          { name: 'Mega Falinks', art: 'falinks-mega', artFallback: 'falinks', energy: 300, isNew: true },
        ],
      },
      {
        name: 'Skyline Roosts',
        blocks: ['12:00 – 13:00', '16:00 – 17:00'],
        pokemon: [
          { name: 'Mega Gyarados', art: 'gyarados-mega', energy: 300 },
          { name: 'Mega Aerodactyl', art: 'aerodactyl-mega', energy: 200 },
          { name: 'Mega Dragonite', art: 'dragonite-mega', artFallback: 'dragonite', energy: 300, isNew: true },
          { name: 'Mega Altaria', art: 'altaria-mega', energy: 300 },
        ],
      },
      {
        name: 'Prism Promenade',
        blocks: ['13:00 – 14:00', '17:00 – 18:00'],
        pokemon: [
          { name: 'Mega Raichu Y', art: 'raichu-mega-y', artFallback: 'raichu', energy: 300, isNew: true },
          { name: 'Mega Sableye', art: 'sableye-mega', energy: 100 },
          { name: 'Mega Mawile', art: 'mawile-mega', energy: 200 },
          { name: 'Mega Audino', art: 'audino-mega', energy: 200 },
        ],
      },
    ],
  },
];
