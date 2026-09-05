# Three models, one prompt: what each produced

An analysis of `CLAUDE.md_claude_opus5.md`, `CLAUDE.md_claude_sonnet5.md` and `claude.md_chatgpt.md`
— three CLAUDE.md files for the same Pokémon GO domain, all compiled 5 September 2026.

---

## Scoreboard

| | **Claude Opus 5** | **Claude Sonnet 5** | **ChatGPT** |
|---|---|---|---|
| Length | 422 lines | 219 lines | 719 lines |
| Hard numbers / formulas | **Dense** | Moderate | **Almost none** |
| Full 18×18 type matrix | ✅ | ❌ (multipliers only) | ❌ (none) |
| CP formula + CPM values | ✅ correct | ⚠️ formula right, **CPM wrong** | ❌ absent |
| PvE damage formula | ✅ | ❌ | ❌ |
| Source URLs | 20, tiered | 12, listed as prose | **~40, with FAQ ids** |
| System coverage breadth | Good | Narrowest | **Widest** |
| Behavioural rules for the assistant | ✅ strong | ✅ moderate | ✅ **strongest** |
| Verified factual errors | 2 suspect | **4 confirmed wrong** | 0 found |
| Answerable offline | **Yes** | Partly | **No** |
| Best at | Being a **reference** | Being **readable** | Being a **protocol** |

---

## Claude Opus 5 — the reference manual

**What it did:** produced a genuine knowledge artefact. Full type-effectiveness matrix (I checked all
18 rows — every one correct), correct CPM values, the PvE damage formula, a per-tier raid HP/timer
table, gym coin cap, interaction radius, catch multipliers, a glossary, and a three-tier volatility
model with an explicit list of trigger phrases that force a lookup.

**Its standout catch:** it is the **only one of the three that knows the game changed hands** — Niantic's
games division sold to Scopely, closed 29 May 2025 — and it goes further, explicitly instructing the
reader *not* to say Niantic, and naming why the mistake persists (the Help Center is still hosted on
nianticlabs.com). That is not just a fact; it is a fact plus a model of how the fact gets corrupted.
Both other documents get this wrong, repeatedly.

**Its risk:** it is the most confident, and confidence is what makes an error expensive. It uniquely
describes an entire "Link Charges / Link Holder" raid-entry currency, "Super Mega Raids" at 25,000 HP,
per-*individual* Mega Levels with a "Super Max" tier, and a software "Explorer Gadget". All of it is
specific, internally coherent, and **completely uncorroborated by the other two documents**. Either it
researched deeper than both, or it confabulated a coherent system — and from the prose alone you
cannot tell which. It also has two smaller slips: it applies the raid-catch level-25 rule to wild
weather-boosted spawns, and it asserts a 6/6/6 weather-boosted raid IV floor as a "gotcha" that
doesn't match the standard 10/10/10.

**Behaviour signature:** commits. Writes tables where the others write prose. Volunteers the failure
modes it expects you to hit. Highest information density per line — and highest blast radius when wrong.

---

## Claude Sonnet 5 — the readable briefing

**What it did:** the best *framing* of the three. It opens with "How this differs from the mainline
games," which is exactly the right first section for a domain where wrong transfer from the core games
is a top error source. It has the clearest explanation of the counter-intuitive low-Attack-IV rule, and
the only pithy heuristic in the whole set: *a 0% Machamp beats a hundo Primeape* — species and moveset
dominate IVs. It also uniquely carries the appraisal star bands by IV total, the 1-in-4,096 hundo
figure, and the trade IV floor table by friendship level. All correct, all useful, all missing from the
other two.

**Its problem:** it has the **most confirmed factual errors**, and they are load-bearing.

1. **CPM 0.8403 at Level 40, 0.8740 at Level 50.** 0.8403 is level *50*; level 40 is 0.7903, and 0.8740
   is not a CPM at all. Every CP calculation built on this table is materially wrong.
2. **"Frustration deals functionally identical damage to Return."** Frustration is deliberately weak.
   This one inverts the entire purify-vs-keep-Shadow decision — the most common strategic question in
   the game.
