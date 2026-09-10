/**
 * Archived event catch-list trackers.
 *
 * A tracker's own page never moves or gets renamed — its URL is what a bookmark and any
 * outstanding ntfy reminder deep-link point at, and app.js already renders a "this event has
 * finished" banner on the page itself once its last window closes. Archiving only removes the
 * tracker from the site's primary nav (buildNav() in store.js) and from TRACKERS in events.js,
 * then adds a row here so the page stays reachable. See CLAUDE.md's "Automation" section.
 *
 * Maintained by .github/workflows/daily-maintenance.yml — hand-edits are fine too, just keep
 * the shape: { name, href, ended } with `ended` as a plain human-readable date.
 */

const ARCHIVE = [
  { name: 'Pokémon GO Fest 2026: Mega Finale', href: 'mega-finale.html', ended: '6 September 2026' },
];
