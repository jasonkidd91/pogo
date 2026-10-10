/**
 * Events the LeekDuck/ScrapedDuck feed does not carry, added by hand from Pokémon GO's own
 * news. HAND-WRITTEN — keep the sources and the verification date with every entry.
 *
 * WHY THIS EXISTS. The feed never carried PokéXciting!, the Pokémon 30th anniversary tour,
 * and a trainer missed the Kuala Lumpur stop (12–13 Sep 2026) because this page never
 * showed it. scripts/check_official_news.py now finds such gaps daily and files a
 * `missing-event` issue; an entry lands here only once a human has said yes on that issue.
 *
 * THESE ARE LIVE FACTS, so the rules are the events page's own:
 *  - Times are local wall-clock, no trailing Z — same convention as the feed.
 *  - `blurb` quotes the official article verbatim, or is left out. Never compose one.
 *  - An entry stops rendering by itself once its `end` passes; delete it at leisure.
 *  - If the feed starts carrying one of these, delete it here, or it shows twice.
 *
 * Shape matches slim() in events.js, plus `src` (the source URLs) and `checked`.
 */
const OFFICIAL_EVENTS = [
  {
    // missing-event issue #9. Malaysia's venue only; the article lists venues in the
    // Philippines, Singapore, Hong Kong and Thailand too. No hours given: the venue is a
    // mall, so it follows the mall's own opening hours.
    id: 'official:apac-mall-exploration-2026-ombak-klcc',
    name: '30th Anniversary Mall Exploration — Ombak KLCC, Kuala Lumpur',
    type: 'in-person',
    link: 'https://pokemongo.com/en/news/apac-mall-exploration-2026',
    start: '2026-10-01T00:00:00.000',
    end: '2026-12-31T23:59:00.000',
    src: [
      'https://pokemongo.com/en/news/apac-mall-exploration-2026',
      'https://pocketmonsters.net/news/9558',
    ],
    checked: '2026-10-10',
  },
  {
    // missing-event issue #13. Hours 10:00–22:00 local per the official article and
    // PocketMonsters.Net; one third-party listing says 11:00–23:00 and is the outlier.
    id: 'official:event-singapore-30th-anniversary-2026',
    name: 'PokéXciting! Singapore — Changi Airport and Jewel',
    type: 'in-person',
    link: 'https://pokemongo.com/en/news/event-singapore-30th-anniversary-2026',
    start: '2026-11-07T10:00:00.000',
    end: '2026-11-08T22:00:00.000',
    blurb: 'From November 7 to 8, 2026, Changi Airport and Jewel welcome Trainers for two days '
      + 'of festivities, including the debut of Singapore’s PokéXciting! Pikachu (Blue).',
    src: [
      'https://pokemongo.com/en/news/event-singapore-30th-anniversary-2026',
      'https://pocketmonsters.net/news/9614',
    ],
    checked: '2026-10-10',
  },
];
