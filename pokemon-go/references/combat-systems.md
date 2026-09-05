# Combat systems

Mostly SLOW-tier. The rules here are stable enough to answer from, but Mega Evolution, raid entry
currencies and PvP timing all changed during 2025–26 — check `contested-facts.md` before asserting
specifics in those three areas.

## Gyms

- 6 defender slots. One Pokémon per Trainer per gym, one per species per gym, must match your team colour.
- Defenders lose motivation over time and when beaten; feeding Berries restores it. At zero motivation
  a defeated defender returns to its owner.
- Defending earns **PokéCoins by time defended, capped at 50 per day**.
- Legendary, Mythical, and your current Buddy cannot be placed.
- Gyms double as PokéStops and host Raids.
- **Gym defence is a different optimisation from raiding** — bulk and motivation-drain resistance, not DPS.

## Raid Battles

Bosses occupy gyms temporarily. Flow: RSVP/enter → spend a Raid Pass → pick a party → beat the boss
inside the timer → receive rewards and one catch encounter with a fixed number of **Premier Balls**
(count scales with damage dealt, team contribution, friendship, and gym control).

| Tier | Boss HP | Stat multiplier | Timer |
|---|---|---|---|
| 1★ | 600 | 0.5974 | 180 s |
| 3★ | 3,600 | 0.73 | 180 s |
| Mega Raid | 9,000 | 0.79 | 300 s |
| 5★ Legendary | 15,000 | 0.79 | 300 s |
| Elite Raid (in-person only) | 20,000 | 0.79 | 300 s |
| Primal Raid | 22,500 | 0.79 | 300 s |

Higher tiers exist and have been added over time — verify HP and timer for any tier above 5★ rather
than extrapolating.

- **Lobby cap: 20 Trainers.**
- **Raid catch encounters** are level 20, or level 25 if weather-boosted, with an IV floor of 10.
- **Passes:** one free daily Raid Pass from spinning a gym disc; Premium Battle Passes for extra local
  raids; **Remote Raid Passes** for distant raids. The remote daily limit and any attack-power penalty
  for remote participants are both tuned periodically — verify before doing damage maths.
- **Shadow Raids** feature Team GO Rocket bosses. The boss becomes **enraged**, sharply raising Attack
  and Defense; **Purified Gems** suppress the enraged state. Remote entry to Shadow Raids became
  possible on **13 May 2025**, and counts against the remote daily limit.
- **Elite Raids** are in-person only, hatch on a long timer, and need a large group.

### Party Play

Up to 4 local Trainers form a party. Landing Fast Attacks fills a **Party Power** gauge; when it fires,
each member's next Charged Attack deals double damage. A coordinated party of 4 routinely out-performs
an uncoordinated 6. Verify the current level requirement before quoting one.

## Mega Evolution and Primal Reversion

- **Temporary** transformation, not a permanent evolution. Costs species-specific **Mega Energy**,
  earned mainly from Mega Raids, research, and Buddy walking.
- **One Mega- or Primal-form Pokémon active at a time** per account.
- A Mega form lasts **8 hours**, then the Pokémon enters a **rest period** before it can Mega Evolve
  free again. You can pay a reduced Mega Energy cost to re-activate early; the discount scales with how
  much of the rest period remains.
- **Mega Levels** are earned by repeatedly Mega Evolving; higher levels shorten the rest period, cut the
  energy cost, and grant catch bonuses (extra Candy, better Candy XL odds for type-matched catches)
  while that Mega is active. **Whether Mega Level tracks per species or per individual Pokémon changed
  in 2026 — see `contested-facts.md`.**
- A Mega-Evolved Pokémon cannot be placed in a gym, stationed at a Power Spot, traded, or Dynamaxed
  while Mega-Evolved.
- Mega Evolution provides a **damage aura to the whole raid party** for moves of matching type. This
  makes "which Mega to bring" a support question distinct from "which attacker is strongest".
