# Stable mechanics — safe to answer from memory

Everything in this file is long-standing and has not changed materially in years. It is the part of
the domain you can answer without a lookup.

## How GO differs from the mainline games

- **No type immunities.** Main-series immunities become double resistances, not zero damage.
- **Different effectiveness multipliers** — 1.6× / 0.625×, not 2× / 0.5×.
- **No natures, no EVs, no abilities.** Individual variation is base stats + IVs + level only.
- **Real-world weather and location** affect spawns and combat.
- **Two combat systems with separate move tuning**: PvE (gyms, raids, Max Battles — dodging,
  DPS-driven) and PvP (Trainer Battles / GBL — shields, energy, CP caps).

## Stats

Every species has base **Attack**, **Defense**, **Stamina**. Every individual additionally rolls
**IVs** of 0–15 in each. A perfect 15/15/15 is a "hundo".

```
Effective stat = (Base + IV) × CPM
```

`CPM` (CP Multiplier) is a level-based scalar from the Game Master file.

### CP formula

```
CP = floor( (Atk × sqrt(Def) × sqrt(Sta) × CPM²) / 10 )

  Atk = BaseAttack  + IV_Attack
  Def = BaseDefense + IV_Defense
  Sta = BaseStamina + IV_Stamina
```

```
HP = floor( (BaseStamina + IV_Stamina) × CPM )
```

Minimum CP is 10. Powering up raises level (and therefore CPM); it never changes IVs.

### CPM reference values

| Level | CPM |
|---|---|
| 1 | 0.094 |
| 10 | 0.4225 |
| 15 | 0.51739395 |
| 20 | 0.5974 |
| 25 | 0.667934 |
| 30 | 0.7317 |
| 35 | 0.76156384 |
| 40 | **0.7903** |
| 45 | 0.8153 |
| 50 | **0.8403** |

CPM is defined at every half-level. From level 40 to 50 it rises linearly: **+0.0025 per half-level**
(+0.005 per full level), so L41 = 0.7953, L42 = 0.8003, … L50 = 0.8403.

> Common error: quoting 0.8403 as the **level 40** value. 0.8403 is level **50**. Level 40 is 0.7903.

### Odds and appraisal

- A fully random roll produces a hundo at **1 in 4,096** (16³). Encounters with an IV floor are far better.
- In-game appraisal shows a 0–4 star band from the **IV total** (max 45), never raw numbers:

| Stars | IV total |
|---|---|
| 0★ | 0–22 |
| 1★ | 23–29 |
| 2★ | 30–36 |
| 3★ | 37–44 |
| 4★ | 45 |

- Players filter with search strings `4*`, `3*`, `0*`, or use third-party IV calculators.

### IV floors by source

Some encounters guarantee a minimum IV in each stat:

| Source | Floor |
|---|---|
| Wild, unboosted | 0 |
| Weather-boosted wild | 4 |
| Raid boss, EX, most research encounters | 10 |
| Lucky (from trade) | 12 |
| Trade — Good Friend | 1 |
| Trade — Great Friend | 2 |
| Trade — Ultra Friend | 3 |
| Trade — Best Friend | 5 |

## The counter-intuitive PvP IV rule

In **CP-capped** leagues (Great 1500, Ultra 2500), a **low Attack IV is usually better**. Attack is
weighted hardest in the CP formula, so a high-Attack individual hits the cap at a lower level — which
buys less Defense and HP. A 0/15/15 frequently out-performs a 15/15/15 in Great League.

What is actually being maximised is **stat product** (Atk × Def × Sta) under the CP cap, which is why
rank-1 IV spreads are species-specific and worth checking on PvPoke rather than assuming.

- "0/15/15 is always best" is **false** — the optimum depends on species, CP threshold, and
  breakpoint/bulkpoint behaviour.
- **Master League and all PvE have no cap**, so higher IVs are simply better and 15/15/15 is optimal.
- **Species and moveset dominate IVs.** A 0% Machamp is a better Fighting raid attacker than a hundo
  Primeape. Lead with species selection; treat IVs as a tiebreaker.

## Type chart (GO-specific)

