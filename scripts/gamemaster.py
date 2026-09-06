"""
Shared helpers for reading Pokemon GO's Game Master — the game's own data file.

Why this and not a community tier list: the Game Master carries base stats, move power,
duration and energy, and the Mega boost multipliers as *numbers*, so a rank derived from it
is reproducible and can show its working. A scraped tier list is somebody's opinion of a
meta that rotates, the sites disagree with each other, and it is table-shaped — exactly the
LLM-summary trap that has already burned this repo twice.

Mirror of bulbapedia.py: the traps below are the reason this module exists. Every one of
them fails *silently* — you get a plausible number, not an error.

  1. THE GAME MASTER LAGS THE GAME. Megas released in the last few days have no entry at
     all. `mega_forms` simply will not contain them, and a generator that assumes full
     coverage will drop them from the page or, worse, rank them off their base species.
     Callers must handle "no Game Master entry" as "not rated yet", never as a guess.

  2. PVE AND PVP MOVE TABLES ARE DIFFERENT TEMPLATES. `moveSettings` (V####_MOVE_*) is the
     raid/gym table; `combatMove` (COMBAT_V####_MOVE_*) is the Trainer Battle table. The
     same move has different power and energy in each, sometimes wildly so. This module
     reads the PvE table only, because Megas and Max Battles are PvE. Do not blend them.

  3. MEGA STATS LIVE IN `tempEvoOverrides`, NOT `stats`. Read `stats` and every Mega ranks
     as its unevolved species. The override also carries `typeOverride1/2`: base Charizard
     is Fire/Flying, Mega Charizard X is Fire/Dragon, and using the wrong one moves it into
     the wrong type pool.

  4. SOME `movementId`s ARE INTEGERS. Newer moves are keyed by number rather than name, so
     a dict keyed on the raw value misses them and the move is silently skipped. Everything
     here is keyed by `str()`.

  5. SPECIES APPEAR MANY TIMES, ONCE PER FORM. `V0094_POKEMON_GENGAR`,
     `..._NORMAL`, `..._COSTUME_2020` all exist. Only the entry with no `form` key is the
     canonical one; the rest double-count and can carry a different move list.
"""

import json
import os
import subprocess
import tempfile

REPO = "PokeMiners/game_masters"
RAW = f"https://raw.githubusercontent.com/{REPO}/master/latest/latest.json"
API = f"https://api.github.com/repos/{REPO}/commits?path=latest/latest.json&per_page=1"

# From MEGA_EVOLUTION_LEVEL_0 in the Game Master. Every Mega gives the same party-wide
# boost, which is why "which Mega boosts Fire best" is not a real question — see rank.py.
SAME_TYPE_BOOST = 1.3
OFF_TYPE_BOOST = 1.1

# Level 40, 15/15/15. The reference point for every computed number here; see
# pokemon-go/references/stable-mechanics.md for the CPM table.
CPM_L40 = 0.7903
PERFECT_IV = 15

# A generic raid boss to measure damage against. Neutral typing, so no effectiveness
# multiplier enters the number and the result is raw attacking power rather than a matchup.
NEUTRAL_DEFENSE = 200.0


def _curl(url, extra=()):
    return subprocess.run(
        ["curl", "-sL", "--max-time", "300", *extra, url],
        capture_output=True, text=True, check=True,
    ).stdout


def provenance():
    """(sha, iso_date) of the Game Master commit currently on master."""
    try:
        commit = json.loads(_curl(API))[0]
    except (json.JSONDecodeError, IndexError, KeyError) as exc:
        raise RuntimeError(f"could not read {REPO} commit info: {exc}")
    return commit["sha"][:12], commit["commit"]["author"]["date"][:10]


