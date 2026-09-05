# CLAUDE.md — Pokémon GO Gameplay & Research Context

> **Purpose:** Give Claude a reliable, current-context framework for answering Pokémon GO questions. This file is a reasoning/context guide, not a static encyclopedia. Pokémon GO is live-service software: events, moves, availability, battle rules, rewards, limits, and balance can change. Always verify volatile facts against current authoritative sources before giving a definitive answer.

## 1. Scope and current snapshot

- Game: **Pokémon GO**, the location-based mobile game.
- Research date: **2026-09-05**.
- Trainer level cap: **80** since the October 15, 2025 leveling update. The increase affects Trainer level, **not the Pokémon level cap**. Current community/database reporting continues to treat Pokémon Level 50 as the maximum; XL Candy is used for the Level 40–50 range.
- Standard GO Battle League (GBL) uses the **rebuilt PvP battle system introduced June 23, 2026**. Do not apply old timing/turn assumptions automatically.
- Current major gameplay systems include:
  - catching, evolving, powering up, appraisal/IVs
  - Gyms and defending
  - Raid Battles, including Remote Raids and Shadow Raids
  - Mega Evolution and Primal Reversion
  - Team GO Rocket and Shadow/Purified Pokémon
  - GO Battle League and other Trainer Battles
  - Dynamax/Gigantamax, Power Spots, Max Battles and Max Moves
  - Buddy Adventure
  - Eggs/incubators and Adventure Sync
  - Research, Collection Challenges and event-specific tasks
  - Routes
  - Party Play
  - Friendship, Gifts, Trading and Lucky Pokémon
  - Adventure Effects and other event/live-service systems

## 2. Source hierarchy — use this before answering

### Tier 1 — Official Pokémon GO / Niantic sources
Use these for current rules, eligibility, limits, feature behavior, announcements, event dates, and changes.

- Official Pokémon GO: https://pokemongo.com/en
- Official Pokémon GO news: https://pokemongo.com/news
- Pokémon GO Help Center: https://niantic.helpshift.com/hc/en/6-pokemon-go/

**Rule:** If an official source conflicts with an older wiki/database page, prefer the official source for current game behavior.

### Tier 2 — Structured specialist databases
Use these for Pokémon/move/stat lookups and comparative data, while remembering that values can change.

- Pokémon GO Hub Database: https://db.pokemongohub.net/
  - Useful for Pokémon stats, moves, counters, IVs, PvE/PvP rankings, type attackers, Dynamax attackers, buddy distance and database lookups.
- Pokémon Database — GO: https://pokemondb.net/go
  - Useful for Pokédex, base stats, types, catch/flee data, moves, evolutions and type chart.
- Pokémon GO Wiki (Fandom): https://pokemongo.fandom.com/wiki/Pok%C3%A9mon_GO_Wiki
  - Useful as a broad community reference and historical/mechanical index, but it may be blocked to automated access and can contain stale pages. Verify important/current facts elsewhere.
- Wikipedia: https://en.wikipedia.org/wiki/Pok%C3%A9mon_Go
  - Good for broad history/background, not the preferred authority for exact live-game mechanics.

### Tier 3 — Community/analysis sources
Use for strategy, simulations, PvP/PvE analysis, practical recommendations and interpretation. Treat claims as secondary until corroborated where accuracy matters.

## 3. Volatility model

Every answer should classify facts mentally:

**High volatility — verify live**
- current events, event bonuses, raids and raid bosses
- current wild/research/egg availability
- current GBL cups and eligible Pokémon
- current move stats, move availability and balance changes
- Remote Raid limits and temporary bonuses
- Max Battle/Power Spot rotations
- Team GO Rocket lineups
- shop boxes, item prices and temporary offers
- temporary evolution requirements or Adventure Effects
- seasonal bonuses and local/global event rules

**Medium volatility — verify when relevant**
- exact feature limits
- Buddy heart/activity details
- Mega/Primal rules and energy costs
- Max Move costs/effects
- research slot behavior
- friendship/trading restrictions

**Low volatility — usually stable, but verify if the user asks for exact/current values**
- basic concepts such as CP, HP, Candy, Stardust, Fast Attacks, Charged Attacks
- broad type relationships
- existence of PokéStops, Gyms, Raids and the Pokédex

## 4. Core game model

