# CLAUDE.md — Pokémon GO Domain Context

**Purpose:** Give an AI assistant enough grounded, structured knowledge about Pokémon GO to answer player questions accurately, and — just as importantly — to know *which* questions it must not answer from memory.

**Compiled:** 5 September 2026
**Primary sources:** pokemongo.com (official), pokemongo.fandom.com, en.wikipedia.org/wiki/Pokémon_Go, db.pokemongohub.net, pokemondb.net/go

---

## 0. The single most important rule

Pokémon GO is a **live-service game that changes weekly**. Roughly 70% of what players ask about is content that rotates on a 1-day to 3-month cycle. Answering those questions from training data is the dominant failure mode.

Before answering, classify the question into one of three volatility tiers:

| Tier | Description | Behaviour |
|---|---|---|
| **STABLE** | Formulas, type chart, core mechanics, definitions, history | Answer directly from this file |
| **SLOW** | Season name/dates, level cap, feature sets, Mega roster, GBL cup rules | Answer from this file **but state the as-of date** and offer to verify |
| **LIVE** | Today's raid bosses, current spawns, active event, Spotlight Hour, egg pools, GBL rotation this week, shiny availability, tier lists | **Do not answer from memory. Search or fetch first.** |

If a question mixes tiers (very common — "what's the best counter for today's raid boss?"), split it: look up the LIVE part, then reason with the STABLE part.

### Phrases that force a live lookup
"today", "right now", "current", "this week", "this month", "active", "featured", "in raids now", "still available", "latest", "best right now", "meta", "should I use X in GBL".

---

## 1. Source hierarchy

Use in this order. Do not skip to a lower tier when a higher tier covers the question.

### Tier 1 — Official (authoritative for rules, dates, rewards)
| URL | Use for |
|---|---|
| `https://pokemongo.com/en` | Home / latest highlights |
| `https://pokemongo.com/news` | Every announcement; the canonical index |
| `https://pokemongo.com/en/seasons` | Current season overview |
| `https://pokemongo.com/en/events` | Full event calendar |
| `https://pokemongo.com/en/go-pass` | Current GO Pass ranks and bonuses |
| `https://pokemongo.com/en/reward-road` | Reward Road progression |
| `https://pokemongo.com/en/code-redemption` | Promo code redemption |
| `https://niantic.helpshift.com/hc/en/6-pokemon-go/` | Help Center — mechanics of record |

News article slugs are predictable and fetchable, e.g.
`https://pokemongo.com/news/seasons--twilight-trails`,
`https://pokemongo.com/news/go-battle-league-twilight-trails`,
`https://pokemongo.com/news/mega-squads-2026`.

### Tier 2 — Data & analysis
| URL | Use for |
|---|---|
| `https://db.pokemongohub.net/` | Base stats, movesets, counters, DPS/TDO, tier lists |
| `https://db.pokemongohub.net/best/raid-attackers` | PvE attacker tier list |
| `https://db.pokemongohub.net/best/great-league` (`/ultra-league`, `/master-league`) | PvP tier lists |
| `https://db.pokemongohub.net/best/attackers-per-type/<type>` | Per-type counters |
| `https://db.pokemongohub.net/tools/cp-calculator` | CP / IV maths |
| `https://db.pokemongohub.net/moves-list/category-fast` and `/category-charge` | Move stats (PvE) |
| `https://db.pokemongohub.net/moves-list/pvp/category-fast` and `/pvp/category-charge` | Move stats (PvP — **different values**) |
| `https://pokemongohub.net/post/guide/current-go-raids/` | Current raid rotation |
| `https://pokemondb.net/go/type` | GO type chart |
| `https://pokemondb.net/go/pokedex` | GO Pokédex |
| `https://pokemondb.net/go/shiny` | Shiny availability |
| `https://pokemondb.net/go/community-days` / `/spotlight-hours` | Event history |

### Tier 3 — Encyclopaedic
- `https://pokemongo.fandom.com/wiki/Pokémon_GO_Wiki` — deep mechanics pages (raid tier scalars, damage formula internals). Community-edited; corroborate anything surprising.
- `https://en.wikipedia.org/wiki/Pokémon_Go` — history, business, reception, controversies. Weak on live gameplay.
- `https://bulbapedia.bulbagarden.net/wiki/Raid_Battle_(GO)` — excellent for raid internals.
- `https://leekduck.com/` — de-facto community calendar; fast and accurate for schedules.

