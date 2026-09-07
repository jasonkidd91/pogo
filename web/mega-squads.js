/* Mega Squads tracker — two Mega Raid bosses back for the week. Much smaller than Mega
   Finale: both bosses run for the whole window rather than rotating through habitats, so
   there is no live-window clock here. What is genuinely specific to this event is kept to a
   minimum: the roster, the stat totals, and the over-event banner — cards, grids and section
   heads all come from ui.js. */

const ALL = RAIDS.map((p) => ({ ...p, id: Store.id.mega(p.name) }));

const EVENT_END = new Date(EVENT.end).getTime();
const isOver = () => Date.now() > EVENT_END;

function visible(p) {
  return UI.statusMatch(p.id, UI.activeFilter('status'));
}

function badgesFor(p) {
  return [
    UI.energyPill(p),
    p.attack && UI.tag('tag-attack', '★ ' + p.attack,
      'Extra Charged Attack — unlockable at Super Max Mega Level, debuting this event'),
  ].filter(Boolean);
}

function card(p) {
  return UI.monCard(p, { variant: 'plain', badges: badgesFor(p), sub: p.window });
}

/** Ticks stay after the event: this page becomes the record of what you caught during it. */
function overBanner() {
  const end = new Date(EVENT_END);
  return UI.el('div', { class: 'overbanner', role: 'status' },
    UI.el('div', { class: 'rb-body' },
      UI.el('strong', { text: 'This event has finished' }),
      UI.el('p', { class: 'rb-note', text:
        `${EVENT.name} ended on ${end.toLocaleDateString([], { weekday: 'long', day: 'numeric',
          month: 'long' })} at ${end.toLocaleTimeString([], { hour: 'numeric',
          minute: '2-digit' })}. Both Megas stay on the collection page — what is here is the `
        + 'record of what you caught during the event.' })),
    UI.el('div', { class: 'rb-acts' },
      UI.el('a', { class: 'elink track', href: 'index.html', text: "See what's on now" }),
      UI.el('a', { class: 'elink', href: 'megas.html', text: 'Mega collection' })));
}

function render() {
  const over = isOver();
  const root = document.getElementById('list');
  root.textContent = '';
  document.body.classList.toggle('event-over', over);

  if (over) {
    root.appendChild(overBanner());
  } else {
    const shown = ALL.filter(visible);
    const done = ALL.filter((p) => Store.has(p.id)).length;
    root.appendChild(UI.sectionHead({
      title: 'Mega Raids',
      meta: EVENT.tagline,
      count: `${done} / ${ALL.length} caught`,
    }));
    root.appendChild(shown.length
      ? UI.grid('default', shown.map(card))
      : UI.empty(UI.activeFilter('status') === 'have'
        ? 'Nothing checked off yet.'
        : 'All done — both Megas are caught.'));
  }

  renderSummary();
}

function renderSummary() {
  const total = ALL.length;
  const done = ALL.filter((p) => Store.has(p.id)).length;
  UI.setStat('s-passes', total - done);
  UI.setStat('s-caught', done, total);
  UI.setBar(done, total);
}

document.addEventListener('DOMContentLoaded', () => {
  UI.summary('.summary', {
    stats: [
      { id: 's-passes', label: 'Raid passes needed', tone: 'hl' },
      { id: 's-caught', label: 'Caught', tone: 'ok' },
    ],
    bar: true,
    reset: true,
    filters: [UI.STATUS_FILTER],
  });

  document.getElementById('ev-name').textContent = EVENT.name;
  document.getElementById('ev-official').href = EVENT.officialUrl;
  document.getElementById('bonuses').append(
    ...EVENT.bonuses.map((b) => UI.el('li', { text: b })));

  UI.setupControls({
    onChange: render,
    prefix: ALL.map((p) => p.id),
    resetPrompt: 'Clear the Megas tracked for Mega Squads? This cannot be undone.',
  });

  buildNav('squads');
  render();
});