Pokémon GO combines:
1. **Location/exploration** — the Trainer moves in the real world and interacts with map objects.
2. **Collection** — catch, hatch, evolve, trade and complete the Pokédex.
3. **Resource management** — Candy, Candy XL, Stardust, Mega Energy, Primal Energy, Max Particles, items and passes.
4. **Combat** — Gyms, Raids, Max Battles, Team GO Rocket and PvP.
5. **Progression** — Trainer XP/levels, Pokémon investment, medals, friendship and research.
6. **Live service** — Seasons and events modify spawns, bonuses, research, raids, moves and eligibility.

The Map View includes nearby Pokémon, PokéStops, Gyms, Raids, Power Spots, Routes, Showcases/RSVP-related information and access to research/events.

## 5. Pokémon identity and stats

A Pokémon in GO is not equivalent to the same Pokémon in the main-series games.

Important concepts:
- **Species/base stats:** species-level Attack, Defense and HP/Stamina data used by GO.
- **IVs:** individual Attack, Defense and HP/Stamina values.
- **CP:** a derived combat-strength value; it is not a direct substitute for IVs or battle usefulness.
- **HP:** current/max health.
- **Level:** hidden/derived investment state; Power Ups raise it.
- **Moves:** Fast Attack + Charged Attack(s), with separate PvE/PvP move properties.
- **Forms:** regional forms, costumes, shadows, purified, Mega, Primal, Dynamax/Gigantamax and other special forms can behave differently.
- **Appraisal:** in-game display of IV quality.

Do not answer “higher CP = always better.” PvP, raids, gyms, Max Battles and collection goals use different optimization criteria.

## 6. Powering up and resources

### Stardust
Universal resource used for powering Pokémon and various actions.

### Candy
Family-specific resource. Example: Bulbasaur, Ivysaur and Venusaur use the Bulbasaur family’s Candy.

Candy can come from catching, hatching, transferring and other activities.

### Candy XL
Family-specific resource used for high-level Pokémon investment. Current official help states it begins being obtainable at Trainer Level 31 and is required for powering Pokémon beyond the normal-Candy range.

Do not confuse:
- Trainer Level
- Pokémon Level
- Candy
- Candy XL

### Evolving
Evolution is normally permanent and spends Candy, sometimes with additional conditions/items/walking/area/effect requirements. Evolution can change stats, moves, type or battle role.

## 7. Moves and combat vocabulary

Every Pokémon normally has:
- 1 Fast Attack
- 1 Charged Attack

A second Charged Attack can be unlocked with Stardust + Candy.

Fast Attacks:
- deal damage
- generate Charged Attack energy

Charged Attacks:
- consume energy
- deal larger damage
- may have buffs/debuffs depending on the move and battle mode

TMs:
- Fast TM: rerolls Fast Attack
- Charged TM: rerolls Charged Attack
- Elite TMs: allow selection from a broader/legacy/event move pool

**Important:** Move power/energy/duration can differ between:
- Gyms/Raids (PvE)
- Trainer Battles/GBL (PvP)
- Max Battles

Never use a PvE move value as a PvP value without checking.

## 8. Type effectiveness

Type matchup is central to battle strategy.

When recommending counters:
1. Identify the boss/opponent's type(s).
2. Identify weaknesses/resistances.
3. Check current move availability and move stats.
4. Consider raid/PvE versus PvP versus Max Battle rules.
5. Consider weather, Mega/Primal boosts, party bonuses and other applicable modifiers.
6. Prefer current database/official data over memory.

Do not assume the main-series damage chart maps perfectly to every GO battle mechanic.

## 9. PvE: Gyms and Raids

### Gyms
- Rival-team Pokémon can be battled to reduce motivation.
- A Gym can hold up to six defenders.
- One Trainer can place one Pokémon in a Gym.
- Defenders lose motivation over time and through battles.
- When defenders are defeated after reaching zero motivation, they return.
- Defending can earn PokéCoins, subject to the current daily limit.

### Raid Battles
Raid Bosses occupy Gyms temporarily.
Typical flow:
1. enter/RSVP
2. use an applicable Raid Pass
3. select a battle party
4. defeat the boss within the battle timer
5. receive rewards and an encounter opportunity if successful

The current Help Center states:
- raid groups can have up to 20 Trainers
- Remote Raids are available for many raids
- current standard Remote Raid participation limit is 10 per day, subject to event changes
- remote participation may have an attack-power modifier; verify the current rule before calculating damage

**Shadow Raids:** Rules have evolved. Since May 13, 2025, Shadow Raids can be joined remotely, and they count toward the Remote Raid daily limit. Shadow Raid Bosses can become enraged; Purified Gems can suppress the enraged state.