### Source conflict resolution
Official > Bulbapedia/GO Hub > Fandom > aggregator blogs. Where official wording is ambiguous, GO Hub and Bulbapedia usually document the datamined reality. Never cite an SEO content farm as the sole source.

---

## 2. Game identity snapshot

- Released 6 July 2016. Augmented-reality, GPS-driven mobile game. iOS, Android, Samsung Galaxy Store.
- Originally developed and published by **Niantic**, in partnership with Nintendo, Creatures and Game Freak under The Pokémon Company.
- **Ownership changed.** Niantic's games division was sold to **Scopely** for US$3.5 billion; the deal was announced March 2025 and closed **29 May 2025**. Pokémon GO, Pikmin Bloom, Monster Hunter Now, Campfire and Wayfarer moved to Scopely; Ingress and Peridot stayed with the spun-off Niantic Spatial. Current in-game and site copyright reads **© Scopely Explore**.
- **Do not describe Niantic as the current operator.** Many older sources and much training data still do. Legal/ToS pages still live on nianticlabs.com, which reinforces the mistake.
- Playable in 14 languages. Free-to-play with in-app purchases and a separate **Web Store** (usually better value than in-app, and the route for many premium items).
- Roughly 951 Pokémon in the game as of February 2026, including regional forms, out of ~1,028 in the wider franchise.
- 2026 is a double-anniversary year: 10 years of Pokémon GO (July) and Pokémon's 30th anniversary franchise-wide ("PokéXciting!").

---

## 3. Core loop

Walk in the real world → your avatar moves on the map → Pokémon spawn, PokéStops and Gyms appear at real points of interest.

- **Catch:** throw Poké Balls at wild spawns. No wild battling. Rewards Candy + Stardust + XP.
- **Spin:** PokéStops and Gyms have photo discs. Spinning yields items, Eggs, Gifts and Field Research. Interaction radius is **80 m** (doubled during COVID and made permanent in August 2021). A stop can be re-spun after ~5 minutes.
- **Hatch:** Eggs (2/5/7/10/12 km) hatch by walking, with Incubators. Adventure Sync tracks distance with the app closed.
- **Power up / evolve:** spend Candy + Stardust.
- **Battle:** Gyms, Raids, Team GO Rocket, GO Battle League, Max Battles.
- **Socialise:** Friends, Gifts, trading, Party Play, Campfire meetups.

### Trainer progression
- Trainer level cap is **80**, raised from 50 on **15 October 2025** with a full rebalance of the XP curve. Reaching 80 takes roughly 203 million XP.
- Levels 1–70 are XP-gated only. **Levels 71–80 additionally require completing Level-Up Research tasks** (Platinum medals, XL power-ups, specific raid wins, Legendary catches, and so on).
- **Pokémon max level is still 50.** The level-80 change affected *Trainer* levels only. CP multipliers and the CP formula were explicitly unchanged.
- Level-40-to-50 avatar rewards from the old system are retired; the Level 50 Jacket is no longer obtainable.

### Teams
At level 5 you join Team Valor (red, Candela), Team Mystic (blue, Blanche) or Team Instinct (yellow, Spark). Teams matter for Gym control only.

---

## 4. Pokémon stats and maths (STABLE — safe to answer from memory)

### The three stats
Every species has base **Attack**, **Defense**, **Stamina**. Each individual Pokémon additionally has **IVs** (Individual Values) of 0–15 in each of the three. A "hundo" is 15/15/15.

Final stat = (Base + IV) × CPM, where CPM is the CP Multiplier for that Pokémon's level.

### CP formula
```
CP = floor( (Atk × sqrt(Def) × sqrt(Sta) × CPM²) / 10 )

where Atk = BaseAttack  + IV_Attack
      Def = BaseDefense + IV_Defense
      Sta = BaseStamina + IV_Stamina
```
Minimum CP is 10. HP = floor((BaseStamina + IV_Stamina) × CPM).

