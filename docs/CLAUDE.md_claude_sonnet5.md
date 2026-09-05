# Pokémon GO — Gameplay Reference for Claude

> **Purpose:** This file gives Claude accurate, current context on Pokémon GO mechanics so it can answer gameplay questions (IVs, PvP, raids, events, etc.) correctly instead of relying on stale or mainline-game assumptions. Pokémon GO's rules diverge from the core Nintendo games in several important ways (documented below), and Niantic changes specific numbers (season names, CP caps rotation, move tuning) frequently.
>
> **Compiled:** September 5, 2026, from official sources and community reference sites (see Sources at bottom). Treat anything time-sensitive (current season, active raid bosses, event calendars) as a snapshot — re-verify via web search before giving date-specific answers, since Niantic ships changes continuously.

---

## 1. How This Differs From the Mainline Games

Pokémon GO reuses Pokémon, types, and movesets from the core series but runs its own combat math:

- **No type immunities.** Ghost is not immune to Normal/Fighting, Electric isn't null against Ground, etc. Instead, "immune" matchups become a *double resistance* (very ineffective), not 0 damage.
- **Different effectiveness multipliers** than the mainline 2x/0.5x (see §7).
- **No natures, no EVs.** Individual variation comes entirely from **IVs** (0–15 per stat) plus species base stats and level.
- **Real-world weather and location** affect spawns and combat (see §6).
- **Two combat contexts** with different rules: PvE (Gyms/Raids/Max Battles — dodge mechanic, DPS-focused) and PvP (Trainer Battles / GO Battle League — shields, energy management, CP caps).

---

## 2. Core Stats: CP, IVs, Levels

### 2.1 Individual Values (IVs)
- Every Pokémon has three hidden stats — **Attack, Defense, HP (Stamina)** — each randomly rolled from **0–15** at catch/hatch.
- A **100% IV ("Hundo")** is 15/15/15. Odds from a normal wild encounter: 1 in 4,096.
- IVs never change from powering up. They **do** change on **trade** (re-rolled, see §9) and on **purification** of a Shadow Pokémon (+2 to each stat, capped at 15).
- Shiny status is **completely independent** of IVs — a shiny can have any IV spread.
- In-game **Appraisal** gives a star rating (not exact IVs) via total IV sum:
  - 0★: 0–22, 1★: 23–29, 2★: 30–36, 3★: 37–44, 4★ (perfect): 45.

### 2.2 CP (Combat Power) formula
```
CP = floor( (BaseAtk + AtkIV) × √(BaseDef + DefIV) × √(BaseSta + StaIV) × CPM² / 10 )
HP = floor( (BaseSta + StaIV) × CPM )
```
- **CPM** (CP Multiplier) is a level-based scalar from the live Game Master file, rising from ~0.094 at Level 1 to **0.8403 at Level 40**, up to **0.8740 at Level 50** (max level, reachable via XP earned from raids/PvP milestones, not just catching).
- Powering up raises CP by increasing level (and therefore CPM) without touching IVs.
- Minimum CP/HP is 10.

### 2.3 Lucky Pokémon
- Obtained via trading; guarantee a **minimum IV floor of 12/12/12** (so at least 80% IV), cost **half Stardust** to power up.
- Odds of a trade producing a Lucky Pokémon scale with friendship level and how long ago the Pokémon was originally caught (older catches = higher odds).

---

## 3. PvP — Trainer Battles & GO Battle League (GBL)

### 3.1 Core battle mechanics
- **Fast Moves**: build energy and deal small chip damage every "turn" (0.5s unit). Characterized by **DPT** (damage/turn) and **EPT** (energy/turn).
- **Charged Moves**: cost 35–100 energy (displayed rounded to nearest "bar" in UI, but true costs vary continuously), trigger a tap-to-power minigame, and can be **blocked by a Protect Shield**.
- **Shields**: each player starts a set with **2 shields per battle** by default; a shield reduces a charged move to 1 damage. Shield management (when to block vs. save) is a central skill.
- **Switching** pauses the clock briefly and has a cooldown before you can switch again; the Pokémon switching in eats one "hit" worth of chip damage from the opponent's last fast move in progress.
- All PvP move damage carries a flat 1.3x multiplier baked into PvP-specific move stats (separate tuning from PvE).

