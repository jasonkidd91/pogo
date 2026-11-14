/**
 * Squad — which Pokemon to power up first, for each of the 18 types. PvE only.
 *
 * This page answers one question: "I want to get stronger at raiding, what do I invest in
 * next?" It is a RECOMMENDATION, not a tracker — there is nothing to tick, so there is no
 * sign-in gate and no `data-tracker` on the body, the same as the events and promo-codes
 * pages. Every card is a link out to that Pokemon's PogoHub page, where the full moveset
 * breakdown lives; this page deliberately does not try to reproduce it.
 *
 * WHERE THE ORDER COMES FROM. PogoHub's own tier lists, for all four tiers — not the
 * site's computed S/A/B/C/D rank, which is CLAUDE.md's usual rule and is suspended here at
 * the owner's explicit request. That is also why no `UI.rankChip` appears below: showing
 * PogoHub's ladder and the site's ladder on one card would make both unreadable. The chip
 * on these cards is `.phtier`, which is PogoHub's, and it is a different shape from
 * `.rank` on purpose. See the header of web/squad-data.js.
 *
 * Load order: ui.js -> store.js -> auth.js -> promos.js -> promo-data.js -> squad-data.js
 * -> squad.js. store.js/auth.js/promos.js/promo-data.js are here for the shared nav and its
 * unseen-promo-code nudge, which every page carries, not because this page tracks anything.
 */

const HUB = 'https://db.pokemongohub.net/pokemon/';

const TIER_NAME = { gmax: 'Gigantamax', dmax: 'Dynamax', mega: 'Mega', plain: 'Attacker' };

// What each tier's headline number actually measures. A Max pick is rated on its Max move;
// a raid pick on simulated DPS. Labelling them the same would invite comparing two numbers
// that have nothing to do with each other.
const MAX_TIERS = ['gmax', 'dmax'];

const PH_TITLE = {
  SS: 'PogoHub tier SS — the top of their list',
  S: 'PogoHub tier S', A: 'PogoHub tier A', B: 'PogoHub tier B',
  C: 'PogoHub tier C', D: 'PogoHub tier D', E: 'PogoHub tier E', F: 'PogoHub tier F',
};

/** PogoHub's letter tier. Deliberately NOT .rank — that class is the site's own ladder. */
function phChip(p) {
  return UI.el('span', {
    class: 'phtier', data: { t: p.phTier }, text: p.phTier,
    title: PH_TITLE[p.phTier] || 'PogoHub tier',
    'aria-label': `PogoHub tier ${p.phTier},`,
  });
}

/**
 * The headline number and the moveset behind it, reusing .power — this is the same thing
 * that class already says on a Mega card (a number, then the moveset it assumes), so it
 * gets the same treatment rather than a near-identical new class.
 */
function statLine(p) {
  const isMax = MAX_TIERS.includes(p.tier);
  const value = isMax ? p.maxDamage : p.dps;
  if (value == null) return null;
  return UI.el('div', { class: 'power' },
    UI.el('b', { text: String(value) }),
    isMax ? ' Max move damage' : ' DPS',
    p.moves && UI.el('span', { class: 'mv' }, p.moves));
}

/**
 * The bulk credential, Max tiers only. Max Battles cap at four players, so a Pokemon that
 * soaks hits earns its slot as much as one that hits hard — this line is what makes a pick
 * that was promoted for survivability explain itself instead of looking misplaced.
 */
function bulkLine(p) {
  if (!p.bulkTier) return null;
  return UI.el('div', { class: 'sbulk',
    title: `PogoHub ranks it #${p.bulkPlace} among Max Battle tanks against ${p.bulkVs}-type attacks` },
    `Tank ${p.bulkTier} · #${p.bulkPlace} vs ${p.bulkVs}`);
}

/** One recommendation. The whole card is the link out to PogoHub. */
function pickCard(p) {
  return UI.el('a', {
    class: 'scard', data: { tier: p.tier },
    href: HUB + p.hub, target: '_blank', rel: 'noopener',
    title: `Open ${p.name} on Pokémon GO Hub for its full moveset breakdown`,
  },
    UI.sprite(p),
    UI.el('div', { class: 'body' },
      UI.el('div', { class: 'stier' }, TIER_NAME[p.tier],
        // PogoHub's placing on ITS list, which is not this card's position in this one:
        // a Max pick is ordered here by damage and bulk together, so a tanky #10 can sit
        // above a frail #2. Without this title that looks like a sorting bug.
        UI.el('span', { class: 'pl', text: `#${p.place}`,
          title: MAX_TIERS.includes(p.tier)
            ? `Pokémon GO Hub places it #${p.place} for Max move damage. This list orders Max picks by damage and tank rating together, so that is not its position here.`
            : `Pokémon GO Hub places it #${p.place} among this type's attackers.` })),
      UI.el('div', { class: 'name' }, phChip(p), ' ', p.name),
      statLine(p),
      bulkLine(p)));
}

/** Does this pick survive the chips and the search box? */
function matches(p) {
  const tier = UI.activeFilter('tier');
  if (tier !== 'all' && p.tier !== tier) return false;
  // No `fam` on this page, so UI.searchMatch falls through to exact matching on the fields
  // given — the Match chips are a collection-page thing and are not offered here.
  return UI.searchMatch(p, [p.name, p.moves, TIER_NAME[p.tier]]);
}

function render() {
  const main = document.getElementById('list');
  main.textContent = '';

  let shown = 0;
  let maxBattle = 0;
  let raid = 0;

  SQUAD.forEach((group) => {
    const picks = group.picks.filter(matches);
    if (!picks.length) return;
    shown += picks.length;
    maxBattle += picks.filter((p) => MAX_TIERS.includes(p.tier)).length;
    raid += picks.filter((p) => !MAX_TIERS.includes(p.tier)).length;

    main.appendChild(UI.sectionHead({
      title: group.type,
      meta: 'power up in this order',
      count: `${picks.length} of ${group.picks.length}`,
    }));
    main.appendChild(UI.grid('wide', picks.map(pickCard)));
  });

  if (!shown) main.appendChild(UI.empty('No picks match that filter.'));

  UI.setStat('s-shown', shown);
  UI.setStat('s-max', maxBattle);
  UI.setStat('s-raid', raid);
}

document.addEventListener('DOMContentLoaded', () => {
  UI.summary('.summary', {
    stats: [
      { id: 's-shown', label: 'Picks shown' },
      { id: 's-max', label: 'Max Battle (Gmax · Dmax)', tone: 'ok' },
      { id: 's-raid', label: 'Raids & gyms (Mega · plain)', tone: 'hl' },
    ],
    search: { placeholder: 'Search a Pokémon or move…', label: 'Search squad picks' },
    filters: [{
      label: 'Tier', group: 'tier',
      options: [['all', 'All'], ['gmax', 'Gigantamax'], ['dmax', 'Dynamax'],
                ['mega', 'Mega'], ['plain', 'Attacker']],
    }],
  });

  buildNav('squad');
  UI.setupControls({ onChange: render });
  render();

  const stamp = document.getElementById('freshness');
  if (stamp && typeof SQUAD_FETCHED !== 'undefined') {
    stamp.textContent = `Rankings pulled from Pokémon GO Hub on ${SQUAD_FETCHED}.`;
  }
});