- **Primal Reversion** is the parallel system for Groudon and Kyogre, using **Primal Energy**, and
  provides its own party-wide bonuses.

When recommending a Mega, separate **best damage dealer** from **best support/boost Mega**, and ask
what the player is optimising for — damage, Candy farming, XL farming, or XP.

## GO Battle League (PvP)

- 3v3, real-time, **2 Protect Shields per side**, free switching with a cooldown. A shield reduces an
  incoming Charged Attack to 1 damage.
- Shield management is the central skill — when to block versus save.
- **Core leagues:** Great (≤1500 CP), Ultra (≤2500 CP), Master (no cap). Rotating **Cups** layer
  restrictions on top — type, region, colour, evolution stage, catch date, CP sub-caps, bans.
  Little Cup (≤500 CP, unevolved) is a recurring format.
- **Ranks 1–20, then Ace → Veteran → Expert → Legend**, driven by an Elo-style rating. **Ranks reset
  every season.**
- Feeds the Pokémon GO Championship Series and the World Championships.
- **The PvP battle system itself was rebuilt during 2026** — see `contested-facts.md`. Do not apply
  pre-2026 frame-timing or CMP guides without checking which system the source describes.

### Team-building method

Never answer "best team" from CP. Work through: current cup rules → species eligibility → current move
pool → **PvP** move stats and energy → IV/CP optimisation for the cap → type coverage →
lead / safe-swap / closer roles → common meta threats → shield scenarios → what the player actually owns.

## Team GO Rocket

Grunts at invaded PokéStops and in balloons; Leaders **Cliff, Arlo, Sierra**; boss **Giovanni**. 3v3
format. Leaders and Giovanni require **Radars** assembled from **Mysterious Components**.

**Shadow Pokémon**: increased Attack, decreased Defense (commonly quoted as +20% / −20%; the underlying
multipliers are ×1.2 and ÷1.2). That trade makes Shadow forms the strongest PvE attackers in the game
and is why Shadow legendaries dominate raid rankings.

Shadow Pokémon know **Frustration**, a deliberately weak Charged Attack that normally **cannot** be
removed with a regular Charged TM — only during designated limited-time windows.

**Purifying** costs Stardust + Candy and: adds **+2 to each IV** (capped at 15), raises the Pokémon's
level, replaces Frustration with **Return**, and discounts future power-up and evolution costs — but
**permanently removes the Shadow attack bonus**.

> Frustration and Return are **not** equivalent. Return is a normal-strength move; Frustration is
> intentionally bad. Any source claiming they deal the same damage is wrong.

**Guidance:** purify for Pokédex completion, PvP bulk, or cost savings. For raids, keep it Shadow.
Never say "purify every high-IV Shadow."

## Max Battles (Dynamax / Gigantamax)

Introduced September 2024 and still actively evolving — verify limits and costs.

- Fought at **Power Spots** on the map, not at gyms. Entry costs **Max Particles (MP)**, gathered by
  walking and from Power Spots. Particle cost scales with the boss.
- Battle flow: fight normally to fill the **Max meter**, then Dynamax for a limited number of turns.
  Dodging and collecting energy icons matter.
- **Max Moves:** **Max Attack/Strike** (typed to the Pokémon's Fast Attack type), **Max Guard**
  (damage reduction), **Max Spirit** (healing). **Gigantamax** Pokémon get a species-specific G-Max move.
- **Only Pokémon caught in Dynamax/Gigantamax form can Dynamax.** It is a permanent property of that
  individual, not a spendable resource like Mega Energy. A few Legendaries are exceptions.
- Dynamax Pokémon have their own **separate Max Move power-up track**, levelled with Candy.
- After winning you can station a Dynamax Pokémon at a Power Spot to help other Trainers.
- **Participant caps differ between Dynamax and Gigantamax battles and have been raised over time —
  see `contested-facts.md`.**