### 3.2 Leagues (rotating within each season)
| League | CP Cap | Notes |
|---|---|---|
| **Great League** | 1,500 CP | Most accessible; huge diversity of viable Pokémon |
| **Ultra League** | 2,500 CP | Rewards mid-tier investment |
| **Master League** | No cap | Dominated by maxed legendaries/Mega Pokémon |

Themed **Cups** rotate weekly/seasonally on top of these — restricting by type, region, color, evolution stage, catch date, etc. (e.g., Kanto Cup, Fantasy Cup, Retro Cup, Holiday Cup, Love Cup, Master Premier).

- **As of the Twilight Trails season (Sept 2026), Mega-Evolved Pokémon are permitted in the GO Battle League** for the first time, including special "Mega Edition" formats of Great/Ultra/Master League where Mega CP is temporarily reduced to fit the cap during battle only.
- The switch timer between turns was reduced from 50s to 45s in recent seasons.

### 3.3 The counterintuitive IV rule for CP-capped leagues
Because Attack is weighted multiplicatively harder in the CP formula, a **high Attack IV pushes a Pokémon to hit the CP cap at a lower level** — meaning less overall bulk (HP × Defense) once capped. So for **Great League and Ultra League**, the ideal spread is often **low Attack / high Defense / high HP** (e.g., 0/15/15), because it lets the Pokémon be leveled higher before hitting the cap, maximizing total stat product under the cap.
- **Master League** (no CP cap) is the exception: since there's no cap to game, **100% IV (15/15/15) is always best.**
- Rule of thumb Claude should apply: *species and moveset selection matter far more than IV optimization* — a 0% IV Machamp is still a better Fighting raid attacker than a 100% IV Primeape, and in PvP a well-chosen species with a mediocre IV spread beats a poorly-chosen species with perfect IVs.

### 3.4 Current season (reference snapshot, verify before quoting dates)
- **Twilight Trails**: September 8, 2026 – December 1, 2026 (PDT). Follows "Forever Forward" (10th-anniversary season). Introduces more Paldea-region Pokémon (Maschiff/Mabosstiff line), Mega Staraptor and Mega Chandelure debuts, new Dynamax additions (Uxie/Mesprit/Azelf trio, Rhyhorn, Sneasel, Sizzlipede), and a move-tuning pass (buffs to Take Down, Infestation, Brine, Bulldoze, Draining Kiss; new moves like Volt Tackle for Raichu, Sacred Sword for Gallade).
- GO Battle League seasons typically rotate through Great → Ultra → Master League on a weekly cadence, interspersed with themed Cups, and reset player rank at season start.

---

## 4. Raids & Gym Battles (PvE)

- Raid difficulty is expressed in **stars** (1★ through 5★, plus **Mega Raids** for Mega-Evolved bosses). Higher tiers = higher boss HP/CP and rarer/stronger rewards.
- Raids require a **Raid Pass** (one free daily pass from spinning a Gym, or Premium/Remote passes purchased with PokéCoins).
- PvE battles use **dodging** (swipe to reduce/avoid incoming damage) rather than shields; there is no CP cap — bring your strongest attackers.
- **Shadow Raids** and **Elite Raids** are special rotations featuring Shadow Pokémon bosses or exclusive-move bosses.
- Key PvE terms:
  - **DPS** (damage per second) / **eDPS** (effective DPS accounting for type matchups) — primary metric for ranking raid attackers.
  - **TDO** (Total Damage Output) — how much damage an attacker can deal before fainting; matters for solo/duo raids.
- **Weather boosts** raid bosses too (see §6) — a boss whose type is weather-boosted hits harder and is tougher.
- Community events like **Raid Hour** (weekly, typically a themed boss for a set evening window) and **Raid Days** (dedicated 3–6 hour windows with elevated shiny odds and exclusive moves) are recurring formats.

---

## 5. Mega Evolution

