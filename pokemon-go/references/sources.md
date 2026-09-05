# Source registry and conflict resolution

## Tier 1 — Official (authoritative for rules, dates, limits, eligibility, rewards)

| URL | Use for |
|---|---|
| `https://pokemongo.com/en` | Home, current highlights |
| `https://pokemongo.com/news` | Canonical announcement index — the first stop for anything LIVE |
| `https://pokemongo.com/en/seasons` | Current season overview |
| `https://pokemongo.com/en/events` | Event calendar |
| `https://pokemongo.com/en/go-pass` | Current pass ranks and bonuses |
| `https://niantic.helpshift.com/hc/en/6-pokemon-go/` | Help Center — the mechanics of record |

News slugs are predictable and directly fetchable, e.g. `pokemongo.com/news/<event-slug>`.

Useful Help Center deep links (stable FAQ ids):

- Raid Battles — `/faq/2187-what-are-raid-battles/`
- Joining battles remotely — `/faq/2487-joining-battles-remotely/`
- Battling at Gyms — `/faq/83-battling-at-gyms/`
- Trainer Battles (PvP) — `/faq/2308-battling-other-trainers/`
- Fast / Charged Attacks — `/faq/1011-fast-attacks-charged-attacks/`
- Type effectiveness — `/faq/2132-type-effectiveness-in-battle/`
- Powering up — `/faq/2372-powering-up-pokemon/`
- Shadow / Purified — `/faq/2396-shadow-pokemon-purified-pokemon/`
- Mega Evolution — `/faq/3328-what-is-mega-evolution/`
- Primal Reversion — `/faq/3774-primal-reversion/`
- Max Pokémon — `/faq/4795-what-are-max-pokemon-1729886792/`
- Buddy Adventure — `/faq/2155-buddy-adventure/`
- Adventure Sync — `/faq/3265-adventure-sync/`
- Routes — `/faq/4175-what-are-routes/`
- Party Play — `/faq/4310-what-is-party-play/`
- Research types — `/faq/45-types-of-research/`
- Incubators / hatching — `/faq/2358-incubators-hatching-pokemon-eggs/`
- Trading — `/faq/96-trading-pokemon/`
- Lucky Pokémon — `/faq/38-lucky-pokemon/`
- Adventure Effects — `/faq/4386-what-are-adventure-effects/`

> The Help Center is hosted on `nianticlabs.com` infrastructure. That is a hosting artefact, not
> evidence about who currently operates the game — see `contested-facts.md`.

## Tier 2 — Structured data and analysis

| URL | Use for |
|---|---|
| `https://db.pokemongohub.net/` | Base stats, movesets, counters, DPS/TDO, rankings |
| `https://db.pokemongohub.net/best/raid-attackers` | PvE attacker rankings |
| `https://db.pokemongohub.net/best/great-league` (`/ultra-league`, `/master-league`) | PvP rankings |
| `https://db.pokemongohub.net/best/attackers-per-type/<type>` | Per-type counter lists |
| `https://db.pokemongohub.net/tools/cp-calculator` | CP / IV calculations |
| `https://db.pokemongohub.net/moves-list/category-fast` · `/category-charge` | **PvE** move stats |
| `https://db.pokemongohub.net/moves-list/pvp/category-fast` · `/pvp/category-charge` | **PvP** move stats — different values |
| `https://pokemongohub.net/post/guide/current-go-raids/` | Current raid rotation |
| `https://pokemondb.net/go/type` · `/go/pokedex` · `/go/shiny` | Type chart, dex, shiny availability |
| `https://pokemondb.net/go/community-days` · `/go/spotlight-hours` | Event history |
| `https://leekduck.com/` | De-facto community calendar; fast and reliable for schedules |
| `https://pvpoke.com/` | PvP simulation, rankings, IV/rank checker |

## Tier 3 — Encyclopaedic

- `https://bulbapedia.bulbagarden.net/wiki/Raid_Battle_(GO)` — excellent on raid internals and formulas.
- `https://pokemongo.fandom.com/wiki/Pokémon_GO_Wiki` — deep mechanics pages; community-edited, often
  stale, and **frequently blocks automated fetching via robots.txt**. If it can't be retrieved, do not
  invent its contents — fall back to the Help Center plus GO Hub.
- `https://en.wikipedia.org/wiki/Pokémon_Go` — history, business, reception, controversies. Weak and
  lagging on live gameplay.

## Conflict resolution

Official > Bulbapedia / GO Hub > Fandom > aggregator blogs and SEO content farms.

- For **rules and eligibility**, official wins outright.
- For **exact numbers** (move power, energy, CPM, breakpoints), a maintained specialist database beats
  official copy, which is usually vague or absent on numbers. GO Hub and Bulbapedia document the
  datamined reality.
- When sources disagree: name the disagreement, give the date and source for each, and **do not
  silently merge old and new mechanics into one confident answer.**
- Never cite a content farm as a sole source.

## Cross-check rule

For any claim that carries a numeric or strategic judgement, use at least one official source **and**
one specialist database. For pure schedule questions, LeekDuck or the official events page alone is fine.
