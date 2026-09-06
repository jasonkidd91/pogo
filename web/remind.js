/**
 * remind.js — "Remind me" on the events page, delivered by ntfy.sh.
 *
 * Signed in, any event that has not started yet can be armed for two push notifications:
 * one 15 minutes before it starts, one as it starts. State lives on the account, in the
 * same Firestore document as the catch list, so a reminder set on a phone shows as set on
 * a laptop and cannot be armed twice.
 *
 * This file is the protocol and the state machine only — no DOM. events.js owns the button
 * and the panel. Load order on the events page:
 *
 *     ui.js -> store.js -> auth.js -> remind.js -> events-data.js -> events.js
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

  /** The heads-up. The second notification goes at the start itself. */
  const LEAD_MS = 15 * 60 * 1000;

  /** Server minimum is 10s; below this there is no point in a "starts soon" push anyway. */
  const MIN_DELAY_MS = 60 * 1000;

  /** Reminders scheduled per page load, to stay well inside the 60-request burst. The rest
   *  wait for the next load — anything in the window has up to three days of them. */
  const PER_LOAD = 8;

  /** Guard against a runaway document, not a product limit anyone should reach. */
  const MAX = 50;

  const DAY = 86400000;

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
   * Hand both messages for one reminder to ntfy.
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

    const shots = [];
    // Skipped rather than sent late when the event is already inside 15 minutes: ntfy
    // rejects a delay in the past outright (40004) instead of delivering immediately.
    if (start - LEAD_MS - now > MIN_DELAY_MS) {
      shots.push({
        sid: r.k + '-p', at: start - LEAD_MS, priority: 4, tags: ['alarm_clock'],
        title: 'In 15 minutes: ' + r.n,
        message: `${label}starts at ${when}.`,
      });
    }
    if (start - now > MIN_DELAY_MS) {
      shots.push({
        sid: r.k + '-a', at: start, priority: 3, tags: ['bell'],
        title: 'Starting now: ' + r.n,
        message: label + (end ? `runs until ${fmtTime(end)}.` : 'has started.'),
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
   * Arm a reminder. `e` is { id, name, start, end, link, label } — events.js supplies the
   * display strings, this file never reaches into the feed's shape.
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
                l: e.link || null, t: e.label || null, d: 0 };

    // ntfy first: a failure here must leave the UI saying "not set", because that is true.
    if (start - Date.now() <= WINDOW_MS) {
      await schedule(r, topic);
      r.d = 1;
    }
    await Store.setReminders([...Store.reminders, r]);
  }

  /** Cancel a reminder. Firestore first — see the ordering note at the top. */
  async function clear(eventId) {
    if (Store.locked) return;
    const k = key(eventId);
    if (!Store.reminders.some((r) => r.k === k)) return;
    await Store.setReminders(Store.reminders.filter((r) => r.k !== k));
    const topic = Store.ntfyTopic;
    if (!topic) return;
    // Unconditional, not just when it was scheduled: dropping is idempotent and free, and a
    // stale flag must not be what stands between the user and a push they cancelled.
    await Promise.all([drop(topic, k + '-p'), drop(topic, k + '-a')]);
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
      await Promise.all(list.flatMap((r) => [drop(old, r.k + '-p'), drop(old, r.k + '-a')]));
    }
    await Store.setTopic(newTopic());
    if (list.length) await Store.setReminders(list.map((r) => ({ ...r, d: 0 })));
    lastRun = 0;
    await reconcile();
  }

  return {
    status, set, clear, reconcile, test, rotate, ensureTopic,
    /** For the panel: how many are armed but not yet handed over. */
    get waiting() { return Store.reminders.filter((r) => !r.d).length; },
    get topic() { return Store.ntfyTopic; },
    /** Where the user subscribes. The app deep-links; the https url is the web reader. */
    appLink: (t) => `ntfy://ntfy.sh/${t}?display=${encodeURIComponent('Pokémon GO')}`,
    webLink: (t) => `${NTFY}/${t}`,
    LEAD_MS, WINDOW_MS, MAX,
  };
})();