### CPM reference points
CPM rises with level in 0.5 steps. Selected values:
`L1 = 0.094`, `L20 = 0.5974`, `L25 = 0.667934`, `L30 = 0.7317`, `L40 = 0.7903`, `L50 = 0.8403`.
Levels 41–50 progress in even increments of 0.0025 per half-level (41 = 0.7953 … 50 = 0.8403).

### Powering up
- Levels 1–40: Stardust + regular Candy.
- Levels 40–50: Stardust + **Candy XL**. A standard Pokémon costs **296 Candy XL and 250,000 Stardust** to go 40 → 50. Shadow costs more; Purified costs less.
- Candy XL unlocks at **Trainer level 31**.
- Candy XL sources: catching (guaranteed 1 for a 2nd-stage evolution, 2 for a 3rd-stage, 3 for Legendary/Mythical), transferring, hatching, trading, Buddy walking, feeding at Gyms, and converting 100 regular Candy → 1 Candy XL.

### Appraisal
In-game appraisal reports IV quality as a 0–4 star band plus per-stat bars. It never shows raw numbers; players use search strings (`4*`, `3*`, `0*`) or third-party calculators.

### Key IV nuance for PvP
In CP-capped leagues (Great 1500, Ultra 2500), **low Attack IV is usually better**. Lower Attack lets you power the Pokémon to a higher level under the same CP cap, which buys more Defense and HP. A 0/15/15 frequently outperforms a 15/15/15 in Great League. This is counter-intuitive and worth stating explicitly whenever a player asks about IVs.

In Master League and all PvE (raids, gyms), higher IVs are simply better and 15/15/15 is optimal.

---

## 5. Type chart (GO-specific — STABLE)

GO uses the same effectiveness *relationships* as the main series but **different multipliers**, and **there are no immunities** — immunities become double-resistances.

| Result | Multiplier |
|---|---|
| Super effective | ×1.6 |
| Double super effective (dual type) | ×2.56 |
| Neutral | ×1.0 |
| Not very effective | ×0.625 |
| Ineffective (main-series immunity, or NVE + NVE) | ×0.390625 |
| Very ineffective (immunity + NVE) | ×0.244 |

Dual-type stacking: SE+SE = 2.56; SE+NVE = 1.0; SE+immune = 0.625; NVE+NVE = 0.39; NVE+immune = 0.244.

### Attacking type → defenders

| Attacking | ×1.6 against | ×0.625 against | ×0.39 against |
|---|---|---|---|
| **Normal** | — | Rock, Steel | Ghost |
| **Fire** | Grass, Ice, Bug, Steel | Fire, Water, Rock, Dragon | — |
| **Water** | Fire, Ground, Rock | Water, Grass, Dragon | — |
| **Electric** | Water, Flying | Electric, Grass, Dragon | Ground |
| **Grass** | Water, Ground, Rock | Fire, Grass, Poison, Flying, Bug, Dragon, Steel | — |
| **Ice** | Grass, Ground, Flying, Dragon | Fire, Water, Ice, Steel | — |
| **Fighting** | Normal, Ice, Rock, Dark, Steel | Poison, Flying, Psychic, Bug, Fairy | Ghost |
| **Poison** | Grass, Fairy | Poison, Ground, Rock, Ghost | Steel |
| **Ground** | Fire, Electric, Poison, Rock, Steel | Grass, Bug | Flying |
| **Flying** | Grass, Fighting, Bug | Electric, Rock, Steel | — |
| **Psychic** | Fighting, Poison | Psychic, Steel | Dark |
| **Bug** | Grass, Psychic, Dark | Fire, Fighting, Poison, Flying, Ghost, Steel, Fairy | — |
| **Rock** | Fire, Ice, Flying, Bug | Fighting, Ground, Steel | — |
| **Ghost** | Psychic, Ghost | Dark | Normal |
| **Dragon** | Dragon | Steel | Fairy |
| **Dark** | Psychic, Ghost | Fighting, Dark, Fairy | — |
| **Steel** | Ice, Rock, Fairy | Fire, Water, Electric, Steel | — |
| **Fairy** | Fighting, Dragon, Dark | Fire, Poison, Steel | — |

