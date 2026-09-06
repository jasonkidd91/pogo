"""
The ranking model: how hard does this Pokemon hit?

The rank is **combat power and nothing else**. It is not a value-for-money score: it says
nothing about Mega Energy, candy, XL or Max Particles, and nothing about how well a type is
already covered. One letter, one meaning, everywhere on the site.

Every number is computed from the Game Master (see gamemaster.py). Nothing is remembered and
nothing is copied from a community tier list.

## The damage model

Level 40, 15/15/15, against a neutral 200-defense target, using the PvE move table:

    A     = (baseAttack + 15) x CPM(40)
    dmg   = floor(0.5 x Power x A / Defense x STAB) + 1        STAB = 1.2
    n     = ceil(chargedEnergyCost / fastEnergyGain)           fast moves per charged
    DPS   = (n x fastDmg + chargedDmg) / (n x fastDuration + chargedDuration)

The best fast+charged pairing wins. This is sustained cycle DPS, so it deliberately ignores
dodging, energy gained from damage taken, and the partial cycle at the end of a battle — all
of which shift absolute numbers but barely move the ordering, which is what a rank uses. The
target is neutral, so no type effectiveness enters: this is raw attacking power, not a
matchup. The ordering was checked against community consensus before it shipped: Mega Mewtwo
Y, Mega Mewtwo X and Mega Rayquaza take the top three, Mega Sableye is last.

## The scale

One ladder for the whole site, so a B on the Dynamax page means the same thing as a B on the
Mega page. Grades are percentiles of a **reference pool of every fully evolved species plus
every Mega and Primal** — roughly 550 forms, i.e. the things you would actually take into a
battle. Half-evolved Pokemon are excluded: leaving Caterpie and Magikarp in the denominator
flatters everything above them.

    S   top 5%          A   top 12%        B   top 25%
    C   top 50%         D   below the median

So D reads "below-average attacker", C "above average", B "top quarter", S "top 5% of
everything in the game". Megas cluster at the top and most of the Dynamax roster does not —
that is the honest answer, not a scale problem to tune away.

`?` is for a species the Game Master has no entry for yet. It lags a release by days, and a
guessed grade would be worse than none.

## What the rank is NOT

- **Not a matchup.** A neutral target means Mega Gengar's number says nothing about whether
  it beats the boss you are facing.
- **Not a support score.** Blissey ranks D and is still the best Max Spirit in the game;
  that is what the separate `role` badge on the Dynamax page is for.
- **Not PvP.** Megas and Max Battles are PvE, and the PvP move table has different numbers.
- **Not Max move damage.** For a Dynamax Pokemon this is its own attacking power, which is
  the best available proxy — Max move damage scales off Attack but is not in the Game Master,
  so it is not modelled and not invented.
"""

import math

from gamemaster import (CPM_L40, NEUTRAL_DEFENSE, PERFECT_IV, mega_forms, move_label,
                        movepool, species, types_of)

STAB = 1.2

# Percentile of the reference pool at which each grade starts. See "The scale" above.
BANDS = (("S", 0.05), ("A", 0.12), ("B", 0.25), ("C", 0.50))


def _damage(power, attack, defense, stab):
    return math.floor(0.5 * power * attack / defense * stab) + 1


def best_cycle(base_attack, types, fast_ids, charged_ids, moves,
               defense=NEUTRAL_DEFENSE):
    """Highest sustained DPS over every fast+charged pairing. See the model above.

    Returns {dps, fast, charged} or None when no usable pairing exists.
    """
    attack = (base_attack + PERFECT_IV) * CPM_L40
    best = None
    for fid in fast_ids:
        fast = moves.get(fid)
        if not fast:
            continue
        gain = fast.get("energyDelta", 0)
        f_time = fast.get("durationMs", 0) / 1000.0
        if gain <= 0 or f_time <= 0:
            continue
        f_stab = STAB if _type_of(fast) in types else 1.0
        f_dmg = _damage(fast.get("power", 0), attack, defense, f_stab)
        for cid in charged_ids:
            charged = moves.get(cid)
            if not charged:
                continue
            cost = -charged.get("energyDelta", 0)
            c_time = charged.get("durationMs", 0) / 1000.0
            if cost <= 0 or c_time <= 0:
                continue
            c_stab = STAB if _type_of(charged) in types else 1.0
            c_dmg = _damage(charged.get("power", 0), attack, defense, c_stab)
            n = math.ceil(cost / gain)
            dps = (n * f_dmg + c_dmg) / (n * f_time + c_time)
            if best is None or dps > best["dps"]:
                best = {"dps": dps, "fast": fid, "charged": cid}
    return best


