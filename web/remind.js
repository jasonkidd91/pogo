/**
 * remind.js — "Remind me", delivered by ntfy.sh.
 *
 * Signed in, any event that has not started yet can be armed for push notifications: a
 * heads-up the day before, another 15 minutes before, and one as it starts. State lives on
 * the account, in the same Firestore document as the catch list, so a reminder set on a
 * phone shows as set on a laptop and cannot be armed twice.
 *
 * ## What arrives, and when
 *
 * Up to three messages per reminder, and each one is included only if it is still genuinely
 * ahead — ntfy REJECTS a delay in the past (40004) rather than delivering it late, so a shot
 * that has already passed is dropped here rather than sent at the wrong time:
 *
 *     start - 24h   "Tomorrow: X"      only when the event is more than 2 days away
 *     start - 15m   "In 15 minutes: X" only when the start is more than 15 minutes away
 *     start         "Starting now: X"
 *
 * The two-day floor on the day-before message is what keeps it from being noise: an event 30
 * hours out would otherwise get a "tomorrow" push six hours from now, on top of the other
 * two, all inside the same afternoon. Below that floor the 15-minute heads-up is the whole
 * warning, which is what it is for.
 *
 * This file owns the whole feature: the protocol, the state machine, and both of its
 * renderings. What a page still owns is its own *button*, because a Remind me on an event
 * row and one on a habitat time slot are different shapes of the same state;
 * `buttonState()` hands a page that state and the page decides what it looks like.
 *
 *     ui.js -> store.js -> auth.js -> remind.js -> data file -> page script
 *
 * Loaded by notifications.html (the setup page), index.html (the events list) and
 * mega-finale.html (habitat windows).
 *
 * ## Setting a reminder is not receiving one
 *
 * ntfy has no accounts and no address book: it delivers to a TOPIC that the trainer has
 * subscribed to in the app. Until they have, every reminder on the account is armed, correct,
 * and delivered nowhere.
 *
 * So the how-to has a page of its own — `notifications.html`, which calls `setup()`. It is
 * not attached to the events page: reminders can be armed from any page with something
 * time-boxed on it, and pinning the instructions to whichever list happened to grow buttons
 * first makes the other pages' buttons look self-explanatory when they are not. A page with
 * reminder buttons gets `panel()` instead — the count, the topic, and a link to setup().
 *
 * ## The topic is the password
 *
 * ntfy has no accounts: anyone who knows a topic name can read it and publish to it, so the
 * topic IS the credential. It is generated here with crypto.getRandomValues on first use and
 * kept at users/{uid}.ntfy.topic, which firestore.rules already protects.
 *
 * The Firebase uid is deliberately NOT used, nor a slice of it. A uid cannot be rotated: it
 * is printed in the Auth console, and once it has leaked — a screenshot, a shared device —
 * the user is stuck with a topic strangers can publish to for the life of the account. A
 * generated topic can be replaced, which is what rotate() does.
 *
 * But rotate() is NOT offered as a button. The topic is fixed for the life of the account,
 * because the whole setup is "paste this one string into the app": a New topic control sitting
 * next to it silently ends every future notification for anyone who presses it to see what it
 * does, and there is nothing on screen afterwards to say so. It stays in the API as the
 * break-glass path for a topic that actually leaks.
 *
 * ## Three server limits that shape everything here
 *
 * All three were verified against ntfy.sh rather than assumed, because each fails as an
 * HTTP 400 with a code, not as a wrong delivery time:
 *
 * 1. **The maximum delay is 3 days** (error 40006). Most events on the page are further out
 *    than that, so a reminder cannot simply be handed to ntfy when it is set. See "Armed vs
 *    scheduled" below — this is the reason that distinction exists at all.
 * 2. **The minimum delay is 10 seconds** (40005), and a delay in the past is not clamped,
 *    it is rejected (40004). So the 15-minute message is skipped, not sent late, when it is
 *    already too close to the start.
 * 3. **Rate limits** are per visitor: 60 requests of burst, refilling one per 5 seconds.
 *    reconcile() therefore schedules at most PER_LOAD reminders per page load.
 *
 * ## Armed vs scheduled
 *
 * Setting a reminder records it in Firestore — it is *armed*. It is handed to ntfy only once
 * the event is inside the 3-day window, which is what reconcile() does on every page load.
 * Until then nothing exists on the ntfy server at all.
 *
 * The honest consequence, and the panel says so on screen: an event more than three days out
 * needs this page opened once inside the last three days for its reminder to be scheduled.
 * There is no server here to do it unattended, and pretending otherwise would mean promising
 * a notification that silently never arrives.
 *
 * ## Two orderings chosen so a half-failure errs the safe way
 *
 * A partial failure should leave a notification that fires when it need not, never a UI
 * claiming a reminder that will never arrive — a phantom push is noticeable, a silent miss
 * is not, and you plan around a promise.
 *
 *     set:    publish to ntfy FIRST, then write Firestore.
 *     cancel: write Firestore FIRST, then delete at ntfy.
 *
 * Sequence IDs make that safe: they are derived from the event id, so a reminder can always
 * be cancelled even if the state write that recorded it never landed. Re-publishing the same
 * sequence ID replaces the pending message rather than adding a second one, so a double tap
 * cannot produce two notifications either.
 */