def fetch(verbose=True):
    """The Game Master as a list of templates, plus its (sha, date).

    ~19 MB. Cached in the system temp directory keyed by commit sha, so re-running a
    generator is instant and a new upstream commit invalidates the cache by itself. There
    is deliberately no way to pin an older copy: a stale Game Master silently ranks a
    Pokemon on last month's moves.
    """
    sha, date = provenance()
    cache = os.path.join(tempfile.gettempdir(), f"pogo-gamemaster-{sha}.json")
    if os.path.exists(cache):
        if verbose:
            print(f"game master {sha} ({date}) — cached")
        return json.load(open(cache)), (sha, date)
    if verbose:
        print(f"game master {sha} ({date}) — downloading ~19 MB")
    raw = _curl(RAW)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise RuntimeError(f"game master did not return JSON (got {raw[:120]!r})")
    if not isinstance(data, list) or len(data) < 10000:
        raise RuntimeError(f"game master looks truncated: {type(data)}, {len(data)} entries")
    open(cache, "w").write(raw)
    return data, (sha, date)


def _typename(t):
    """'POKEMON_TYPE_GRASS' -> 'Grass'."""
    return t.replace("POKEMON_TYPE_", "").title() if t else None


def types_of(ps):
    """['Steel', 'Psychic'] for a species' own typing."""
    return [t for t in (_typename(ps.get("type")), _typename(ps.get("type2"))) if t]


def movepool(ps):
    """(fast, charged) move ids for a species, Elite TM and Community Day moves included.

    Those are the ceiling a Pokemon can actually reach, and a fifth of the roster's best
    moveset depends on one, so they count — the caller flags which ones did.
    """
    fast = [str(m) for m in (ps.get("quickMoves") or [])]
    elite_fast = [str(m) for m in (ps.get("eliteQuickMove") or [])]
    charged = [str(m) for m in (ps.get("cinematicMoves") or [])]
    elite_charged = [str(m) for m in (ps.get("eliteCinematicMove") or [])]
    return fast + elite_fast, charged + elite_charged, set(elite_fast) | set(elite_charged)


def moves(gm):
    """{move id (str): PvE move settings}. Trap 2: this is the raid table, not PvP."""
    out = {}
    for e in gm:
        m = e.get("data", {}).get("moveSettings")
        if m:
            out[str(m["movementId"])] = m          # trap 4: ids can be ints
    if len(out) < 300:
        raise RuntimeError(f"only {len(out)} PvE moves — template naming changed?")
    return out


def species(gm):
    """{pokemonId: pokemonSettings} for canonical forms only. See trap 5."""
    out = {}
    for e in gm:
        ps = e.get("data", {}).get("pokemonSettings")
        if ps and "form" not in ps:
            out[ps["pokemonId"]] = ps
    if len(out) < 800:
        raise RuntimeError(f"only {len(out)} species — form filtering is too aggressive?")
    return out


def mega_forms(gm):
    """{(pokemonId, tempEvoId): {stats, types, energy, moves}} for every Mega and Primal.

    Trap 3: stats and types come from the override, moves from the base species — a Mega
    uses its species' move pool.
    """
    out = {}
    for pid, ps in species(gm).items():
        for ov in ps.get("tempEvoOverrides", []) or []:
            evo = ov.get("tempEvoId")
            if not evo or "stats" not in ov:
                continue                            # camera-only overrides exist
            out[(pid, evo)] = {
                "stats": ov["stats"],
                "types": [t for t in (_typename(ov.get("typeOverride1")),
                                      _typename(ov.get("typeOverride2"))) if t],
                "fast": [str(m) for m in ps.get("quickMoves", []) or []],
                "charged": [str(m) for m in ps.get("cinematicMoves", []) or []],
                "eliteFast": [str(m) for m in ps.get("eliteQuickMove", []) or []],
                "eliteCharged": [str(m) for m in ps.get("eliteCinematicMove", []) or []],
            }
    if len(out) < 50:
        raise RuntimeError(f"only {len(out)} Mega forms — tempEvoOverrides shape changed?")
    return out


def move_label(move_id):
    """'BLAST_BURN' -> 'Blast Burn'; '_FAST' suffix dropped."""
    name = move_id[:-5] if move_id.endswith("_FAST") else move_id
    return name.replace("_", " ").title()
