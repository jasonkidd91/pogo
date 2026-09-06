"""
The ranking model: is this Pokemon worth investing in, or is it Pokedex filler?

Every number here is computed from the Game Master (see gamemaster.py). Nothing is
remembered, and nothing is copied from a community tier list. The point of a rank on this
site is to answer one question — *should I spend resources on this?* — so the letter is
deliberately not a raw power score. A Mega that is mediocre at attacking but is one of only
two that cover Ice is worth energy; a strong attacker in a type already served by something
stronger is not.

## The PvE damage model

Level 40, 15/15/15, against a neutral 200-defense target, using the PvE move table:

    A     = (baseAttack + 15) x CPM(40)
    dmg   = floor(0.5 x Power x A / Defense x STAB) + 1        STAB = 1.2
    n     = ceil(chargedEnergyCost / fastEnergyGain)           fast moves per charged
    DPS   = (n x fastDmg + chargedDmg) / (n x fastDuration + chargedDuration)

The best fast+charged pairing wins. This is sustained cycle DPS, so it deliberately ignores
dodging, energy gained from damage taken, and the partial cycle at the end of a battle —
all of which shift absolute numbers but barely move the ordering, which is what a rank uses.
The ordering was checked against community consensus before this shipped: it puts Mega
Mewtwo Y, Mega Mewtwo X and Mega Rayquaza in the top three and Mega Sableye last.

## Mega ranks

All Megas of a type give the *same* 1.3x party boost — that number is in the Game Master and
does not vary. So "which Fire Mega boosts best" is not a real question. What actually differs
is whether this is the Mega you would bring for a type, and how many others cover it.

    lead    highest DPS of every Mega sharing that type
    top     top-quartile DPS across all Megas
    runner  places #2 in a type at least 3 Megas cover
    scarce  covers a type 3 or fewer Megas share
    weak    bottom-quartile DPS

    S   lead and top
    A   lead
    B   top, or runner-up, or (scarce and above median)
    C   not weak, or scarce
    D   weak and not scarce — collection only

A hard median split was tried first and rejected: it put Mega Beedrill, the #2 of only four
Bug Megas, one hundredth of a DPS below the line and labelled it "collection only". Bands
that hinge on a knife-edge produce exactly the confident-and-wrong output this repo keeps
guarding against, so D now requires being in the bottom quarter *and* having no scarce type.

Every reason line names where the Mega places and what beats it — "#2 of 4 Bug Megas, behind
Mega Heracross" — at every rank, because the position is the useful part. D adds
"collection only" on top of it rather than replacing it.

**The comparison pool is Megas, not the whole game.** Mega Glalie leads Ice among Megas at
11.9 DPS, and Mamoswine beats it comfortably without Mega Evolving. So the wording is
"Best Ice Mega", never "Best Ice attacker" — the second is a much stronger claim and a
false one.

## Dynamax ranks

Every Dynamax Pokemon has all three Max moves — Attack, Guard and Spirit — so the question is
which role its stats suit, not how much damage it does. Attack, Defense and Stamina are each
ranked across the whole Max roster (Dynamax and Gigantamax together, since that is the pool
you actually pick from), and a Pokemon is judged on its *best* role:

    best = the role it places highest in, as a percentile of the roster
    S   best is in the top 10% of everyone's best
    A   next 15%
    B   next 25%
    C   the rest — collection only

Banding on the best-role percentile rather than on each role separately is deliberate. Three
roles at "top 10% of that role" hands an S to nearly a third of the roster, which makes the
letter mean nothing; taking quantiles of the combined distribution keeps the spread honest.

Gigantamax entries are ranked on the same stats as their Dynamax counterpart. Their G-Max
move is stronger, but its damage is not in the Game Master, so no bonus is invented for it.
"""

import math

from gamemaster import CPM_L40, NEUTRAL_DEFENSE, PERFECT_IV, move_label

STAB = 1.2


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


def _quantile(sorted_desc, q):
    """Value at quantile q from the top (q=0.25 -> top-quartile cutoff)."""
    if not sorted_desc:
        return 0.0
    idx = min(len(sorted_desc) - 1, max(0, int(len(sorted_desc) * q) - 1))
    return sorted_desc[idx]


SCARCE = 3          # "one of the few Megas covering this type"


