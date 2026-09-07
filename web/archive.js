/**
 * Archive page — past event catch-list trackers, delisted from the primary nav once their
 * event ends but never deleted: progress on the page itself is a record of what you caught.
 * See web/archive-data.js and CLAUDE.md's "Automation" section.
 */

/** A row for one archived tracker. Page-owned, built from UI.el/UI.tag like events.js's erow. */
function archiveRow(a) {
  return UI.el('div', { class: 'arow' },
    UI.el('div', { class: 'abody' },
      UI.el('a', { class: 'aname', href: a.href, text: a.name }),
      UI.el('div', { class: 'asub', text: `Ended ${a.ended}` })));
}

function render() {
  const main = document.getElementById('list');
  main.replaceChildren();
  main.appendChild(UI.sectionHead({ title: 'Archived trackers', count: ARCHIVE.length || null }));
  if (ARCHIVE.length === 0) {
    main.appendChild(UI.empty('Nothing archived yet — trackers move here once their event ends.'));
  } else {
    main.appendChild(UI.el('div', { class: 'arows' }, ARCHIVE.map(archiveRow)));
  }
}

buildNav('archive');
UI.summary('.summary', { stats: [{ id: 's-archived', label: 'Archived trackers' }] });
UI.setStat('s-archived', ARCHIVE.length);
render();
