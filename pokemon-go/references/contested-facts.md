# Contested facts — verify before asserting

These are points where the three upstream source documents (`docs/CLAUDE.md_claude_opus5.md`,
`docs/CLAUDE.md_claude_sonnet5.md`, `docs/claude.md_chatgpt.md`, all compiled 5 Sep 2026)
**disagree with each other**, or where one of them states something that is demonstrably wrong.

A disagreement between confident sources is the highest-risk kind of fact: each source reads as
authoritative on its own. Do not pick one and sound certain. Look it up, or state the uncertainty.

---

## A0. Resolved — verified true

| Claim | Who said it | Verdict |
|---|---|---|
| **"Super Mega Raids" exist** — a raid tier above Mega Raids | Opus 5 only | **CONFIRMED, 5 Sep 2026.** Mega Mewtwo X and Mega Mewtwo Y headlined Super Mega Raids at GO Fest 2026: Mega Finale (Sat 5 / Sun 6 Sep 2026). Verified against pokemongo.com/gofest/megafinale, LeekDuck and GO Hub — all three agree. Opus was right and was the only source carrying it. This raises confidence in Opus's other unique 2026 claims, though it does not verify them. |
| **New GO-original Mega forms exist** beyond the mainline roster | none | **CONFIRMED, 5 Sep 2026.** Mega Victreebel, Starmie, Malamar, Raichu X, Raichu Y, Skarmory, Falinks and Dragonite all debuted at Mega Finale. None has a mainline counterpart. All cost **300** Mega Energy first-time — the 300 tier appears to mark GO-original Megas. |
| First-time Mega Energy costs use a **100 / 200 / 300** tier system | implied by user | **CONFIRMED** via Bulbapedia's Mega Evolution (GO) table. A web search claiming "no 300 tier exists for first-time Mega Evolution" was **wrong** — 300 is well populated. |

Sources: <https://pokemongo.com/gofest/megafinale> · <https://leekduck.com/events/pokemon-go-fest-2026-mega-finale/> · <https://bulbapedia.bulbagarden.net/wiki/Mega_Evolution_(GO)>

---

## A. Resolved — one source is wrong

Use the "correct" column. These are settled by long-standing, checkable game data.

| Claim | Who said it | Correct |
|---|---|---|
| "CPM is 0.8403 at Level 40, 0.8740 at Level 50" | Sonnet 5 | **Wrong.** L40 = 0.7903, L50 = 0.8403. 0.8740 is not a CPM value at all. Any CP calculation built on this is wrong by a wide margin. |
| "Frustration deals functionally identical damage to Return" | Sonnet 5 | **Wrong.** Frustration is deliberately weak; Return is a normal-strength move. This inverts the entire purify-vs-keep-Shadow decision. |
| "Purifying sets the Pokémon to Level 25" | Sonnet 5 | **Wrong.** Purifying *raises* the Pokémon's level; it does not set it to a fixed 25. |
| "Trading resets Mega Level progress to zero for the new owner" | Sonnet 5 | Suspect and unsupported by the other two docs. Verify. |
| "Weather-boosted wild spawns are level 25 minimum instead of level 20" | Opus 5 | **Conflated.** Level 20 → 25 is the **raid catch encounter** rule. Weather-boosted *wild* spawns get a higher level range and an IV floor of 4. Opus states the raid rule correctly elsewhere. |
| "Weather-boosted raid catches have a 6/6/6 IV floor" | Opus 5 | Suspect. The standard raid IV floor is 10/10/10; no widely documented mechanic lowers it for weather boost. Opus presents this confidently as a gotcha. **Verify before repeating.** |
| Mega Charizard X/Y "require separate form-specific Mega Energy since a May 2026 update" | Sonnet 5 | Contradicts long-standing shared-family Mega Energy and is unsupported by the other two docs. Verify. |
| "Switch timer reduced from 50s to 45s" | Sonnet 5 | Unsupported by the other docs and hard to place against known GBL switch-cooldown values. Verify. |

---

## B. Direct contradictions — must look up

### B1. Who currently operates Pokémon GO

| Source | Claim |
|---|---|
| Opus 5 | Niantic's games division was **sold to Scopely** (announced March 2025, closed 29 May 2025). Pokémon GO, Pikmin Bloom, Monster Hunter Now, Campfire, Wayfarer moved to Scopely; Ingress and Peridot stayed with Niantic Spatial. In-game copyright reads "© Scopely". **Explicitly warns not to call Niantic the current operator.** |
| Sonnet 5 | Repeatedly attributes current changes to Niantic ("Niantic ships changes continuously", "on Niantic's schedule"). |
| ChatGPT | Labels Tier 1 as "Official Pokémon GO / **Niantic** sources". |