### Damage formula (PvE)
```
Damage = floor( 0.5 × Power × (Attack / Defense) × STAB × Effectiveness × Weather × Friendship × Mega × Dodge ) + 1
```
- **STAB** (Same Type Attack Bonus) = **1.2**
- **Weather boost** on a matching-type move = **1.2**
- Attack/Defense are the *effective* stats of attacker and defender.

---

## 6. Combat systems

### 6.1 Gyms
- 6 slots per Gym, one Pokémon per species per Gym, must be your team's colour.
- Defenders lose motivation over time and when beaten; feeding Berries restores it.
- You earn **PokéCoins based on defence time**, capped at **50 coins per day**. Legendary, Mythical and your current Buddy cannot be placed.
- Gyms double as PokéStops and host Raids.

### 6.2 Raid Battles
Up to 20 trainers per lobby. Beat the boss and you get **Premier Balls** (count scales with damage dealt, team contribution, friendship and gym control) for a single catch attempt at a fixed encounter.

| Raid type | Boss HP | Stat multiplier | Timer |
|---|---|---|---|
| 1★ | 600 | 0.5974 | 180 s |
| 3★ | 3,600 | 0.73 | 180 s |
| Community Day Raid (local only) | 9,000 | 0.79 | 180 s |
| Mega Raid | 9,000 | 0.79 | 300 s |
| 5★ Legendary | 15,000 | 0.79 | 300 s |
| Ultra Wormhole (Ultra Beasts) | 15,000 | 0.79 | 300 s |
| Elite Raid (local only) | 20,000 | 0.79 | 300 s |
| Primal Raid | 22,500 | 0.79 | 300 s |
| Mega Legendary Raid | 22,500 | 0.79 | 300 s |
| **Super Mega Raid** | 25,000 | 0.79 | 300 s |

Raid catch levels: **level 20** normally, **level 25** if weather-boosted. Minimum IVs are **10/10/10**, or **6/6/6** when weather-boosted (a weather-boosted raid catch can therefore roll *lower* IVs than an unboosted one — an easy thing to get wrong).

**Passes:** one free daily Raid Pass from spinning a Gym disc; Premium Battle Passes for extra local raids; **Remote Raid Passes** for distant raids (up to 10 per day since May 2025, and usable for Shadow Raids and Max Battles). Since February 2026, **Link Charges** are an alternative entry currency for Mega content.

**Shadow Raids** (May 2023–): 1★, 3★ and 5★ tiers featuring Team GO Rocket bosses. The boss becomes **enraged**, sharply raising its Attack and Defense; **Purified Gems** calm it. Remote entry became possible in May 2025.

**Elite Raids:** in-person only, hatch on a long timer, require a large group.

**Party Play:** up to 4 local trainers (level 15+) form a party; landing Fast Attacks fills a **Party Power** gauge that makes each member's next Charged Attack deal double damage. Combined with a Mega Evolution's damage aura, a coordinated group of 4 routinely outperforms an uncoordinated 6.

### 6.3 Mega Evolution — substantially reworked in 2026
This is the area where stale knowledge causes the most errors. The 2026 system:

- **Mega Levels are per-individual Pokémon, not per species.** Two Charizard track separately. Tiers: **Base → High → Max → Super Max**. Super Max was added February 2026.
- Higher Mega Level shortens the rest cooldown, reduces Mega Energy cost, and improves catch bonuses (extra Candy, better Candy XL odds for type-matched catches) while that Mega is active.
- **Super Max unlocks an additional Charged Attack** while Mega Evolved, and that attack's power scales with Mega Level. Reaching Super Max requires being at Max level first *and* spending further Mega Energy — Mega Evolving repeatedly is not sufficient.
- **Super Mega Raids** (debuted February 2026 with GO Tour: Kalos) demand roughly **8+ trainers, every one of whom must bring an active Mega**. The boss raises **shields** that only a Mega's Charged Attack can break, and each trainer may break exactly one. Catches from Super Mega Raids skew to higher IVs.
- **Link Charges** are the currency for Mega Raid entry. They are stored in the **Link Holder**, a permanent, undeletable Key Item with a default cap of **600**. Earned from Weekly Challenges (typically 250), opening Gifts, Campfire meetup check-ins, GO Pass ranks and research; also purchasable. Roughly **150 charges** for a local Mega Raid, **200** for a remote Super Mega Raid. Link Charges do **not** work for 1★, 3★, standard 5★ or Shadow Raids.
- Mega Evolution entered the **GO Battle League** starting with the Twilight Trails season, including dedicated "Mega Edition" cups. Mega CP is temporarily reduced during battle in CP-capped Mega Edition formats and restored afterwards.