## 10. Mega Evolution and Primal Reversion

### Mega Evolution
- Temporary transformation, not permanent evolution.
- Uses species-specific Mega Energy.
- Improves battle performance and can change type.
- Only one Mega-Evolved Pokémon can be active at a time.
- A Mega-Evolved Pokémon normally remains Mega for 8 hours.
- Repeated Mega Evolution increases Mega Level and reduces future energy requirements over time.
- Mega Levels can provide additional gameplay bonuses.

### Primal Reversion
- Similar temporary transformation for eligible Pokémon.
- Uses species-specific Primal Energy.
- Can improve battle performance and provide special bonuses.
- Only one Pokémon can be Mega-Evolved or Primal at a time.

When recommending a Mega/Primal:
- distinguish “best attacker” from “best boost/support Mega”
- consider the boss's type and the user's goal (damage, candy farming, XL farming, XP, etc.)
- verify current Mega Level bonuses and event rules

## 11. Shadow Pokémon and Purified Pokémon

Shadow Pokémon:
- are obtained from Team GO Rocket encounters
- deal increased damage
- also take increased damage
- require more Stardust/Candy for some investment
- normally know **Frustration** when caught

Frustration generally cannot be removed with a normal Charged TM except during designated events.

Purifying:
- costs Stardust + Candy
- improves appraisal
- lowers investment costs
- replaces Frustration with Return
- can be strategically worse than keeping a Shadow if the Shadow's damage advantage is valuable

Never say “purify every Shadow with high IVs.” The correct decision depends on PvE/PvP/collection goals and the specific Pokémon.

## 12. Dynamax, Gigantamax, Power Spots and Max Battles

Max Pokémon are a distinct gameplay system.

- **Dynamax:** Pokémon become huge and gain access to Max Moves.
- **Gigantamax:** special transformation with a changed appearance and a species-specific G-Max move.
- Max Pokémon are encountered through/around Power Spots and Max Battles.
- Only Dynamax/Gigantamax Pokémon are usable in Max Battles.
- Max Moves include an attack plus support options such as Max Spirit and Max Guard.
- Max Battles use **Max Particles**.
- In Max Battles, the battle party fights the Power Spot Boss; filling the top meter allows the Pokémon to Dynamax/Gigantamax for a limited number of turns.
- Dodging and collecting energy icons can matter.
- Current official information allows up to 40 Trainers in a Gigantamax Max Battle, organized into groups of four or fewer.
- Remote Max Battles may require both a Remote Raid Pass and the applicable Max Particle amount.

Verify current Max Battle limits/costs because this system is actively evolving.

## 13. PvP / GO Battle League

### Leagues
Common CP caps:
- Great League: 1,500 CP
- Ultra League: 2,500 CP
- Master League: no CP cap

Special Cups can add:
- type restrictions
- species restrictions
- CP limits
- bans/exclusions
- special rules

Always check the current season/cup announcement before giving a team recommendation.

### PvP fundamentals
A Trainer Battle uses:
- Fast Attacks
- Charged Attacks
- Protect Shields
- switching
- type matchups
- energy management
- timing/turn management

### Critical 2026 update
**June 23, 2026:** Pokémon GO rolled out a rebuilt PvP battle system. The official announcement says the system uses short, fixed-duration turns and was redesigned to make outcomes more consistent and less dependent on network/device timing.

Therefore:
- do not blindly apply pre-June-2026 PvP timing guides
- when discussing advanced PvP mechanics, explicitly state whether the source describes the current 2026 system or the old system
- verify current turn/charge/swap/CMP behavior from current sources before giving frame-perfect advice

## 14. PvP team-building methodology

When asked “best team,” do not answer from CP alone.

Evaluate:
1. Current cup rules.
2. Species eligibility.
3. Current move pool.
4. PvP move stats/energy.
5. IV distribution and CP optimization.
6. Team coverage.
7. Leads, safe swaps and closers.
8. Common current meta threats.
9. Shield scenarios.
10. Current move/balance changes.
11. User's available Pokémon and resources.

For Great/Ultra League, a Pokémon with lower Attack IV can sometimes be preferable because GO's CP formula weights Attack heavily; however, “0/15/15 is always best” is false. The optimal IV spread depends on species, moves, CP threshold, breakpoint/bulkpoint behavior and current meta.

## 15. Catching

Catch quality can be affected by:
- Pokémon species/base catch rate
- level
- ball type
- Berry
- throw quality
- curveball
- medals
- weather/event modifiers
- special encounter rules

