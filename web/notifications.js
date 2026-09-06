/**
 * notifications.js — the reminder setup page.
 *
 * Two things live here that have nowhere else to be:
 *
 * 1. **The how-to**, drawn by `Remind.setup()`. It is not on the events page because
 *    reminders are not an events-page feature: they are armed from any page with something
 *    time-boxed on it, and each of those pages' buttons is useless until this is done once.
 *
 * 2. **Every reminder on the account, with a Cancel.** A reminder is otherwise only
 *    cancellable from the page that set it, and the events feed rotates — an event that
 *    drops out of the feed takes its button with it and leaves a notification nobody can
 *    stop. `Remind.clearKey()` exists for this list, which knows the stored key but not the
 *    feed id it came from.
 *
 * Load order: ui.js -> store.js -> auth.js -> remind.js -> notifications.js
 */

/** The stored start. Half the feed's stamps are local wall-clock and half are UTC instants
 *  with a trailing Z; `new Date` resolves both, and this prints whatever that moment is
 *  here — which is the same thing the reminder itself will do. */
function whenText(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString([], {
    weekday: 'short', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  });
}

/** What this particular reminder will actually send — the day-before message is only on it
 *  if the event was still more than two days out when it was scheduled. */
function shotsText(r) {
  const out = new Date(r.s).getTime() - Date.now();
  const parts = [];
  if (out > 2 * 86400000) parts.push('the day before');
  if (out > 15 * 60000) parts.push('15 minutes before');
  parts.push('as it starts');
  return parts.join(' · ');
}

function row(r) {
  const scheduled = !!r.d;
  return UI.el('div', { class: 'rrow' },
    UI.el('div', { class: 'rmain' },
      r.l
        ? UI.el('a', { class: 'rname', href: r.l, target: '_blank', rel: 'noopener', text: r.n })
        : UI.el('span', { class: 'rname', text: r.n }),
      UI.el('div', { class: 'rmeta' },
        [r.t, whenText(r.s), shotsText(r)].filter(Boolean).join(' · '))),
    UI.el('span', {
      class: 'rstate' + (scheduled ? '' : ' armed'),
      text: scheduled ? 'Scheduled' : 'Waiting',
      title: scheduled
        ? 'Handed to ntfy. It will arrive whether or not this site is open.'
        : 'Saved to your account. ntfy will not accept a schedule more than three days '
          + 'ahead, so this is handed over the first time you open the page it was set on '
          + 'inside that window.',
    }),
    UI.el('button', {
      class: 'elink', text: 'Cancel',
      'aria-label': 'Cancel the reminder for ' + r.n,
      on: { click: async (ev) => {
        ev.currentTarget.disabled = true;
        try {
          await Remind.clearKey(r.k);
          Remind.say(`Reminder cancelled for ${r.n}.`);
        } catch (err) {
          Remind.say('Could not cancel that reminder: ' + err.message, 'bad');
        }
      } },
    }));
}

function render() {
  Remind.setup('#setup');

  const list = document.getElementById('list');
  list.textContent = '';

  const all = [...Store.reminders].sort(
    (a, b) => new Date(a.s).getTime() - new Date(b.s).getTime());
  UI.setStat('c-set', all.length);
  UI.setStat('c-wait', all.filter((r) => !r.d).length);

  if (Store.locked) return;                    // the setup block is doing the asking

  list.append(UI.sectionHead({ title: 'Your reminders', count: String(all.length) }));
  list.append(all.length
    ? UI.el('div', { class: 'rlist' }, all.map(row))
    : UI.empty('No reminders set. Press Remind me on an event in What’s on, or on a '
             + 'habitat window in Mega Finale, and it will appear here.'));
}

document.addEventListener('DOMContentLoaded', () => {
  UI.summary('.summary', {
    stats: [
      { id: 'c-set', label: 'Reminders set', tone: 'hl' },
      { id: 'c-wait', label: 'Waiting for the window' },
    ],
  });

  buildNav('notify');
  render();
  Store.onChange(render);

  // One more chance to promote anything that has come inside ntfy's three-day window. The
  // page a reminder was set on is not necessarily one the trainer opens again.
  Remind.reconcile();
});