### 6.4 GO Battle League (GBL)
- 3v3, real-time, with two **Protect Shields** per side and free switching (with a switch cooldown).
- Moves: one **Fast Attack** that generates energy, up to two **Charged Attacks** that spend it. Charged Attacks can raise/lower stats.
- **Move stats differ between PvP and PvE.** Always check the PvP move list for PvP questions and the PvE list for raids. Confusing the two is a frequent, invisible error.
- Core leagues: **Great (≤1500 CP)**, **Ultra (≤2500 CP)**, **Master (no cap)**. Plus rotating cups with type/species/CP restrictions (Little Cup ≤500 CP and unevolved only, Retro, Fantasy, Willpower, Catch Cup, seasonal themed cups).
- Ranks 1–20 then **Ace → Veteran → Expert → Legend**, driven by an Elo-style rating. **Ranks reset every season.**
- Normally 5 sets of 5 battles per day (25 battles). Twilight Trails adds a **GO Battle Thursday** with 10 sets (50 battles) and up to 4× Stardust from wins.
- Feeds the **Pokémon GO Championship Series** and the Pokémon World Championships.

### 6.5 Team GO Rocket
Grunts at invaded PokéStops and in balloons; Leaders **Cliff, Arlo, Sierra**; boss **Giovanni**. Fight with a 3v3 format using **Radar** items assembled from **Mysterious Components**.

**Shadow Pokémon**: +20% Attack, −20% Defense. That trade makes them the strongest PvE attackers in the game and the reason Shadow legendaries dominate raid tier lists. **Purifying** raises level and IVs (+2 to each IV), cheapens evolution and power-ups, and teaches Return — but permanently removes the Shadow attack bonus. Shadow Pokémon know **Frustration** and it can only be removed during specific limited-time windows.

**Guidance to give players:** purify only for Pokédex/PvP/cost reasons. For raids, keep it Shadow.

### 6.6 Max Battles (Dynamax / Gigantamax)
Introduced September 2024, expanded since.