Use official current mechanics for exact bonuses. Do not fabricate exact catch probabilities.

Important terms:
- Nice / Great / Excellent throw
- Curveball
- Razz / Pinap / Silver Pinap / Golden Razz and other berries
- Poké Ball / Great Ball / Ultra Ball / event-specific balls

## 16. Eggs and hatching

Eggs are placed into Incubators and hatch after the required walking distance.

Current official Help Center:
- one free infinite-use Incubator is available
- additional Incubators can hatch multiple eggs simultaneously
- Egg pools are dynamic and can change with events
- the in-game Egg screen is the most direct source for the current pool
- Adventure Sync can record walking distance while the app is closed

Never assume an Egg pool is permanent. Always verify the current pool for an event/date.

## 17. Adventure Sync

Adventure Sync can record distance while Pokémon GO is not open, supporting:
- Egg hatching
- Buddy Candy
- weekly activity/reward tracking

It requires the relevant permissions/integration. Exact eligibility and behavior should be verified against current Help Center documentation.

## 18. Daily Adventure Incense

Standard current behavior:
- Daily Adventure Incense lasts 15 minutes.
- It is designed to attract unexpected wild Pokémon while the Trainer is moving in the real world.
- It is granted daily.
- It has a special late-night availability/grant cutoff; verify the current local-time rule if the user asks for exact timing.
- Under certain ball-inventory conditions, the game may grant Poké Balls when activating it.

Do not confuse Daily Adventure Incense with standard Incense.

## 19. Buddy Adventure

A Buddy can:
- earn hearts
- improve Mood
- provide relationship perks
- earn Candy through walking
- appear on the Map
- participate in relevant activities
- provide gifts/souvenirs and other bonuses at higher relationship states

Current Help Center says a Buddy can be swapped up to 20 times per day.

For exact heart limits, Mood mechanics, excited-buddy behavior and distance, verify the current Help Center because these values/features can change.

## 20. Routes

Routes are predefined paths that can be created by Niantic, partners or Trainers.

Following a Route can:
- expose Pokémon
- provide bonuses
- grant rewards
- award a Route badge

Routes can be discovered through the Nearby menu and Campfire.

Do not confuse Routes with arbitrary walking paths; they are registered in-game routes with start/end points and moderation.

## 21. Party Play

Party Play lets **2–4 Trainers** team up physically nearby.

Uses include:
- Party Challenges
- shared gameplay
- special bonuses
- rewards
- raid-related coordination

Party members need to be physically near each other. Verify current level eligibility and challenge details if asked.

## 22. Friends, Gifts, Trading and Lucky Pokémon

Friendship provides progressive bonuses and enables Gifts/trading.

Trading:
- Trainers must be physically near one another.
- Trading can change CP/HP/stats.
- Trading distance can affect Candy received.
- Special Trades include categories such as Legendary, Shiny, certain unregistered Pokémon/forms and other special cases.
- Mythical Pokémon generally cannot be traded.
- A Pokémon that has already been traded cannot be traded again.
- Current Help Center says trading requires Trainer Level 10+.

Lucky Pokémon:
- can result randomly from trades
- are more likely to be strong opponents
- require less Stardust to power up
- older Pokémon have increased Lucky odds

Do not state exact Lucky odds unless verified from a current reliable source.

## 23. Research

Research categories currently include:
- Field Research
- Sponsored Research
- Special Research
- Timed Research
- Level-Up Research

Field Research:
- generally obtained from PokéStops
- one task can be collected per PokéStop per day
- current Help Center states up to four Field Research tasks can be held, with the fourth slot tied to Bonus Research conditions
- seven Field Research stamps produce a Research Breakthrough

Special Research:
- persistent until completed
- cannot normally be discarded
- multi-part story/task structure

Timed Research:
- expires after its specified time window

Level-Up Research:
- current post-2025 leveling system uses Level-Up Research for levels 71–80.

Collection Challenges are event-linked and can require a Pokémon to be obtained by a specific method (catch, hatch, evolve, trade, raid, Shadow, costume, etc.).

## 24. Adventure Effects

Adventure Effects are temporary bonuses activated by attacks known by certain Pokémon.

Examples currently documented by the Help Center include:
- Origin Forme Dialga
- Origin Forme Palkia
- Black Kyurem
- White Kyurem
- Dusk Mane Necrozma
- Dawn Wings Necrozma
- Crowned Shield Zamazenta
- Crowned Sword Zacian

