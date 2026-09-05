# `pokemon-go` — portable domain-context skill

A reusable Pokémon GO knowledge package, distilled from three independently generated CLAUDE.md
files (Claude Opus 5, Claude Sonnet 5, ChatGPT — all compiled 5 Sep 2026, kept in `../docs/`).

## What it is

Not a consolidated CLAUDE.md. It is a **skill** with progressive disclosure, so the same context can
be dropped into any future Pokémon GO project without bloating every conversation.

```
pokemon-go/
├── SKILL.md                        always loaded — volatility triage, answering protocol, rules
└── references/
    ├── sources.md                  where to look things up; conflict resolution
    ├── stable-mechanics.md         formulas, CPM, type chart, damage, catch, weather, IV rules
    ├── combat-systems.md           gyms, raids, GBL, Mega/Primal, Rocket, Max Battles
    ├── progression-economy.md      levels, currencies, items, eggs, buddy, research, friends, trading
    ├── liveops.md                  the shape of the event calendar (no dates — those rot)
    ├── contested-facts.md          where the three sources disagree — verify before asserting
    ├── snapshot-2026-09.md         dated, perishable; a lead to verify, not a fact
    └── glossary.md                 community shorthand
```

## Design decisions

**Facts are separated by decay rate, not by topic.** The single biggest failure mode for this domain
is answering rotating live-service content from memory. Splitting stable formulas from perishable
event data — and putting the triage rule in the always-loaded `SKILL.md` — is what prevents that.

**Contradictions are preserved, not resolved by vote.** Where the three sources disagree,
`contested-facts.md` names the disagreement rather than picking a winner. Two of the three sources are
Claude models compiled the same day from overlapping web sources, so agreement between them is not
independent corroboration.

**`liveops.md` deliberately contains no dates or event names.** It describes cadence and consequence.
All perishable specifics are quarantined in `snapshot-2026-09.md`, which is designed to be deleted and
regenerated wholesale rather than patched.

## Install

Project-scoped:

```
cp -r pokemon-go /path/to/project/.claude/skills/
```

Global, for every project:

```
cp -r pokemon-go ~/.claude/skills/
```

Per the global config-backup convention, mirror any later edits to
`~/Documents/claude backup/global/.claude/skills/pokemon-go/`.

## Maintenance

- `contested-facts.md` should **shrink** over time. When you verify one, move it into the right
  reference file with a date and a source URL, and delete the entry.
- `snapshot-2026-09.md` should be **replaced**, never patched. Its own last section is the refresh
  procedure.
- `stable-mechanics.md` should almost never change. If it does, that is a headline event.