- Fought at **Power Spots** on the map, not Gyms. Entry costs **Max Particles** (MP), gathered by walking and from Power Spots.
- Up to 4 trainers per Dynamax battle. **Gigantamax** battles support up to **100 trainers** split into groups of four (raised from 40 in August 2025).
- Only Pokémon caught in Dynamax/Gigantamax form can Dynamax. Plus Crowned Sword Zacian, Crowned Shield Zamazenta and Eternatus.
- Max Moves: **Max Attack** (type determined by the Pokémon's Fast Attack type, or a species-specific G-Max Move), **Max Guard** (defence), **Max Spirit** (healing), **Max Cheer** (refills the Max Meter after a wipe).
- Dynamax Pokémon have their own separate power-up track (Max Moves are levelled with Candy).

---

## 7. Catching, weather and shinies

### Catch mechanics
Success depends on the species' base catch rate, the Pokémon's level, ball type, throw quality, Berries, curveballs and medals.

- **Balls:** Poké Ball ×1, Great Ball ×1.5, Ultra Ball ×2. Premier Balls (raids) and Beast Balls (Ultra Beasts) are ×1 but unlimited-quality-neutral.
- **Throws:** Nice ×1.0–1.3, Great ×1.3–1.7, Excellent ×1.7–2.0. **Curveball ×1.7.**
- **Berries:** Razz ×1.5, Silver Pinap ×1.8 catch + 2× Candy, **Golden Razz ×2.5**. Nanab steadies movement. Pinap doubles Candy.
- **Medals:** type medals give a multiplicative catch bonus (up to ~1.3 at Platinum for each matching type).
- Higher-level Pokémon are harder to catch; that is why CP scales with catch difficulty.

### Weather boost
Real-world weather (via the in-game weather layer) boosts matching types. Boosted spawns are **level 25 minimum instead of level 20**, give bonus Stardust, appear more often, and matching-type moves do **1.2×** damage.

| Weather | Boosted types |
|---|---|
| Clear / Sunny | Grass, Ground, Fire |
| Rain | Water, Electric, Bug |
| Partly Cloudy | Normal, Rock |
| Cloudy | Fairy, Fighting, Poison |
| Windy | Dragon, Flying, Psychic |
| Snow | Ice, Steel |
| Fog | Dark, Ghost |

### Shiny Pokémon
- Base wild shiny rate is roughly **1 in 500**; boosted event rates are commonly ~1 in 64 (Community Day) or ~1 in 128 (event-boosted); Legendary raids are around **1 in 20**.
- Shiny status is per-encounter and cannot be influenced by the player. There is no shiny charm.
- **Availability is LIVE data** — always check `pokemondb.net/go/shiny` or GO Hub rather than asserting a species "can" or "can't" be shiny.

### Lucky Pokémon
Trading can produce Lucky Pokémon: guaranteed **minimum 12/12/12 IVs** and half the Stardust cost to power up. **Lucky Friends** (a random chance when interacting with a Best Friend) guarantees a Lucky trade. The **Lucky Trinket**, a limited-time GO Pass Deluxe item, instantly makes you Lucky Friends with a Great Friend or higher.

---

## 8. Social systems

- **Friends:** Good → Great → Ultra → Best (0/7/30/90 days of interaction). Higher friendship gives raid damage bonuses, cheaper trades and more Premier Balls.
- **Gifts:** collected from PokéStops, sent to friends; contain items, Stardust, **7 km Eggs** and Postcards. Default caps are around 30 opened per day, raised by GO Pass milestones (e.g. 40/day at Tier 2). Gifts are now also a Link Charge source.
- **Trading:** requires physical proximity (100 m). Costs Stardust, scaling with friendship level and whether the Pokémon is new to your Pokédex, Legendary or Shiny. Special Trades (Legendary/Shiny/new-dex) are limited to **one per day**. Trading randomises IVs within a friendship-dependent floor — never trade a hundo expecting it to survive.
- **Party Play:** local co-op with shared challenges and Party Power. See §6.2.
- **Campfire:** companion app for local meetups; now also a Link Charge source via check-ins.
- **Routes:** player-created walking paths; completing them gives rewards including Zygarde Cells.
- **Showcases:** size competitions at designated PokéStops; the biggest specimen of a species wins.
- **Mateo's Gift Exchange:** an NPC gift-exchange system that supplies a distinct 7 km Egg pool.

---

## 9. Items and currencies

| Currency | Source | Spent on |
|---|---|---|
| **Stardust** | Catching, hatching, raids, GBL, gym defence | Power-ups, trades, second Charged Attacks |
| **Candy** | Catching, hatching, transferring, Buddy walking | Evolving, power-ups |
| **Candy XL** | Level 31+; catching/transferring/hatching/trading/Buddy; 100 Candy conversion | Levels 40–50 |
| **Rare Candy / Rare Candy XL** | Raids, research, GBL | Converts to any species' Candy |
| **PokéCoins** | 50/day max from gym defence, or purchase | Shop items, storage upgrades |
| **Mega Energy** | Mega Raids, Buddy walking, research | Mega Evolution and Mega Levels |
| **Max Particles** | Power Spots, walking | Max Battle entry, Max Move upgrades |
| **Link Charges** | Weekly Challenges, Gifts, Campfire, GO Pass, shop | Mega Raid / Super Mega Raid entry |

**Key Items** (undeletable): Link Holder, Explorer Gadget, Daily Adventure Incense, Rocket Radars, Mystery Box.

**Evolution items:** Sinnoh Stone, Unova Stone, Sun Stone, King's Rock, Metal Coat, Dragon Scale, Up-Grade, Magnetic Lure requirements, etc.

**TMs:** Fast TM and Charged TM reroll a move randomly. **Elite TMs** let you pick, including legacy and Community Day exclusive moves.

**Explorer Gadget** (2026, phased rollout, level 20+): a *built-in software* feature — not hardware — that auto-catches with **Poké Balls only** and auto-spins PokéStops while the app is closed. Daily limits scale with Trainer level. It stops when storage is full. It skips Pokémon not yet in your Pokédex and mighty Pokémon. It cannot run at the same time as a paired Pokémon GO Plus + ; switching to hardware mid-day disables the Gadget until the next day.

---

## 10. Event cadence (SLOW — verify dates)

| Event type | Cadence | Notes |
|---|---|---|
| **Season** | ~3 months | Themed; rotates spawns, eggs, research, GBL, bonuses |
| **Community Day** | Monthly | One featured species, mass spawns, high shiny rate (~1/25), exclusive move on evolution during the window + 5 hours after |
| **Community Day Classic** | Occasional | Rerun of a past Community Day |
| **Spotlight Hour** | Tuesdays, 18:00–19:00 local | One species + one bonus (2× XP/Candy/Stardust) |
| **Raid Hour** | Wednesdays, 18:00–19:00 local | Gyms flood with the current 5★ |
| **Raid Day / Max Battle Day** | Occasional weekends | Concentrated boss with extra passes |
| **GO Pass** | Monthly + event-specific | Free track; **GO Pass Deluxe** ~US$7.99 |
| **GO Fest / GO Tour / Wild Area** | Annual/seasonal | Ticketed global and in-person events |
| **Weekly Challenges** | Weekly | Now a major Link Charge source |
| **Daily Adventure Incense** | Daily, 15 min | Free; the main route to rare regionals and Galarian birds |

### GO Pass mechanics
A free, time-limited progression track. Complete **Pass Tasks** to earn **GO Points**; **100 points = 1 rank**. Milestone tiers unlock persistent bonuses for the pass's duration:

- **Tier 1 (Rank 1):** +1 Candy from trading; guaranteed Candy XL from trading at level 31+
- **Tier 2 (Rank 25):** raised Gift open / receive / storage limits
- **Tier 3 (Rank 50):** 2× Daily Adventure Incense duration
- **Tier 4 (Rank 75):** increased XP and Stardust from hatching Eggs

Rank 100 typically grants a Legendary encounter. Ranks past 100 give small repeating Stardust rewards. **GO Pass Deluxe** adds a parallel premium reward track (it does not replace the free one) and is generally only worth it for players who reliably reach high ranks.

---

## 11. Current-state snapshot — as of 5 September 2026

**Flag this section's age in any answer that uses it, and verify before quoting.**

- **Season:** *Pokémon GO: Twilight Trails*, **8 September 2026 → 1 December 2026**, 10:00 local time. (The previous season, *Forever Forward*, ends 8 September; on the compile date the game is in the final days of it.)
- **Season themes:** more Paldea (Scarlet/Violet) debuts — Maschiff and Mabosstiff; Mega debuts for Staraptor and Chandelure; Dynamax Rhyhorn, Sneasel and Sizzlipede; a Max Battle Day with Dynamax Uxie, Mesprit and Azelf.
- **Community Days:** 12 September (Community Day Classic — Gible), 10 October, 21 November.
- **Season egg pools (partial):** 2 km — Elekid, Magby, Azurill; 5 km — Munchlax, Sizzlipede, Fidough; 7 km — Galarian Meowth, Galarian Zigzagoon, Galarian Stunfisk; 7 km via Mateo's Gift Exchange — Galarian Slowpoke, Hisuian Sneasel, Galarian Corsola; 10 km — Dratini, Honedge, Impidimp; Adventure Sync — Tyrogue/Sableye/Budew (5 km) and Bagon/Druddigon/Drampa (10 km).
- **GBL:** Twilight Trails league starts 8 September, 13:00 PDT, with a rank reset. **Mega Evolution is now legal in GBL** via Mega Edition cups. Season cups include Willpower, Retro, Mega Color, Little, Fantasy, Mega Halloween, 2026 GO LAIC Cup and Mega Catch Cup. Rank-up encounters include Toxtricity (Low Key), Dondozo, Kingdra, Duraludon and Pikachu Libre. Avatar rewards are Ryme-themed.
- **Notable move rebalance (Twilight Trails):** Brine 60→100, Bulldoze 45→80 with guaranteed Defense drop, Air Cutter 45→60, Draining Kiss 60→80 with guaranteed Defense boost, Iron Head 70→85, Bubble Beam 25→50, Moonblast 110→90, Shadow Ball 100→90, Psycho Boost 70→85 PvP and 70→130 PvE.
- **Active/recent events:** Mega Squads (8–14 September), Pokémon Horizons: The Series Celebration, Staraptor Super Mega Raid Day, September GO Pass featuring Latios.
- **Regional:** *PokéXciting!* 30th-anniversary Asia-Pacific campaign, including a Kuala Lumpur KLCC Park event and a cross-region GO Stamp Rally.

---

## 12. Answering protocol

### Question archetypes and correct handling

**"What should I use against [raid boss]?"**
1. Identify the boss's typing (STABLE).
2. Derive super-effective types from §5.
3. **Fetch** a current counter list from GO Hub — do not recite remembered tier lists; Shadow forms, Mega availability and move rebalances shift them constantly.
4. Give both a premium answer and a budget/free-to-play answer.

**"Is X good in Great League?"**
Fetch the current GBL tier list. Note the season and any move rebalance. Mention the low-Attack-IV rule and check whether the current cup even allows X.

**"Should I power this up / evolve this / trade this?"**
Ask what it's for (raids vs PvP vs collection) before answering — the correct answer inverts between the two. Check IVs against the intended format. Warn that trading randomises IVs.

**"What's happening in the game right now?"**
Always fetch `pokemongo.com/news` or the current-season page. Never answer from memory.

**"How does [mechanic] work?"**
Usually STABLE and answerable from this file — but Mega Evolution, raid entry currencies and Trainer levelling all changed in 2025–26, so sanity-check those three against the Help Center.

**"Why can't I do X?"**
Common causes: level gate (gyms at 5, Candy XL at 31, Explorer Gadget at 20, Party Play at 15), daily caps (50 coins, 1 special trade, 10 remote raids, 30–40 gifts), storage full, or region/rollout gating.

### Non-negotiables
1. **Never invent a date, a boss, an event or a spawn.** If you can't verify it, say so and point to the source.
2. **Timestamp everything volatile.** "As of the Twilight Trails season (Sept–Dec 2026)…"
3. **Give the maths, not just the answer**, when a player asks about CP/IV/damage — it lets them re-derive it later.
4. **Distinguish PvP from PvE move stats** every time moves come up.
5. **Say "Scopely", not "Niantic"**, when referring to the current operator.
6. **Never advise anything that violates the Terms of Service** — no GPS spoofing, no bots, no third-party map scrapers, no account selling. These carry permanent bans.
7. **Safety first on location questions.** The game routes people into the physical world; don't encourage trespassing, playing while driving, or visiting unsafe locations. Real-world harm from this game is well documented.

---

## 13. Glossary

**Adventure Sync** — background step tracking. **Best Buddy** — highest buddy tier, grants +1 CP level in battle. **Buddy** — walked companion, earns Candy. **CD** — Community Day. **CPM** — CP Multiplier. **DPS/TDO** — damage per second / total damage output; the two axes of raid attacker quality. **Elite TM** — TM that lets you choose the move. **F2P** — free to play. **GBL** — GO Battle League. **Hundo** — 15/15/15. **IV** — Individual Value. **Legacy move** — move no longer normally obtainable. **Lucky** — trade-derived Pokémon with ≥12 IVs and halved dust cost. **Mega Level** — per-individual Mega progression: Base/High/Max/Super Max. **MP** — Max Particles. **Nundo** — 0/0/0. **Party Power** — Party Play double-damage burst. **Power Spot** — Max Battle location. **Premier Ball** — post-raid catch ball. **Purified Gem** — calms an enraged Shadow Raid boss. **Shadow** — +20% Atk / −20% Def, from Team GO Rocket. **Spoofing** — GPS falsification; bannable. **STAB** — Same Type Attack Bonus, ×1.2. **Super Mega Raid** — 8+ trainer Mega raid with shields, added Feb 2026. **XL** — Candy XL, for levels 40–50.

---

*This file describes stable mechanics accurately as of 5 September 2026. Treat §11 as perishable and everything marked LIVE in §0 as requiring a fresh lookup.*