Do not assume every signature move has an Adventure Effect. Verify the specific Pokémon/move.

## 25. Recommendation logic

When asked “What should I power up/evolve/use?” first identify the objective:

- **Raids:** maximize sustained relevant PvE damage, team coverage, survivability and resource efficiency.
- **Gym offense:** type advantage + practical damage/survivability.
- **Gym defense:** longevity/motivation ecosystem and current defensive utility, not raid DPS.
- **GBL:** league eligibility, IV/CP optimization, moves, meta, team composition and current cup rules.
- **Max Battles:** Dynamax/Gigantamax eligibility, Max Moves, boss matchup and current Max Battle rules.
- **Rocket:** matchup, shields, move timing and current Rocket lineup.
- **Collection:** dex entry, shiny, costume, regional/form, background/location, rarity.
- **XP:** Lucky Egg/event timing, evolution/catch/research opportunities.
- **Stardust:** prioritize high-value Pokémon rather than spending universally.
- **Candy/XL:** use Mega/Primal and event bonuses where applicable, but verify current bonus rules.

If the user supplies a screenshot/list of Pokémon, evaluate each Pokémon as an individual asset rather than assuming species alone determines the answer.

## 26. Exact-value policy

When an answer depends on an exact number, use a current source.

Examples:
- move damage/energy
- CP
- IVs
- Stardust/Candy costs
- XL Candy costs
- raid timers
- remote limits
- event dates
- spawn/egg/research pools
- Max Particle costs
- Mega/Primal energy costs
- GBL cup restrictions

If sources disagree:
1. Prefer a current official source for rules.
2. Prefer a maintained specialist database for structured stats.
3. Identify the disagreement.
4. Give the date/source context.
5. Do not silently merge old and new mechanics.

## 27. Search strategy for Claude

For a current gameplay question:

### Step A — Identify the domain
Examples:
- “best counter” → PvE database + official current boss/event rules
- “best GBL team” → current official GBL cup + current PvP data
- “can I remote this raid?” → official Raid/Remote Raid help
- “should I purify?” → official Shadow mechanics + current PvE/PvP analysis
- “how many coins?” → official Defender Bonus help
- “what hatches?” → current in-game/event source + current database
- “Dynamax best move?” → official Max Battle mechanics + current GO Hub structured data

### Step B — Check date
If the question includes “today,” “now,” “current,” “this season,” “this event,” or similar, search current sources.

### Step C — Cross-check
For important claims, use at least:
- one official source, and
- one specialist database/community source when a numerical or strategic judgment is involved.

### Step D — Explain uncertainty
If the result depends on event rotation, weather, moveset, IVs, friendship, Mega Level, PvP cup, or temporary bonus, state that dependency.

## 28. Source-specific use

### Official Pokémon GO / Niantic
Best for:
- rules
- feature definitions
- announcements
- current changes
- eligibility
- official limits
- event information

### Pokémon GO Hub Database
Best for:
- Pokémon structured data
- move data
- PvE attackers
- PvP rankings
- counters
- IV/database lookup
- Dynamax attacker comparisons

### Pokémon Database GO
Best for:
- Pokédex
- base stats
- types
- moves
- evolution references
- type chart
- catch/flee data

### Fandom Wiki
Best for:
- broad mechanics discovery
- historical mechanics
- niche terminology
- cross-referencing
But verify current facts.

### Wikipedia
Best for:
- history
- broad overview
- major milestones
Not for exact current gameplay values.

## 29. Important 2026 changes to remember

### Trainer level
October 15, 2025:
- Trainer Level cap increased from 50 to 80.
- Level-up progression was rebalanced.
- Level-Up Research is associated with levels 71–80.
- Trainer level increase does not raise Pokémon's maximum level.

### PvP
June 23, 2026:
- rebuilt PvP battle system rolled out.
- fixed-duration turn structure and more consistent resolution are central to the new system.
- The 2026 World Championships used the Competitors Cup under the current/previous battle-system rules as specified by the official announcement.
- Do not conflate Competitors Cup rules with ordinary post-June-23 GBL.

### Remote Shadow Raids
May 13, 2025:
- Shadow Raids became remotely joinable.
- They count toward the Remote Raid daily limit.

### Max Battles
The Max system is a major current pillar:
- Power Spots
- Max Particles
- Dynamax
- Gigantamax
- Max Moves
- local/remote participation rules

## 30. Known source/access caveat