def _type_of(move):
    return move.get("pokemonType", "").replace("POKEMON_TYPE_", "").title()


def power_of(stats, types, ps, moves):
    """{dps, moves, legacy} for one form, or None. `ps` supplies the move pool."""
    fast, charged, elite = movepool(ps)
    best = best_cycle(stats["baseAttack"], types, fast, charged, moves)
    if not best:
        return None
    return {
        "dps": round(best["dps"], 1),
        "moves": f"{move_label(best['fast'])} + {move_label(best['charged'])}",
        # A fifth of the Mega roster peaks on an Elite TM or Community Day move. The grade is
        # out of reach without it, so the card has to be able to say which move that is.
        "legacy": best["fast"] in elite or best["charged"] in elite,
    }


def power_scale(gm, moves):
    """DPS thresholds for S/A/B/C, from the fully-evolved reference pool. See "The scale".

    Returns {'S': dps, 'A': dps, 'B': dps, 'C': dps, '_pool': n}.
    """
    pool = []
    for ps in species(gm).values():
        # An evolutionBranch that leads to another species means this one is a stepping
        # stone, not a battler. Mega branches do not count — they are handled below.
        if any("evolution" in b for b in (ps.get("evolutionBranch") or [])):
            continue
        got = power_of(ps["stats"], types_of(ps), ps, moves)
        if got:
            pool.append(got["dps"])
    base_forms = len(pool)
    for (pid, _), form in mega_forms(gm).items():
        got = power_of(form["stats"], form["types"], species(gm)[pid], moves)
        if got:
            pool.append(got["dps"])

    if base_forms < 300:
        raise RuntimeError(
            f"reference pool has only {base_forms} fully-evolved species — the "
            "evolutionBranch filter is wrong, and every threshold would be too low"
        )
    pool.sort(reverse=True)
    out = {g: pool[min(len(pool) - 1, int(len(pool) * q))] for g, q in BANDS}
    out["_pool"] = len(pool)
    return out


def grade(dps, scale):
    """The letter for a DPS number.

    No DPS means D, not '?'. Magikarp has a Game Master entry and no usable attacking
    moveset at all — "cannot fight" is the bottom of the scale, not missing data. Only the
    caller knows the difference, so it marks unrated rows itself; see apply_ranks.
    """
    if not dps:
        return "D"
    for g, _ in BANDS:
        if dps >= scale[g]:
            return g
    return "D"


UNRATED = "?"


def apply_ranks(rows, scale):
    """Set `rank` on every row from its `dps`.

    A row the caller has already marked `rank == '?'` is left alone: that is reserved for a
    species the Game Master has no entry for, which is missing data rather than weakness.
    """
    for r in rows:
        if r.get("rank") == UNRATED:
            continue
        r["rank"] = grade(r.get("dps"), scale)
    return rows


# ---------- the Dynamax role badge ----------
#
# Not part of the rank. Every Dynamax Pokemon has all three Max moves, and which one it is
# actually good at is a fact about its stats that raw attacking power cannot express —
# Blissey is a D attacker and the best Max Spirit in the game. One word on the card.

ROLES = (("Attacker", "baseAttack"), ("Guard", "baseDefense"), ("Spirit", "baseStamina"))
ROLE_CUTOFF = 0.25          # only claim a role for the top quarter of the roster in it


def apply_roles(rows):
    """Set `role` on each row: the Max role its stats best suit, or None."""
    total = len(rows)
    if not total:
        raise RuntimeError("nothing to rank — empty Max roster")

    place = {}
    for role, stat in ROLES:
        order = sorted(rows, key=lambda r: -r["stats"][stat])
        pos, prev = 0, None
        for i, r in enumerate(order, 1):
            value = r["stats"][stat]
            if value != prev:
                # Equal stats share a position: a Gigantamax entry has its species' stats
                # exactly, so otherwise its Dynamax twin lands one place behind it for no
                # reason anyone could act on.
                pos, prev = i, value
            place[(id(r), role)] = pos

    for r in rows:
        role, pos = min(((role, place[(id(r), role)]) for role, _ in ROLES),
                        key=lambda rp: rp[1])
        r["role"] = role if pos <= total * ROLE_CUTOFF else None
    return rows