**This is the single highest-impact disagreement in the set.** It affects attribution in every answer
about business decisions, monetisation, and policy. Opus's account is specific and internally
consistent; the other two appear to be running on stale training data reinforced by the fact that the
Help Center is still hosted under `nianticlabs.com`. **Verify the current operator once and record it
here** — then treat the hosting domain as an artefact, not evidence.

### B2. Mega Level — per species or per individual Pokémon?

| Source | Claim |
|---|---|
| Opus 5 | **Per individual.** Two Charizard track separately. Tiers Base → High → Max → **Super Max** (added Feb 2026). Super Max unlocks an additional Charged Attack while Mega Evolved. |
| Sonnet 5 | **Per species** — "earned by repeatedly Mega Evolving the same species". Separately claims an extra Charged Attack arrived at "GO Fest 2026: Mega Finale", *independent* of Mega Level. |
| ChatGPT | Neutral — "repeated Mega Evolution increases Mega Level"; does not say which. |

These cannot both be true. The per-species model is the historical one; Opus claims a 2026 rework.
Both agree an extra Charged Attack exists but disagree on what unlocks it. **Verify before giving
Mega investment advice** — the answer changes whether a player should concentrate energy on one
individual or spread it.

### B3. Gigantamax participant cap

| Source | Claim |
|---|---|
| Opus 5 | Up to **100** Trainers, in groups of four (raised from 40 in August 2025) |
| ChatGPT | Up to **40** Trainers, in groups of four or fewer ("current official information") |
| Sonnet 5 | Only mentions **4** for local Max Battles; silent on Gigantamax |

ChatGPT cites the Help Center for 40; Opus claims a specific raise to 100. Verify.

### B4. The 2026 PvP rebuild

| Source | Claim |
|---|---|
| ChatGPT | **23 June 2026: Pokémon GO rolled out a rebuilt PvP battle system** with short fixed-duration turns, redesigned so outcomes depend less on network and device timing. Warns explicitly not to apply pre-June-2026 timing guides. Cites two official news URLs. |
| Opus 5 | No mention. Describes GBL in pre-rebuild terms. |
| Sonnet 5 | No mention. Describes GBL in pre-rebuild terms. |

**If ChatGPT is right, both Claude documents are silently describing a superseded battle system** — and
every piece of advanced PvP advice derived from them (CMP ties, switch timing, fast-move alignment) is
stale. This is the most consequential *omission* in the set. Verify first; it changes the whole PvP
chapter.

### B5. Mega Evolution in GO Battle League

Opus and Sonnet both state Megas became legal in GBL in the Twilight Trails season (Sept 2026), with
"Mega Edition" cups where Mega CP is temporarily reduced to fit the cap. ChatGPT does not mention it.
Two-of-three agreement, but both are Claude models compiled the same day from overlapping sources —
**that is not independent corroboration.** Verify.

### B6. Raid entry currency

Opus describes a **"Link Charges" / "Link Holder"** system (Feb 2026) as an alternative entry currency
for Mega content, with a 600 cap, ~150 charges for a local Mega Raid and ~200 for a remote Super Mega
Raid. Neither other document mentions it. Also unique to Opus: the **"Explorer Gadget"** (software
auto-catch/auto-spin, level 20+, Poké Balls only).

Still uncorroborated. **Do not repeat without verification.**

---

## C. Coverage gaps, by source

Things one document has that the others simply lack — check the source doc when you need them.

- **Only ChatGPT covers:** Primal Reversion as a first-class system, Adventure Effects (with the
  Pokémon list), Buddy Adventure detail, Routes, Research type taxonomy, Eggs/Incubators, Daily
  Adventure Incense, Adventure Sync, Collection Challenge method requirements.
- **Only Opus covers:** the full 18×18 type matrix, the PvE damage formula, per-tier raid HP and
  timers, CPM values, the current-operator change, gym coin cap, interaction radius, a glossary.
- **Only Sonnet covers:** appraisal star bands by IV total, the 1-in-4,096 hundo figure, the trade IV
  floor table by friendship level, the explicit "species beats IVs" heuristic.
- **All three miss:** actual base-stat data, move power/energy tables, breakpoint mechanics, Pokédex
  or regional-availability data. These are lookup-only by design and should stay that way.

---

## D. How to use this file

1. If a question touches section A, use the corrected value.
2. If it touches section B, **look it up before answering.** State the as-of date in your answer.
3. When you resolve one, edit this file: move it out of B, record the answer, the date, and the source
   URL. This file should shrink over time.