def rank_megas(rows):
    """Annotate each row with rank/why in place.

    Each row needs: name, types, energy, dps, and may carry legacy=True when its best
    moveset depends on an Elite TM or Community Day move.
    """
    ranked = [r for r in rows if r.get("dps")]
    if not ranked:
        raise RuntimeError("nothing to rank — no Mega got a DPS number")

    scores = sorted((r["dps"] for r in ranked), reverse=True)
    top_quartile = _quantile(scores, 0.25)
    median = _quantile(scores, 0.50)
    bottom_quartile = _quantile(scores, 0.75)

    pool, leader = {}, {}
    for r in ranked:
        for t in r["types"]:
            pool.setdefault(t, []).append(r)
    for t, members in pool.items():
        leader[t] = max(members, key=lambda r: r["dps"])

    for r in ranked:
        leads = [t for t in r["types"] if leader[t] is r]
        top = r["dps"] >= top_quartile
        solid = r["dps"] >= median
        weak = r["dps"] < bottom_quartile
        scarce = [t for t in r["types"] if len(pool[t]) <= SCARCE]
        # #2 of a two-Mega type is the bottom of it, so a runner-up only counts in a type
        # with real competition.
        runner = any(len(pool[t]) > SCARCE and _place(r, pool[t]) == 2 for t in r["types"])
        # The type it places highest in — the one worth naming on the card.
        best_t = min(r["types"], key=lambda t: _place(r, pool[t])) if r["types"] else None

        if leads and top:
            r["rank"], why = "S", f"Best {_join(leads)} Mega"
        elif leads:
            r["rank"], why = "A", f"Best {_join(leads)} Mega"
        elif top or runner or (scarce and solid):
            r["rank"], why = "B", _placing(r, best_t, pool, leader)
        elif not weak or scarce:
            r["rank"], why = "C", _placing(r, best_t, pool, leader)
        else:
            r["rank"] = "D"
            why = _placing(r, best_t, pool, leader) + " · collection only"

        r["why"] = f"{why} · {r['energy']:,} energy"

    for r in rows:
        if not r.get("dps"):
            # Trap 1 in gamemaster.py: released too recently to be in the Game Master.
            # Say so on the card rather than inventing a grade.
            r["rank"] = "?"
            r["why"] = "Too new to rate — not in the Game Master yet"
    return rows


def _place(row, members):
    """1-based position of `row` among `members` by DPS."""
    return sorted(members, key=lambda r: -r["dps"]).index(row) + 1


def _placing(row, t, pool, leader):
    """'#2 of 4 Bug Megas, behind Mega Heracross' — where it sits and what beats it."""
    if not t:
        return "Unranked typing"
    return (f"#{_place(row, pool[t])} of {len(pool[t])} {t} Megas, "
            f"behind {leader[t]['name']}")


def _join(items):
    items = list(items)
    if len(items) <= 1:
        return items[0] if items else ""
    return " and ".join([", ".join(items[:-1]), items[-1]])


ROLES = (("Attacker", "baseAttack"), ("Guard", "baseDefense"), ("Spirit", "baseStamina"))


def rank_max(rows):
    """Annotate each Dynamax/Gigantamax row with rank/role/why in place.

    Each row needs: name, stats {baseAttack, baseDefense, baseStamina} and cost
    {candy, xl}. Ranked against the whole Max roster, which is `rows` itself.
    """
    if not rows:
        raise RuntimeError("nothing to rank — empty Max roster")
    total = len(rows)

    # Position of each entry within each role, 1 = best in the roster. Equal stats share a
    # position: a Gigantamax entry has its species' stats exactly, so without this its
    # Dynamax twin lands one place behind it for no reason anyone could act on.
    place = {}
    for role, stat in ROLES:
        order = sorted(rows, key=lambda r: -r["stats"][stat])
        pos, prev = 0, None
        for i, r in enumerate(order, 1):
            value = r["stats"][stat]
            if value != prev:
                pos, prev = i, value
            place[(id(r), role)] = pos

    for r in rows:
        role, pos = min(((role, place[(id(r), role)]) for role, _ in ROLES),
                        key=lambda rp: rp[1])
        r["_role"], r["_pos"] = role, pos

    spread = sorted(r["_pos"] for r in rows)
    cut = {g: spread[min(total - 1, max(0, int(total * q) - 1))]
           for g, q in (("S", 0.10), ("A", 0.25), ("B", 0.50))}

    for r in rows:
        role, pos = r.pop("_role"), r.pop("_pos")
        cost = f"{r['cost']['candy']} candy + {r['cost']['xl']} XL per Max move"
        if pos <= cut["S"]:
            r["rank"] = "S"
        elif pos <= cut["A"]:
            r["rank"] = "A"
        elif pos <= cut["B"]:
            r["rank"] = "B"
        else:
            r["rank"] = "C"
        if r["rank"] == "C":
            r["role"] = None
            r["why"] = f"Collection only · {cost}"
        else:
            r["role"] = role
            # Naming the exact position beats a band once you are near the top of it.
            standing = (f"#{pos} Max {role} of {total}" if pos <= 10
                        else f"Top {math.ceil(pos / total * 100)}% Max {role}")
            r["why"] = f"{standing} · {cost}"
    return rows


def moveset_label(fast, charged):
    return f"{move_label(fast)} + {move_label(charged)}"