3. **"Purifying sets it to Level 25."** It raises the level; it doesn't set it.
4. **"Trading resets Mega Level"** and **"Charizard X/Y need separate Mega Energy since May 2026"** —
   both unsupported by either other document.

The pattern is telling: the errors cluster in *numbers* and in *plausible-sounding mechanical detail*,
not in structure or reasoning. The conceptual chapters are sound; the moment it commits to a specific
value, reliability drops.

**One more thing worth noting:** section 12.6 is titled "Wei-specific context" and pulls your personal
play style out of memory into what is supposed to be a portable domain document. That is a real
behavioural observation — Sonnet personalised a reusable artefact. Fine in a chat, wrong in a file
meant to be copied into other projects.

**Behaviour signature:** best pedagogy, worst arithmetic. Reads like a good explainer, and would pass a
skim — which is precisely what makes its numeric errors dangerous.

---

## ChatGPT — the protocol, not the knowledge

**What it did:** wrote something structurally different from both Claude files. It is a **procedure
manual**, not a reference. 34 sections of *how to decide what to look up, in what order, from which
source, and how to say you're unsure*. It has by far the best source discipline: ~40 URLs including
individual Help Center FAQ ids, a per-source "best for" breakdown, an explicit exact-value policy, a
21-item anti-hallucination list, and response-format templates.

**Its standout catch:** it is the **only one of the three that mentions the 23 June 2026 PvP rebuild** —
a rebuilt battle system with fixed-duration turns — and it warns explicitly not to apply pre-June-2026
timing guides. If that is real, then **both Claude documents are silently describing a superseded
battle system**, and every piece of advanced PvP advice derived from them is stale. That is the single
most consequential omission in the set, and only ChatGPT flagged it. It also uniquely covers Primal
Reversion, Adventure Effects, Buddy Adventure, Routes, the research-type taxonomy, eggs/incubators and
Daily Adventure Incense — real systems both Claude files skip.

**Its problem:** it is 719 lines that **cannot answer a single question offline.** No type chart. No CP
formula. No CPM. No damage formula. No catch multipliers. Section 8 is titled "Type effectiveness" and
contains a six-step *procedure* for thinking about type effectiveness — but not the chart. If the
network is down or a fetch fails, this file gets you nothing. It also repeatedly defers on facts that
genuinely are stable ("verify the current type chart") which trains unnecessary lookups and burns
tokens on settled questions.

It is also the most verbose per unit of information: 1.7× Opus's length for a fraction of the content,
because process text compresses badly.

**Behaviour signature:** maximally cautious. Optimises for never being wrong rather than for being
useful, and achieves it by declining to assert. Zero errors found — partly because it makes very few
falsifiable claims.

---

## What this tells you about the three

| | Failure mode you should watch for |
|---|---|
| **Opus 5** | **Coherent confabulation.** When it's wrong, it's wrong in structured, plausible, well-organised detail that reads exactly like the parts that are right. Cross-check anything it uniquely claims. |
| **Sonnet 5** | **Numeric drift.** Structure and reasoning hold up; specific values slip. Trust its framing, re-derive its numbers. |
| **ChatGPT** | **Hedging as a substitute for knowing.** Excellent process, thin substance. Ask it *how to find out*; don't rely on it to *know*. |

**On agreement:** Opus and Sonnet agree on several 2026 claims (Megas entering GBL, the Twilight Trails
season). That is **not** independent corroboration — same model family, same day, overlapping web
sources. Two Claude models agreeing is closer to one data point than two.

**The honest ranking depends on what you want.** For a single artefact to hand a downstream agent:
**Opus 5**, by a clear margin — it is the only one that can actually answer a maths question without a
network round-trip, and its type chart and formulas check out. For *behavioural* instructions and
source hygiene: **ChatGPT**. For the human-readable explanation: **Sonnet**.

Which is why the package in `../pokemon-go/` takes Opus's hard data, ChatGPT's protocol and source
registry, Sonnet's heuristics and tables — and keeps a `contested-facts.md` for everything they fought
about, rather than letting a majority vote decide facts that were never independently sourced.