| Result | Multiplier |
|---|---|
| Super effective | ×1.6 |
| Double super effective (both types) | ×2.56 |
| Neutral | ×1.0 |
| Not very effective | ×0.625 |
| Double resisted (main-series immunity, or NVE + NVE) | ×0.390625 |
| Immunity + NVE | ×0.244140625 |

Dual-type stacking: SE+SE = 2.56 · SE+NVE = 1.0 · SE+immune = 0.625 · NVE+NVE = 0.390625 ·
NVE+immune = 0.2441.

### Attacking type → defending types

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

## Damage formulas

### PvE (gyms, raids)

```
Damage = floor( 0.5 × Power × (Attack / Defense)
                × STAB × Effectiveness × Weather × Friendship × Mega × Dodge ) + 1
```

- **STAB** (Same Type Attack Bonus) = **1.2**
- **Weather boost** on a matching-type move = **1.2**
- Attack and Defense are the *effective* stats of attacker and defender.

### PvP

The PvP formula uses the same shape but carries a flat **1.3** multiplier in place of the PvE 0.5, and
consumes **PvP-specific move power and energy values**. There is no weather boost and no dodging in PvP.

> Always state which move table you used. PvE and PvP values for the same move differ, sometimes
> drastically, and mixing them silently produces a plausible but wrong recommendation.

## Moves

- Every Pokémon has one **Fast Attack** and one **Charged Attack**; a **second Charged Attack** can be
  unlocked with Stardust + Candy.
- Fast Attacks deal chip damage and **generate energy**. Charged Attacks **spend** it, hit harder, and
  in PvP may apply stat buffs/debuffs.
- PvP Fast Attacks are measured in **DPT** (damage per turn) and **EPT** (energy per turn); a turn is a
  0.5 s unit.
- **Fast TM / Charged TM** reroll a move at random. **Elite TMs** let you pick, including legacy and
  event-exclusive moves.

## Catching

Catch chance is driven by the species' base catch rate, the encounter's level, and multipliers:

- **Balls:** Poké Ball ×1, Great Ball ×1.5, Ultra Ball ×2. Premier Balls (raids) and Beast Balls
  (Ultra Beasts) are ×1.
- **Throws:** Nice ×1.0–1.3, Great ×1.3–1.7, Excellent ×1.7–2.0. **Curveball ×1.7.**
- **Berries:** Razz ×1.5, Silver Pinap ×1.8 (and 2× Candy), **Golden Razz ×2.5**. Nanab steadies
  movement; Pinap doubles Candy.
- **Type medals** give a multiplicative bonus, up to roughly ×1.3 at Platinum per matching type.
- Higher-level encounters are harder to catch — which is why CP correlates with catch difficulty.

Do not state exact catch percentages for a specific encounter unless you compute them from these
multipliers and say so.

## Weather

Real-world weather, refreshed roughly hourly per location, boosts matching types.

| Weather | Boosted types |
|---|---|
| Clear / Sunny | Grass, Ground, Fire |
| Rain | Water, Electric, Bug |
| Partly Cloudy | Normal, Rock |
| Cloudy | Fairy, Fighting, Poison |
| Windy | Dragon, Flying, Psychic |
| Snow | Ice, Steel |
| Fog | Dark, Ghost |

Effects of a boosted type:
- Matching-type moves deal **1.2×** in gym and raid battles.
- Wild spawns of that type appear more often, at higher levels, with an **IV floor of 4**, and award
  **+25% Stardust**.
- **This applies to raid bosses too** — a boss with a weather-boosted moveset hits meaningfully harder.
- Weather-boosted **raid catch encounters** are level 25 instead of level 20.

## Shinies

- Shiny status is **cosmetic** — fully independent of IVs, CP, and moveset, and cannot be influenced
  by the player. There is no shiny charm in GO.
- Base wild rate is commonly cited around **1 in 500**; Community Day and event-boosted rates are much
  higher; Legendary raids sit around 1 in 20. **These figures are unpublished community estimates** —
  present them as estimates, never as official numbers.
- **Which species can currently be shiny is LIVE data.** Check `pokemondb.net/go/shiny` or GO Hub
  rather than asserting availability.
