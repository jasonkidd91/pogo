/**
 * Google sign-in and Firestore-backed progress.
 *
 * Loads the Firebase modular SDK from the CDN with dynamic import(), so the site keeps its
 * no-build, no-package-manager setup: this is a plain classic script like every other file
 * here, and nothing on the page has to become a module.
 *
 * Load order: store.js → auth.js → data file → page script.
 *
 * ---------------------------------------------------------------------------------------
 * FREE-TIER BUDGET — the shape of this file is dictated by it.
 * Spark plan gives 50k Firestore reads, 20k writes and 20k deletes per day.
 *
 *   ONE DOCUMENT PER USER.       users/{uid}.caught is an array of canonical keys. Reading
 *                                a whole collection log costs 1 read, not 1 per Pokémon.
 *   WRITES ARE DEBOUNCED.        Every save rewrites the entire array, so ticking 40 boxes
 *                                in a row is ONE write, not 40. The cost is last-writer-
 *                                wins if two devices tick within the same ~1.5s window;
 *                                for a personal catch list that is the right trade, and
 *                                the live listener keeps the window that small.
 *   ONE LISTENER PER PAGE.       A single onSnapshot on a single doc. Multi-tab persistence
 *                                elects one tab to own the connection, so five open tabs
 *                                stream once between them rather than five times.
 *   NO ANALYTICS.                getAnalytics() is deliberately not wired up — it is another
 *                                ~50 kB on every page and measures nothing this site acts on.
 *
 * A heavy session — browse every page, tick a hundred things — costs a few dozen reads and
 * a handful of writes. There is roughly three orders of magnitude of headroom.
 * ---------------------------------------------------------------------------------------
 *
 * The apiKey below is not a secret: web Firebase config identifies the project, it does not
 * authorise anything. Access is enforced by firestore.rules in the repo root, which lets a
 * signed-in user read and write users/{their own uid} and nothing else. Deploy those rules
 * before trusting this — a default open-test-mode database is world-writable.
 */