The Fandom Pokémon GO Wiki may block automated access via robots.txt. If it cannot be retrieved, do **not** invent its contents. Use official Help Center/news plus GO Hub/Pokémon Database instead.

The provided Wikipedia page is useful as a broad background source, but its gameplay details may lag live-service changes.

## 31. Anti-hallucination rules

Never:
- invent a current raid boss
- invent an event date
- claim a move is currently available without checking
- claim a Pokémon is eligible for a cup without checking the current cup
- use old PvP mechanics as current mechanics
- treat CP as a complete measure of battle quality
- assume all forms share moves/stats/eligibility
- claim Shadow Pokémon should always be purified
- claim an Egg pool is permanent
- claim a current shop offer without a current source
- fabricate exact probabilities, costs or limits
- cite a source that was not actually consulted

If exact current information cannot be verified, say so and provide the best verified general rule.

## 32. Response format recommendation

For factual questions:
1. **Direct answer**
2. **Why**
3. **Important conditions/exceptions**
4. **Current-source verification** when the fact is volatile

For “best” recommendations:
1. User objective
2. Candidate ranking
3. Relevant moves/stats
4. Resource cost
5. Matchup/context
6. Recommendation
7. Caveats

For team-building:
- ask for or infer league/cup
- ask for Pokémon roster if optimization is personal
- include moves and IV/CP considerations
- distinguish PvP from PvE

## 33. Primary references reviewed for this context file

Official/current sources reviewed:
- Pokémon GO official site: https://pokemongo.com/en
- Pokémon GO news: https://pokemongo.com/news
- Trainer Battle 2026 update: https://pokemongo.com/en/news/pvp-updates-competitors-cup-2026
- PvP foundation update: https://pokemongo.com/news/pvp-updates2026
- Trainer level 80 update: https://pokemongo.com/news/pgo-leveling-update-details-2025
- Max Battles / Gigantamax: https://pokemongo.com/max-pokemon-battle
- Shadow Raid/Max Battle update: https://pokemongo.com/news/shadow-raid-max-battle-update
- Pokémon GO Help Center: https://niantic.helpshift.com/hc/en/6-pokemon-go/
- Raid Battles: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2187-what-are-raid-battles/
- Remote Battles: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2487-joining-battles-remotely/
- Gym Battles: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/83-battling-at-gyms/
- PvP Trainer Battles: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2308-battling-other-trainers/
- Fast/Charged Attacks: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1011-fast-attacks-charged-attacks/
- Type effectiveness: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2132-type-effectiveness-in-battle/
- Powering Up: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2372-powering-up-pokemon/
- Shadow/Purified: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2396-shadow-pokemon-purified-pokemon/
- Mega Evolution: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/3328-what-is-mega-evolution/
- Primal Reversion: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/3774-primal-reversion/
- Max Pokémon: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/4795-what-are-max-pokemon-1729886792/
- Buddy Adventure: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2155-buddy-adventure/
- Adventure Sync: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/3265-adventure-sync/
- Routes: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/4175-what-are-routes/
- Party Play: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/4310-what-is-party-play/
- Research: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/45-types-of-research/
- Eggs: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2358-incubators-hatching-pokemon-eggs/
- Trading: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/96-trading-pokemon/
- Lucky Pokémon: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/38-lucky-pokemon/
- Adventure Effects: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/4386-what-are-adventure-effects/

Specialist references reviewed:
- Pokémon GO Hub Database: https://db.pokemongohub.net/
- Pokémon GO Hub XL Candy guide (Aug. 27, 2026): https://pokemongohub.net/post/guide/xl-candy-guide-how-to-get-power-up-costs-and-mechanics/
- Pokémon Database GO Pokédex: https://pokemondb.net/go/pokedex
- Pokémon GO Wiki: https://pokemongo.fandom.com/wiki/Pok%C3%A9mon_GO_Wiki
- Wikipedia — Pokémon Go: https://en.wikipedia.org/wiki/Pok%C3%A9mon_Go

## 34. Final instruction to Claude

Treat Pokémon GO as a **live, versioned game**, not a static ruleset.

When a user asks something relevant to Pokémon GO:
- identify the game mode
- identify whether the fact is volatile
- check current official information when needed
- cross-check structured data for numerical/strategic questions
- separate PvE, PvP and Max Battle mechanics
- distinguish species, form, IVs, CP, Pokémon Level and Trainer Level
- state important assumptions
- never silently rely on outdated pre-2026 PvP mechanics
- provide the answer in practical Trainer language