- Introduced August 2020. A **temporary** (currently up to several hours per activation) transformation consuming **Mega Energy**, a per-species resource earned mainly from Mega Raids, research, and candy-adjacent events — not from a Mega Stone as in the core games.
- Only **one Mega-Evolved Pokémon active at a time** per account.
- After Mega Evolving, the Pokémon enters a **rest period** (originally 7 days at base Mega Level) before it can Mega Evolve again for free; you can pay a reduced Mega Energy cost to Mega Evolve again early, and the discount scales with how much of the rest period remains.
- **Mega Levels** (Base → higher tiers) are earned by repeatedly Mega Evolving the same species; higher levels reduce the rest period and increase associated bonuses (bonus catch candy, boosted "buddy" walking bonus for the whole account, reduced re-activation cost).
- **Trading resets Mega Level progress** back to zero for the new owner.
- Mega-Evolved Pokémon **cannot** be placed in Gyms, stationed at Power Spots, traded, powered up, or Dynamaxed while Mega-Evolved.
- Some Pokémon (e.g., Charizard, Mewtwo) have **multiple Mega forms (X/Y)** requiring **separate, form-specific Mega Energy** since a May 2026 update.
- Mega Evolution is now integrated into GO Battle League as of the Twilight Trails season (see §3.2), and select Mega Pokémon can unlock an **additional Charged Attack** independent of Mega Level as of GO Fest 2026: Mega Finale.

---

## 6. Weather System

Real-world weather (updated hourly per location) boosts specific types both in the wild and in battle.

| Weather | Boosted Types |
|---|---|
| Sunny / Clear | Fire, Grass, Ground |
| Rainy | Water, Electric, Bug |
| Partly Cloudy | Normal, Rock |
| Cloudy | Fairy, Fighting, Poison |
| Windy | Flying, Dragon, Psychic |
| Snow | Ice, Steel |
| Fog | Dark, Ghost |

Effects of a type being weather-boosted:
- Moves of that type deal **+20% damage** in Gym/Raid battles (rounded down).
- Wild spawns of that type appear **more frequently**, are guaranteed **at least 4 IVs in each stat**, spawn at higher levels than normal, and award **+25% Stardust** when caught.
- This applies to both player Pokémon and raid bosses — a boss with a weather-boosted moveset is meaningfully tankier/harder that hour.
- No weather boost applies inside special standalone arenas (e.g., certain league/battle formats).

---

## 7. Type Effectiveness

Pokémon GO keeps the 18-type chart from the mainline games but rescales the multipliers and removes hard immunities:

| Matchup | Multiplier |
|---|---|
| Super effective (1 type) | ×1.6 |
| Super effective (both types) | ×2.56 |
| Not very effective (1 type) | ×0.625 |
| Not very effective (both types) | ×0.390625 |
| Neutral | ×1.0 |

Because there are no immunities, a "traditionally immune" matchup (e.g., Normal vs. Ghost) is simply treated as double-resisted (×0.39), not zero damage.

---

## 8. Shadow & Purified Pokémon

- **Shadow Pokémon** are obtained by defeating **Team GO Rocket** (grunts at darkened PokéStops, Rocket balloons, Leaders Arlo/Cliff/Sierra, and boss Giovanni).
- Shadow Pokémon have **boosted Attack, reduced Defense**, and know the exclusive Charged Move **Frustration** (functionally identical damage to Return in-game, despite the "friendship" flavor text).
- **Purifying** a Shadow Pokémon (costs Stardust + Candy) removes the Shadow status, replaces Frustration with **Return**, applies a **+2 bonus to every IV** (capped at 15), sets it to **Level 25**, and gives a **discount on future power-up costs**.
- As of March 2026, any Pokémon rescued from Team GO Rocket can potentially be Shiny.
- **Apex Shadow Pokémon** (e.g., Shadow Ho-Oh, Shadow Lugia from special Team GO Rocket takeovers) are an especially powerful tier of Shadow legendary, obtained via dedicated storyline events rather than routine grunt battles.

---

## 9. Friendship & Trading

Friendship levels (raised once per day, per friend, by any shared interaction — gifts, trades, raiding/battling together):

| Level | Time to reach | Minimum trade IV floor |
|---|---|---|
| Good Friend | ~1 day | 1 |
| Great Friend | ~7 days | 2 |
| Ultra Friend | ~30 days | 3 |
| Best Friend | ~90 days | 5 |
| **Lucky Friend** (special bonus tier) | Random chance on interaction, only after reaching Best Friend | Guarantees next trade is Lucky (12 floor) |

- Trading **re-rolls IVs** (except for Lucky trades, which floor at 12/12/12).
- Trading requires both trainers to be Level 10+ and within ~100 meters of each other (in person).
- Trade cost (Stardust) decreases as friendship level rises; **Lucky Pokémon** cost half Stardust to power up.
- After a Lucky Trade occurs, friendship resets to Best Friend and both players can build back toward another Lucky Friend chance.
- There's a per-account limit on guaranteed Lucky trades from very old (pre-2019/2020-era) storage Pokémon, distinct from the random Lucky Friend chance.