const Auth = (() => {
  const SDK = 'https://www.gstatic.com/firebasejs/12.18.0/';

  const firebaseConfig = {
    apiKey: 'AIzaSyANBoZ_eY399F9onCuaxDgigfYmLUIRxlc',
    authDomain: 'pogo-50a69.firebaseapp.com',
    projectId: 'pogo-50a69',
    storageBucket: 'pogo-50a69.firebasestorage.app',
    messagingSenderId: '815691142894',
    appId: '1:815691142894:web:d118ab7eed60f0f61c05ff',
    measurementId: 'G-5KBYBC3QDM',
  };

  /** Coalescing window for writes. Long enough to swallow a burst of ticking. */
  const FLUSH_MS = 1500;

  let state = 'loading'; // loading | out | in | error
  let problem = '';
  let fb = null;         // the bits of the SDK we use, once imported
  let ref = null;        // DocumentReference for the signed-in user
  let unsub = null;      // detach for the current onSnapshot
  let pending = null;    // keys waiting to be written, or null when clean
  let timer = null;

  /* ---------- persistence ---------- */

  function queue(keys) {
    pending = keys;
    clearTimeout(timer);
    timer = setTimeout(flush, FLUSH_MS);
  }

  async function flush() {
    clearTimeout(timer);
    if (!pending || !ref) return;
    const keys = pending;
    pending = null;
    try {
      await fb.setDoc(ref, { caught: keys, updatedAt: fb.serverTimestamp() }, { merge: true });
    } catch (err) {
      // Offline writes are held by the SDK and replayed, so this is a real failure.
      console.error('[auth] could not save progress', err);
      pending = keys;
    }
  }

  function watch(uid) {
    ref = fb.doc(fb.db, 'users', uid);
    let seeded = false;
    unsub = fb.onSnapshot(
      ref,
      (snap) => {
        const keys = snap.exists() ? (snap.data().caught || []) : [];
        // First answer from the server (not the offline cache) for a brand-new account:
        // adopt whatever this browser had ticked before sign-in existed, once, then let
        // the legacy key go so a second account here doesn't inherit it too.
        if (!seeded && !snap.metadata.fromCache) {
          seeded = true;
          const legacy = Store._legacy();
          Store._dropLegacy();
          if (!snap.exists() && legacy.length) {
            Store._receive(legacy);
            queue(legacy);
            return;
          }
        }
        Store._receive(keys);
      },
      (err) => {
        // Almost always firestore.rules denying the read, or Firestore not enabled yet.
        fail('Could not read your saved progress: ' + (err.code || err.message));
      },
    );
  }

  /* ---------- auth ---------- */

  async function boot() {
    const [app, auth, store] = await Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-firestore.js'),
    ]);

    const application = app.initializeApp(firebaseConfig);

    // Offline cache, shared across tabs. Falls back to memory-only where IndexedDB is
    // unavailable (private windows, blocked site data) rather than failing to start.
    let db;
    try {
      db = store.initializeFirestore(application, {
        localCache: store.persistentLocalCache({ tabManager: store.persistentMultipleTabManager() }),
      });
    } catch {
      db = store.getFirestore(application);
    }

    fb = {
      db,
      auth: auth.getAuth(application),
      provider: new auth.GoogleAuthProvider(),
      signInWithPopup: auth.signInWithPopup,
      signInWithRedirect: auth.signInWithRedirect,
      signOut: auth.signOut,
      doc: store.doc,
      setDoc: store.setDoc,
      onSnapshot: store.onSnapshot,
      serverTimestamp: store.serverTimestamp,
    };

    // Keep the session across restarts; this is a long-lived collection log.
    await auth.setPersistence(fb.auth, auth.browserLocalPersistence);
    // Always let the account be chosen — shared devices are common for this.
    fb.provider.setCustomParameters({ prompt: 'select_account' });

    Store._install({ save: queue });

    auth.onAuthStateChanged(fb.auth, (user) => {
      if (unsub) { unsub(); unsub = null; }
      ref = null;
      pending = null;
      clearTimeout(timer);

      // An involuntary sign-out (revoked token, account switch) drops at most one debounce
      // window of ticks. Writing them now would just be rejected by the rules anyway;
      // signOut() below flushes first, which covers the deliberate case.
      if (!user) {
        state = 'out';
        Store._setUser(null);
        paint();
        return;
      }
      state = 'in';
      Store._setUser({
        uid: user.uid,
        name: user.displayName || user.email || 'Trainer',
        email: user.email || '',
        photo: user.photoURL || '',
      });
      watch(user.uid);
      paint();
    });
  }

  function fail(message) {
    state = 'error';
    problem = message;
    paint();
  }

  const ready = boot().catch((err) => {
    console.error('[auth] Firebase failed to load', err);
    fail('Sign-in is unavailable — Firebase could not load.');
  });

  async function signIn() {
    await ready;
    if (!fb) return;
    try {
      await fb.signInWithPopup(fb.auth, fb.provider);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      if (err.code === 'auth/popup-blocked' ||
          err.code === 'auth/operation-not-supported-in-this-environment') {
        return fb.signInWithRedirect(fb.auth, fb.provider);
      }
      if (err.code === 'auth/unauthorized-domain') {
        return fail('This domain is not in the Firebase project’s authorised domains.');
      }
      fail('Sign-in failed: ' + (err.code || err.message));
    }
  }

  async function signOutNow() {
    await ready;
    if (!fb) return;
    await flush(); // don't drop the last tick on the way out
    await fb.signOut(fb.auth);
  }

  /* ---------- UI ---------- */

  const GOOGLE_G =
    '<svg class="g" viewBox="0 0 48 48" aria-hidden="true">' +
    '<path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>' +
    '<path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>' +
    '<path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"/>' +
    '<path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>' +
    '</svg>';

  /**
   * The Google button. The G is a constant SVG, so it goes in as markup the way ui.js's
   * check mark does; the label is a text node.
   */
  function googleButton(cls, label) {
    const btn = el('button', { class: cls, on: { click: signIn } });
    btn.innerHTML = GOOGLE_G;
    btn.appendChild(document.createTextNode(label));
    return btn;
  }

  function paintNav() {
    const box = document.getElementById('authbox');
    if (!box) return;
    box.textContent = '';

    if (state === 'loading') {
      box.appendChild(el('span', { class: 'authnote', text: 'Checking sign-in…' }));
      return;
    }
    if (state === 'in') {
      const u = Store.user;
      // Built as nodes, never innerHTML: displayName is whatever Google has on file for this
      // account and is not ours to trust as markup.
      box.append(
        // lh3 URLs 403 when a referrer is sent.
        u.photo && el('img', { class: 'avatar', alt: '', referrerPolicy: 'no-referrer', src: u.photo }),
        el('span', { class: 'who', text: u.name.split(' ')[0], title: u.email }),
        el('button', { class: 'linkbtn', text: 'Sign out', on: { click: signOutNow } }),
      );
      return;
    }
    box.appendChild(googleButton('signin', 'Sign in'));
  }

  function paintGate() {
    // Only pages that own a catch list get a sign-in gate. The events page has nothing to
    // tick, so a "sign in to use the tracker" banner there would be noise about a feature
    // that page does not have.
    if (!document.body.hasAttribute('data-tracker')) return;
    const wrap = document.querySelector('.wrap');
    if (!wrap) return;

    let gate = document.getElementById('authgate');
    if (state === 'in') {
      if (gate) gate.remove();
      return;
    }
    if (!gate) {
      gate = el('div', { id: 'authgate', class: 'authgate', role: 'status' });
      // Above the sticky summary bar, below the page's own headline.
      wrap.insertBefore(gate, wrap.querySelector('.summary') || wrap.firstChild);
    }

    // The SDK is ~700 kB over three modules. On a slow connection that is many seconds during
    // which the cards are rendered but inert, so the gate has to be on screen from the first
    // paint saying so — silence here reads as a broken tracker. Neutral wording, because we
    // don't yet know whether they're signed in.
    const body = (head, text) => el('div', { class: 'gate-body' },
      el('strong', { text: head }), el('p', { text }));

    gate.textContent = '';
    if (state === 'loading') {
      gate.classList.remove('bad');
      gate.classList.add('checking');
      gate.appendChild(body('Checking your sign-in…',
        'The tracker unlocks in a moment. Browsing the list works either way.'));
      return;
    }
    gate.classList.remove('checking');

    if (state === 'error') {
      gate.classList.add('bad');
      gate.appendChild(body('Tracking is unavailable', problem));
      return;
    }
    gate.classList.remove('bad');
    gate.append(
      body('Sign in to use the tracker',
        'Ticking Pokémon off needs a Google account — progress is saved to it and follows you '
        + 'to every device and every page here. Browsing the lists works without signing in.'),
      googleButton('signin big', 'Sign in with Google'));
  }

  // Progress changes fire this too, and there is no reason to rebuild the nav — and re-request
  // the avatar — on every tick. Only the auth state actually changes what these two draw.
  let painted = '';

  function paint(force) {
    document.body.classList.toggle('signed-out', Store.locked);
    document.body.classList.toggle('auth-busy', state === 'loading');

    const sig = state + ':' + (Store.user ? Store.user.uid : '');
    if (!force && sig === painted) return;
    painted = sig;
    paintNav();
    paintGate();
  }

  // Re-paint whenever progress or the signed-in account changes; the pages re-render
  // themselves off the same signal.
  Store.onChange(paint);

  // A tick made just before the tab goes away must not sit in the debounce window.
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);

  return {
    /** Called by buildNav() once the nav exists — always repaints into the new markup. */
    mount: () => paint(true),
    signIn,
    signOut: signOutNow,
    /** A locked card was clicked — draw the eye to the gate. */
    prompt() {
      paintGate();
      const gate = document.getElementById('authgate');
      if (!gate) return;
      gate.scrollIntoView({ behavior: 'smooth', block: 'center' });
      gate.classList.remove('flash');
      void gate.offsetWidth; // restart the animation
      gate.classList.add('flash');
      gate.querySelector('button')?.focus({ preventScroll: true });
    },
  };
})();
