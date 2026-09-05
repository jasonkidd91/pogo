---
name: pokemon-go
description: Answer Pokémon GO gameplay questions accurately — CP/IV maths, type effectiveness, raid counters, GO Battle League team building, Mega/Dynamax mechanics, trading, events. Use whenever a question involves Pokémon GO ("pogo", "GBL", "hundo", "IV", "raid counter", "Great League", "Community Day", "Mega Energy", "Max Battle", "Shadow/Purified", "shiny odds", "Spotlight Hour"). Contains the stable rules and formulas plus a volatility protocol that says which facts must be looked up live rather than recalled.
---

# Pokémon GO domain context

## The one rule that matters most

Pokémon GO is **live-service software**. A large share of what players ask about rotates on a
1-day to 3-month cycle. Answering rotating content from memory is the dominant failure mode —
it produces confident, fluent, wrong answers.

Before answering, classify every fact in the question:

| Tier | What it covers | How to answer |
|---|---|---|
| **STABLE** | Formulas, type chart, CPM, damage maths, core definitions, history | Answer from `references/stable-mechanics.md`. No lookup needed. |
| **SLOW** | Season name/dates, level cap, feature rules, Mega roster, league CP caps, item behaviour | Answer from references **and state the as-of date**, then offer to verify. |
| **LIVE** | Today's raid bosses, current spawns, active events, Spotlight Hour, egg pools, GBL cup rotation, shiny availability, tier lists, shop offers, Rocket lineups | **Never answer from memory. Look it up first.** |

Most real questions mix tiers — "best counter for today's raid boss" is LIVE (which boss) plus
STABLE (type maths) plus SLOW (which Megas exist). Split the question, look up the LIVE part,
then reason with the STABLE part.

**Phrases that force a lookup:** today, right now, current, this week, this season, active,
featured, still available, latest, meta, best right now, what's in raids.

## Reading order

1. This file — protocol and triage. Always.
2. `references/sources.md` — where to look things up, and which source wins a conflict.
3. `references/stable-mechanics.md` — formulas, type chart, catch, weather. Load for any maths question.
4. `references/combat-systems.md` — gyms, raids, GBL, Mega, Max Battles, Rocket. Load for battle questions.
5. `references/progression-economy.md` — levels, candy, currencies, items, buddy, eggs, research, friends, trading.
6. `references/liveops.md` — the shape of seasons and events, and what rotates on what cadence.
7. `references/contested-facts.md` — **read before asserting anything from 2025–2026.** Facts where the
   upstream sources disagree with each other. Verify these; do not pick one and sound confident.
8. `references/snapshot-2026-09.md` — a dated, perishable snapshot. Treat as a lead to verify, not as truth.
9. `references/glossary.md` — community shorthand.

## Answering protocol

**"What should I use against <boss>?"**
Identify the boss's typing → derive super-effective types from the type chart → **fetch a current
counter list** (do not recite a remembered tier list; Shadow forms, Mega availability and move
rebalances move these constantly) → give both a premium answer and a free-to-play answer.

**"Is X good in Great League?"**
Check whether the *current cup* even allows X. Fetch the current rankings. Mention the low-Attack-IV
rule. Note any recent move rebalance.

**"Should I power up / evolve / purify / trade this?"**
Ask what it is *for* first — raids, PvP, or collection. The correct answer inverts between them.
Never answer this from CP alone.

**"How does <mechanic> work?"**
Usually STABLE and answerable from the references — **except** Mega Evolution, raid entry currencies,
PvP battle timing, and Trainer levelling, all of which changed in 2025–26. Check
`contested-facts.md` before answering those four.

**"Why can't I do X?"**
Usual causes: a level gate, a daily cap, full storage, or staged regional rollout.

**Answer shape for a factual question:** direct answer → why → conditions/exceptions → an
as-of date and a source when the fact is volatile.

**Answer shape for a "best" question:** restate the objective → ranked candidates → the moves and
stats that drive the ranking → resource cost → caveats.

## Non-negotiables

1. **Never invent** a date, a boss, an event, a spawn, an egg pool, a shop offer, or a probability.
   If it can't be verified, say so and point at the source.
2. **Timestamp everything volatile.** "As of <season> (<dates>)…"
3. **Show the maths** for CP/IV/damage questions so the player can re-derive it later.
4. **PvP and PvE move stats are different numbers.** Say which one you used. Confusing them is an
   invisible error that produces a plausible, wrong recommendation.
5. **Distinguish Trainer Level from Pokémon Level, and Candy from Candy XL.** These are four
   different things that questions routinely conflate.
6. **CP is not a measure of quality.** Species and moveset dominate; IVs are a tiebreaker.
7. **Check who currently operates the game** before attributing decisions — see `contested-facts.md`.
   Much training data and many live pages are stale on this point.
8. **Never advise anything against the Terms of Service** — no GPS spoofing, bots, third-party map
   scrapers, or account sales. These carry permanent bans.
9. **Safety on location questions.** The game moves people through the physical world. Don't
   encourage trespassing, playing while driving, or unsafe locations.
10. **Don't cite a source you didn't actually read.**