---

## 10. Dynamax / Max Battles

Introduced September 2024 as Pokémon GO's take on Gen VIII's Dynamax mechanic:

- Dynamax Pokémon appear at **Power Spots** — map locations distinct from Gyms/PokéStops that move over time.
- Battling costs **Max Particles (MP)**, the Dynamax equivalent of a Raid Pass (particles are only consumed on a win); cost scales with the Power Spot boss's tier.
- Up to **4 trainers** can join a Max Battle locally (no remote participation).
- Battle flow: attack normally with Fast/Charged moves to fill a **Dynamax meter**; once full, the Pokémon Dynamaxes for a set number of turns and gains access to **Max Moves**:
  - **Max Strike** (damage, typed to the Pokémon's Fast Move type),
  - **Max Guard** (shield/damage reduction),
  - **Max Spirit** (self/ally heal).
  - **Gigantamax** Pokémon get a unique, more powerful G-Max Move instead.
- Only Pokémon **caught while Dynamaxed** are capable of Dynamaxing — it's a permanent trait on that individual Pokémon, not a temporary resource like Mega Energy. Dynamax-capable Pokémon can still be used normally in all other battle types but can only actually Dynamax in Max Battles.
- After winning, players can station a Dynamax Pokémon at the Power Spot to help other trainers (earns Candy) and can spend PokéCoins to upgrade catch rewards.

---

## 11. Shiny Pokémon

- Shiny odds vary heavily by source: base wild-encounter rate is very low (historically often cited around 1/500 baseline, though Niantic doesn't publish exact numbers and it varies by species/event).
- Certain events, Community Days, Raid Days, and research tasks significantly boost shiny rate for the featured species.
- Shiny status is **cosmetic only** — independent of IVs, CP, or moveset.

---

## 12. Answering Gameplay Questions — Guidance for Claude

1. **Treat event calendars, active raid bosses, current season names/dates, and move-tuning changes as perishable data.** Web search before stating anything specific about "what's live right now" — Niantic ships weekly rotations and mid-season balance patches.
2. **Distinguish PvE advice from PvP advice explicitly.** IV/attacker recommendations differ (see §3.3) — a "best counter" for raids is not the same optimization target as a "best pick" for Great League.
3. **When asked about IVs or CP for a specific Pokémon**, use the formula in §2.2 rather than guessing, and clarify whether the context is PvP (CP-capped) or PvE/Master League (uncapped) since the ideal spread differs.
4. **For team-building/meta questions**, prioritize species and moveset over marginal IV differences, per the "hundo Primeape vs. 0% Machamp" principle in §3.3 — this matches how the current competitive community (Silph Arena, PvPoke-style rankings, PoGO Hub) actually evaluates picks.
5. **Weather, type chart, and friendship/trade mechanics (§6, §7, §9) are core rules and comparatively stable** — safe to answer from this file without re-searching, unless the user asks about a very recent balance change.
6. **Wei-specific context** (from Claude's memory, apply only when relevant): Wei plays with a strategic/IV-optimization and PvP-viability lens, so when Wei asks about a Pokémon or team choice, lead with the PvP framing (§3.3) and note raid/PvE implications separately rather than defaulting to a single "best" answer.

---

## Sources Consulted
- Official: pokemongo.com/en (news, season pages)
- Bulbapedia: Weather (GO), Mega Evolution (GO), Mega Energy, Shadow Pokémon (GO), Dynamax (GO), Energy (GO)
- Pokémon GO Wiki (Fandom): Season 25 / current season articles
- Pokémon GO Hub (pokemongohub.net / db.pokemongohub.net): CP calculator, Twilight Trails season & move-change coverage, Mega/raid attacker rankings
- PokemonDB (pokemondb.net/go): type chart, Dynamax/Max Battles reference
- GamePress (pogo.gamepress.gg): PvP mechanics, fast/charged move terminology, friendship/trading mechanics
- Serebii.net: friend system, Max Battles
- Community/news coverage (Dexerto, LeekDuck, mein-mmo, Nintendo Life, TechCrunch archive, esports.gg, The Click, GamingHQ, Gamerant, AndroidGuys) for season timing and event specifics cross-checked against official/wiki sources.

*This file is a living reference — regenerate or spot-check sections against current sources periodically, since Pokémon GO's live-service nature means specific numbers (CP caps rotation, move tuning, season names) change on Niantic's schedule.*