const Remind = (() => {
  const NTFY = 'https://ntfy.sh';

  /** How far ahead ntfy will accept a scheduled message. Its cap is 3 days exactly; the
   *  hour of margin is for clock skew, since the server checks the timestamp against its
   *  own clock and a browser running fast would be rejected right at the boundary. */
  const WINDOW_MS = 71 * 3600 * 1000;

  const DAY = 86400000;

  /** The last heads-up. A third notification goes at the start itself. */
  const LEAD_MS = 15 * 60 * 1000;

  /** How far out an event has to be to also get a "tomorrow" push a day before it. Two days,
   *  so that message is always at least a day clear of the 15-minute one — see the top. */
  const DAY_BEFORE_MIN = 2 * DAY;

  /** Server minimum is 10s; below this there is no point in a "starts soon" push anyway. */
  const MIN_DELAY_MS = 60 * 1000;

  /** Reminders scheduled per page load, to stay well inside the 60-request burst. Each one
   *  costs up to THREE publishes, so this is 18 requests at worst, not 6. The rest wait for
   *  the next load — anything inside the window has up to three days of them. */
  const PER_LOAD = 6;

  /** Guard against a runaway document, not a product limit anyone should reach. */
  const MAX = 50;

  /** The sequence-ID suffixes of one reminder's messages: day-before, 15-minute, start.
   *  One list so cancelling and rotating can never fall out of step with scheduling — a
   *  fourth shot added to schedule() and forgotten in clear() is an uncancellable push. */
  const SHOTS = ['-d', '-p', '-a'];

  let running = false;
  let lastRun = 0;

  /* ---------- identity ---------- */

  /**
   * A stable short id for an event, used as the ntfy sequence ID and as the key of the
   * stored record. Derived (FNV-1a) rather than stored so that cancelling never depends on
   * state that may not have been written — see the ordering note at the top. Feed ids run
   * to 90+ characters and carry characters Firestore dislikes in a field name; this does
   * not.
   */
  function key(eventId) {
    let h = 0x811c9dc5;
    for (let i = 0; i < eventId.length; i++) {
      h ^= eventId.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return 'r' + h.toString(16).padStart(8, '0');
  }

  /** 80 bits from the CSPRNG. Topic names allow [-_A-Za-z0-9] up to 64 characters; the
   *  `pogo-` prefix is so it is recognisable in a list of ntfy subscriptions. */
  function newTopic() {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    return 'pogo-' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function ensureTopic() {
    if (Store.ntfyTopic) return Store.ntfyTopic;
    const topic = newTopic();
    await Store.setTopic(topic);
    return topic;
  }

  /* ---------- the wire ---------- */

  /**
   * Publish one message. Deliberately posts JSON to the ROOT url with no headers set at all:
   * fetch labels a string body `text/plain;charset=UTF-8`, which is CORS-safelisted, so this
   * is a "simple" request and the browser never sends a preflight. Publishing with `X-Delay`
   * headers to /<topic> instead would work by curl and hang on an OPTIONS round-trip here.
   * Do not "tidy" this into headers, and do not add a Content-Type.
   */
  async function publish(body) {
    const res = await fetch(NTFY + '/', { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) {
      let why = 'HTTP ' + res.status;
      try { why = (await res.json()).error || why; } catch { /* keep the status */ }
      throw new Error(why);
    }
    return res.json();
  }

  /**
   * Drop a pending message. GET rather than DELETE for the same preflight reason as above,
   * and it answers 200 whether or not anything was actually pending — so cancelling twice,
   * or cancelling something that was never scheduled, is not an error to handle.
   */
  function drop(topic, sid) {
    return fetch(`${NTFY}/${encodeURIComponent(topic)}/${encodeURIComponent(sid)}/delete`);
  }

  const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  /**
   * Hand one reminder's messages to ntfy — see "What arrives, and when" at the top.
   *
   * The delay goes over as epoch SECONDS, never a wall-clock string. Half the event stamps
   * in the feed are local wall-clock and half are UTC instants (the trailing Z), `new Date`
   * already resolves both to the right moment, and turning that moment back into text for
   * ntfy to re-parse is how a Community Day reminder would land an hour out.
   */
  async function schedule(r, topic) {
    const start = new Date(r.s).getTime();
    const now = Date.now();
    const end = r.e ? new Date(r.e) : null;
    const label = r.t ? r.t + ' · ' : '';
    const when = fmtTime(new Date(start));

    // Whatever the page thought was worth carrying into the notification — the Pokémon in a
    // habitat, say. The reminder is read on a lock screen, away from the page, so "Jungle
    // habitat" alone often is not enough to act on.
    const note = r.x ? ' ' + r.x : '';

    const shots = [];

    // The day-before heads-up, and only for something genuinely far enough out that
    // "tomorrow" is news. Exactly 24h before a start is always the previous calendar day —
    // a DST change makes it 23 or 25 wall-clock hours, never enough to land on the same
    // day — so the wording holds without a date calculation.
    if (start - now > DAY_BEFORE_MIN) {
      shots.push({
        sid: r.k + '-d', at: start - DAY, priority: 3, tags: ['calendar'],
        title: 'Tomorrow: ' + r.n,
        message: `${label}starts at ${when} tomorrow.` + note,
      });
    }
    // Skipped rather than sent late when the event is already inside 15 minutes: ntfy
    // rejects a delay in the past outright (40004) instead of delivering immediately.
    if (start - LEAD_MS - now > MIN_DELAY_MS) {
      shots.push({
        sid: r.k + '-p', at: start - LEAD_MS, priority: 4, tags: ['alarm_clock'],
        title: 'In 15 minutes: ' + r.n,
        message: `${label}starts at ${when}.` + note,
      });
    }
    if (start - now > MIN_DELAY_MS) {
      shots.push({
        sid: r.k + '-a', at: start, priority: 3, tags: ['bell'],
        title: 'Starting now: ' + r.n,
        message: label + (end ? `runs until ${fmtTime(end)}.` : 'has started.') + note,
      });
    }
    if (!shots.length) return false;

    for (const s of shots) {
      await publish({
        topic,
        title: s.title,
        message: s.message,
        priority: s.priority,
        tags: s.tags,
        click: r.l || undefined,
        delay: String(Math.floor(s.at / 1000)),
        sequence_id: s.sid,
      });
    }
    return true;
  }

  /* ---------- state ---------- */

  const find = (eventId) => Store.reminders.find((r) => r.k === key(eventId));

  /**
   * What the button should show. 'off' | 'armed' | 'scheduled' — armed means recorded but
   * still further out than ntfy will accept, which is a different promise and says so.
   */
  function status(eventId) {
    const r = find(eventId);
    if (!r) return 'off';
    return r.d ? 'scheduled' : 'armed';
  }

  /**
   * Arm a reminder. `e` is { id, name, start, end, link, label, note } — the page supplies
   * the display strings, this file never reaches into any feed's shape.
   */
  async function set(e) {
    if (Store.locked) throw new Error('Sign in first — reminders are saved to your account.');
    if (find(e.id)) return;                       // already on; the button would say so
    if (Store.reminders.length >= MAX) {
      throw new Error(`That is ${MAX} reminders already. Cancel one first.`);
    }
    const start = new Date(e.start).getTime();
    if (!(start - Date.now() > MIN_DELAY_MS)) throw new Error('That one is about to start.');

    const topic = await ensureTopic();
    const r = { k: key(e.id), n: e.name, s: e.start, e: e.end || null,
                l: e.link || null, t: e.label || null, x: e.note || null, d: 0 };

    // ntfy first: a failure here must leave the UI saying "not set", because that is true.
    if (start - Date.now() <= WINDOW_MS) {
      await schedule(r, topic);
      r.d = 1;
    }
    await Store.setReminders([...Store.reminders, r]);
  }

  /** Cancel a reminder. Firestore first — see the ordering note at the top. */
  const clear = (eventId) => clearKey(key(eventId));

  /**
   * Cancel by stored key rather than by event id, which is what the notifications page has:
   * it lists what is on the account, and an event that has dropped out of the feed no longer
   * has a button anywhere. Without this, a reminder for something that stopped being listed
   * could never be cancelled — it would just fire.
   */
  async function clearKey(k) {
    if (Store.locked) return;
    if (!Store.reminders.some((r) => r.k === k)) return;
    await Store.setReminders(Store.reminders.filter((r) => r.k !== k));
    const topic = Store.ntfyTopic;
    if (!topic) return;
    // Unconditional, not just when it was scheduled: dropping is idempotent and free, and a
    // stale flag must not be what stands between the user and a push they cancelled.
    await Promise.all(SHOTS.map((suffix) => drop(topic, k + suffix)));
  }

  /**
   * Hand ntfy everything that has come inside its 3-day window, and forget everything whose
   * event has been and gone. Called on load and whenever the account's state changes.
   */
  async function reconcile() {
    if (running || Store.locked || !Store.loaded) return;
    if (Date.now() - lastRun < 60000) return;     // a page load re-renders every minute
    const list = Store.reminders;
    if (!list.length) return;
    running = true;
    lastRun = Date.now();
    try {
      const now = Date.now();
      // A finished event's reminder has already fired or expired; keeping it would grow the
      // document forever. One day of slack so a still-running event stays visible as set.
      const keep = list.filter((r) => new Date(r.s).getTime() > now - DAY);
      let changed = keep.length !== list.length;
      let budget = PER_LOAD;

      for (const r of keep) {
        if (r.d) continue;
        const start = new Date(r.s).getTime();
        if (start - now > WINDOW_MS) continue;    // still out of ntfy's reach
        if (budget <= 0) break;                   // the rest catch the next load
        budget--;
        try {
          const topic = await ensureTopic();
          await schedule(r, topic);
          r.d = 1;
          changed = true;
        } catch (err) {
          console.warn('[remind] could not schedule', r.n, err);
          break;                                  // rate limit or outage: stop, retry later
        }
      }
      if (changed) await Store.setReminders(keep);
    } finally {
      running = false;
    }
  }

  /** Prove the pipe works end to end, before an event depends on it. */
  async function test() {
    const topic = await ensureTopic();
    await publish({
      topic,
      title: 'Reminders are working',
      message: 'This is what an event reminder will look like.',
      tags: ['white_check_mark'],
    });
  }

  /**
   * Replace the topic — the reason a generated topic beats the uid. Everything pending on
   * the old topic is dropped first, and every reminder goes back to armed so reconcile()
   * re-schedules it on the new one.
   */
  async function rotate() {
    const old = Store.ntfyTopic;
    const list = Store.reminders;
    if (old) {
      await Promise.all(list.flatMap((r) => SHOTS.map((sfx) => drop(old, r.k + sfx))));
    }
    await Store.setTopic(newTopic());
    if (list.length) await Store.setReminders(list.map((r) => ({ ...r, d: 0 })));
    lastRun = 0;
    await reconcile();
  }

  /* ---------- what a page needs to draw a button ---------- */

  /**
   * The state of one event's reminder, and the words for it. A page decides what the
   * control looks like — an event row's button and a habitat's time pill are the same
   * three states in different shapes — but not what they mean, or the two would drift.
   *
   * `busy` is true while the sign-in state is still unknown: offering "sign in" to someone
   * who already is would be a lie, so the control disables itself and says so, the way the
   * tracker pages' gate sits in a muted "checking" state rather than hiding.
   */
  function buttonState(eventId) {
    if (document.body.classList.contains('auth-busy')) {
      return { state: 'busy', on: false, busy: true, label: 'Remind me',
               title: 'Checking your sign-in…' };
    }
    const state = Store.locked ? 'off' : status(eventId);
    return {
      state,
      on: state !== 'off',
      busy: false,
      label: state === 'off' ? 'Remind me' : 'Reminder set',
      title: {
        off: 'A push the day before if it is more than two days away, another 15 minutes '
           + 'before it starts, and one as it begins.',
        armed: 'Saved to your account. It is handed to ntfy once the event is under three '
             + 'days away — open this page some time in that window. Click to cancel.',
        scheduled: 'Scheduled — the day before where that applies, 15 minutes before, and '
                 + 'as it begins. Click to cancel.',
      }[state],
    };
  }

  /**
   * Toggle one reminder and report what happened into the panel. Returns nothing; the page
   * re-renders off Store's change event.
   *
   * @param e  the same shape set() takes
   */
  async function toggle(e) {
    if (Store.locked) return prompt();
    try {
      if (status(e.id) === 'off') {
        await set(e);
        say(status(e.id) === 'scheduled'
          ? `Reminder scheduled for ${e.name}.`
          : `Reminder saved for ${e.name} — it is scheduled once the event is three days away.`,
          'ok');
      } else {
        await clear(e.id);
        say(`Reminder cancelled for ${e.name}.`);
      }
    } catch (err) {
      say('Could not change that reminder: ' + err.message, 'bad');
    }
  }

  /* ---------- the setup page, and the strip that points at it ---------- */
  //
  // Two renderings of the same feature, because they answer different questions.
  //
  //   setup()   notifications.html — the whole how-to: the topic, the three steps, the app
  //             links, the test. Reminders can be armed from any page that has something
  //             time-boxed on it, and every one of those needs this, so it belongs on a page
  //             of its own rather than pinned to the top of whichever list came first.
  //   panel()   the strip on a page that HAS reminder buttons: what a reminder is, how many
  //             are set, the topic with a Copy button, and a link to setup(). No steps —
  //             they are 300px of instructions above the thing the trainer came for.
  //
  // Both live here rather than in a page script because both are the feature, not a page.

  const SETUP_URL = 'notifications.html';

  const WHAT = 'A push the day before — for anything more than two days out — another 15 '
             + 'minutes before it starts, and one as it begins.';

  let revealed = false;      // a page with no sign-in gate shows the ask only on demand
  let notice = '';
  let tone = '';
  let noticeTimer = null;
  let mount = null;          // { fn, target, opts } — whichever of the two rendered last

  /** A line under the panel saying what just happened. It clears itself — these pages
   *  re-render every minute, and a stale "Reminder cancelled" an hour later is noise. */
  function say(text, kind) {
    notice = text;
    tone = kind || '';
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice = ''; paint(); }, 20000);
    paint();
  }

  /** Redraw whichever rendering is on this page — used by say(), prompt() and primeTopic(),
   *  which change what the block says but not the page around it. */
  const paint = () => mount && mount.fn(mount.target, mount.opts);

  /** A locked control was pressed on a page with no sign-in gate — reveal the panel and
   *  point at it. On a page that has a gate, that gate is the right thing to point at. */
  function prompt() {
    if (document.body.hasAttribute('data-tracker')) return Auth.prompt();
    revealed = true;
    paint();
    UI.flash(document.querySelector(mount ? mount.target : '#reminders'));
  }

  /**
   * Empty a container and hand back a function that puts keyboard focus where it was.
   *
   * Every page here re-renders on a timer and after every reminder change, which rebuilds
   * this block out from under whoever is using it: a keyboard user tabbed onto Send a test,
   * or pointed here by prompt(), is dumped back at the top of the document a moment later.
   */
  function keepFocus(box) {
    const controls = () => [...box.querySelectorAll('button, a')];
    const at = box.contains(document.activeElement)
      ? controls().indexOf(document.activeElement) : -1;
    box.textContent = '';
    return () => {
      if (at < 0) return;
      const next = controls();
      (next[at] || next[0])?.focus({ preventScroll: true });
    };
  }

  /** Signed out, both renderings say the same thing, so they say it in the same words. */
  const askBlock = () => [
    UI.el('div', { class: 'rb-body' },
      UI.el('strong', { text: 'Sign in to get event reminders' }),
      UI.el('p', { class: 'rb-note', text:
        'A reminder is saved to your Google account so it follows you between devices, and '
        + 'is delivered as a push notification by ntfy.sh — a free app you subscribe to once. '
        + 'Everything else on this site works signed out.' })),
    UI.el('div', { class: 'rb-acts' }, Auth.googleButton('signin', 'Sign in with Google')),
  ];

  function counts() {
    const n = Store.reminders.length;
    const waiting = Store.reminders.filter((r) => !r.d).length;
    return n
      ? `${n} reminder${n === 1 ? '' : 's'} set`
        + (waiting ? ` · ${waiting} waiting for the three-day window` : '')
      : 'No reminders set yet.';
  }

  /**
   * The strip on a page that has reminder buttons.
   *
   * @param target  selector for the container, which must already be in the HTML
   * @param opts    reveal  true on a page with no sign-in gate: signed out the strip is
   *                        hidden until prompt() reveals it, and then it does the asking.
   *                        false where the page's own gate already covers that.
   *                hidden  true to render nothing at all — the Mega Finale page uses this
   *                        once the event is over, when there is nothing left to remind about
   *                hint    one extra line of page-specific instruction
   */
  function panel(target, opts = {}) {
    mount = { fn: panel, target, opts };
    const box = document.querySelector(target);
    if (!box) return;
    const restore = keepFocus(box);

    if (opts.hidden) { box.hidden = true; return; }

    if (Store.locked) {
      // Signed out with a gate on the page, the gate says it better and this would be a
      // second banner saying the same thing.
      box.hidden = !opts.reveal || !revealed;
      if (box.hidden) return;
      box.append(...askBlock());
      restore();
      return;
    }

    box.hidden = false;
    primeTopic();
    box.append(
      UI.el('div', { class: 'rb-body' },
        UI.el('strong', { text: 'Event reminders' }),
        UI.el('p', { class: 'rb-note', text: WHAT }),
        opts.hint && UI.el('p', { class: 'rb-note', text: opts.hint }),
        UI.el('p', { class: 'rb-note', text: counts() }),
        // The one line that has to be here rather than on the setup page: an armed reminder
        // with no subscription behind it looks exactly like a working one until it silently
        // fails to arrive.
        UI.el('p', { class: 'rb-note', text:
          'Nothing is delivered until you subscribe to your topic in the ntfy app — that is '
          + 'a one-time setup.' }),
        topicRow(Store.ntfyTopic)),
      UI.el('div', { class: 'rb-acts' },
        UI.el('a', { class: 'elink track', href: SETUP_URL, text: 'Set up notifications' })),
      notice && UI.el('p', { class: 'rb-status ' + tone, text: notice }));
    restore();
  }

  /**
   * The whole how-to, for notifications.html.
   *
   * The gap this closes: a reminder that is SET and a reminder that ARRIVES are different
   * things, because ntfy has no accounts and no address book — it delivers to a
   * *subscription*. Ship the button without these steps and the feature silently does
   * nothing for everyone who has not already installed the app.
   */
  function setup(target) {
    mount = { fn: setup, target, opts: {} };
    const box = document.querySelector(target);
    if (!box) return;
    const restore = keepFocus(box);

    if (Store.locked) { box.append(...askBlock()); restore(); return; }

    primeTopic();
    const topic = Store.ntfyTopic;
    box.append(
      UI.el('div', { class: 'rb-body' },
        UI.el('strong', { text: 'Get your notifications' }),
        UI.el('p', { class: 'rb-note', text:
          'Reminders are delivered by ntfy.sh, which has no accounts and no address book — it '
          + 'delivers to a topic that you subscribe to. Do this once and every reminder you '
          + 'set anywhere on this site arrives on this device.' }),
        topicRow(topic),
        steps(topic),
        UI.el('p', { class: 'rb-note rb-warn', text:
          'Treat the topic like a password. Anyone who knows it can read your reminders and '
          + 'send you notifications, so it is the one thing on this page not to paste '
          + 'anywhere public. It stays the same for the life of your account.' })),
      UI.el('div', { class: 'rb-acts' }, actions(topic)),
      notice && UI.el('p', { class: 'rb-status ' + tone, text: notice }));
    restore();
  }

  /* ---------- the pieces both of them use ---------- */

  const APPS = [
    ['iPhone', 'https://apps.apple.com/us/app/ntfy/id1625396347'],
    ['Android', 'https://play.google.com/store/apps/details?id=io.heckel.ntfy'],
    ['F-Droid', 'https://f-droid.org/en/packages/io.heckel.ntfy/'],
  ];

  /** ntfy:// is documented as ANDROID ONLY. Offered anywhere else it is a button that does
   *  nothing at all — no error, no app, no clue why — which is how it shipped once. */
  const isAndroid = () => /Android/i.test(navigator.userAgent);

  const appLink = (t) => `ntfy://ntfy.sh/${t}?display=${encodeURIComponent('Pokémon GO')}`;
  const webLink = (t) => `${NTFY}/${t}`;

  function actions(topic) {
    return [
      topic && isAndroid() && UI.el('a', { class: 'elink', href: appLink(topic),
        text: 'Open in ntfy app',
        title: 'Opens the ntfy Android app on this device and subscribes to your topic.' }),
      topic && UI.el('a', { class: 'elink', href: webLink(topic), target: '_blank',
        rel: 'noopener', text: 'Open in browser',
        title: 'The ntfy web app, subscribed to your topic. It only delivers while that tab '
             + 'stays open — the phone app is the one that wakes you up.' }),
      UI.el('button', { class: 'elink track', text: 'Send a test',
                        on: { click: (ev) => act(ev.currentTarget, runTest) } }),
    ];
  }

  /** The topic, once, where it is easy to see and to copy. It is a credential, so it gets
   *  its own labelled row rather than being woven into a sentence — and Copy sits beside it
   *  because pasting it into the app is the entire setup. */
  function topicRow(topic) {
    if (!topic) return null;
    return UI.el('div', { class: 'rb-topicrow' },
      UI.el('span', { class: 'rb-label', text: 'Your topic' }),
      UI.el('code', { class: 'rb-topic', text: topic }),
      UI.el('button', { class: 'elink', text: 'Copy',
                        on: { click: () => copyTopic(topic) } }));
  }

  function steps(topic) {
    const link = (label, href) =>
      UI.el('a', { class: 'rb-link', href, target: '_blank', rel: 'noopener', text: label });

    return UI.el('ol', { class: 'rb-steps' },
      UI.el('li', {},
        UI.el('strong', { text: 'Install ntfy.' }),
        ' Free and open source, and it needs no account: ',
        APPS.map(([label, href], i) => [i ? ' · ' : '', link(label, href)]),
        UI.el('span', { class: 'rb-sub', text:
          'On a desktop you can skip the install and use Open in browser instead — but it '
          + 'only delivers while that tab stays open.' })),
      UI.el('li', {},
        UI.el('strong', { text: 'Subscribe to your topic.' }),
        topic
          ? ' In the app, tap + → Subscribe to topic, paste the topic above, leave the '
            + 'server as ntfy.sh, and tap Subscribe.'
          : ' A topic is created for you the moment you sign in — it will appear above.',
        topic && isAndroid() && UI.el('span', { class: 'rb-sub', text:
          'On this Android device, Open in ntfy app does both of those in one tap.' })),
      UI.el('li', {},
        UI.el('strong', { text: 'Send a test.' }),
        ' That button publishes one straight away. If it does not arrive in a few seconds '
        + 'the subscription is not live yet — step 2 is where it went wrong, not your '
        + 'reminders.'));
  }

  /** Copy, with a fallback that leaves the topic selected — the clipboard API is refused
   *  outright in some browsers and on any non-secure origin, and a step 2 that cannot be
   *  completed is worse than one extra keystroke. */
  async function copyTopic(topic) {
    try {
      await navigator.clipboard.writeText(topic);
      say('Topic copied. Paste it into the ntfy app to subscribe.', 'ok');
    } catch {
      say('Could not reach the clipboard — the topic is selected, press Ctrl-C or ⌘C.');
      // say() has just rebuilt the block, so select in the NEW node, not the one clicked.
      const code = document.querySelector((mount ? mount.target : '#reminders') + ' .rb-topic');
      if (!code) return;
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  /**
   * A trainer who has signed in but never set a reminder has no topic yet — and the setup
   * page is read BEFORE the first reminder, so step 2 cannot be blank. Mint it on first
   * sight of either rendering: one Firestore write, once in the life of an account.
   */
  let topicPending = false;
  function primeTopic() {
    if (topicPending || Store.locked || !Store.loaded || Store.ntfyTopic) return;
    topicPending = true;
    ensureTopic()
      .then(paint)
      .catch((err) => console.warn('[remind] could not create a topic', err))
      .finally(() => { topicPending = false; });
  }

  /** Every action here is a network call: disable it while it runs, report what happened. */
  async function act(btn, fn) {
    btn.disabled = true;
    try {
      await fn();
    } catch (err) {
      say(err.message, 'bad');
    } finally {
      btn.disabled = false;
    }
  }

  async function runTest() {
    await test();
    say('Test sent. If nothing arrives within a few seconds, the topic is not subscribed to '
      + 'in the ntfy app yet — see the three steps above.', 'ok');
  }

  return {
    status, set, clear, clearKey, reconcile, test, ensureTopic,
    buttonState, toggle, panel, setup, say, prompt,
    /** Deliberately NOT a button anywhere. The topic is fixed for the life of the account:
     *  a New topic control sat next to the one string the trainer had just pasted into the
     *  ntfy app, and pressing it silently stops every future notification until they redo
     *  the setup. This stays exported as the break-glass path if one ever leaks. */
    rotate,
    /** Armed but not yet handed to ntfy. */
    get waiting() { return Store.reminders.filter((r) => !r.d).length; },
    get topic() { return Store.ntfyTopic; },
    LEAD_MS, WINDOW_MS, MAX,
  };
})();
