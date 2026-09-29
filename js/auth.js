/* ============================================================
   NexaFlow AI — Authentication & Security engine (auth.js)
   ============================================================
   Provides: sign up / sign in, session management, PIN lock,
   fingerprint (WebAuthn passkey) unlock, inactivity auto-lock,
   and Firebase Authentication (optional, real security).

   HOW IT WORKS
   - Firebase (production): with your keys in firebase-config.js,
     accounts are real and server-verified via Firebase.
   - Demo mode (beginner-friendly): if Firebase is not configured
     or can't be reached, the app falls back to accounts stored in
     this browser only, so you can try the whole flow right now.
     A banner clearly labels demo mode.

   SECURITY NOTES (read security.md)
   - PIN: stored as a salted SHA-256 hash, never in plain text.
     Wrong attempts lock the app. PIN is a device-local layer,
     not a substitute for a real password.
   - Fingerprint: uses the WebAuthn standard. Your fingerprint
     never leaves the device; the private key lives in the secure
     enclave. Requires HTTPS (a deployed domain) to work.
   ============================================================ */
(function () {
  'use strict';

  /* ============ FIREBASE CONFIG ============
     Keys live in firebase-config.js (loaded BEFORE this file).
     If missing or still placeholders, the app runs in demo mode
     (browser-only accounts) so beginners can try it without setup. */
  var CONFIG = window.NEXAFLOW_FIREBASE || {};
  var FIREBASE_ENABLED = !!(
    CONFIG.apiKey &&
    CONFIG.apiKey.indexOf('PASTE') === -1 &&
    CONFIG.authDomain &&
    CONFIG.authDomain.indexOf('your-project') === -1 &&
    CONFIG.appId &&
    CONFIG.appId.indexOf('PASTE') === -1
  );
  var REQUIRE_EMAIL_VERIFICATION = !!CONFIG.requireEmailVerification;
  // Runtime flag: true only once Firebase has actually loaded & initialised.
  // Lets the app fall back to demo mode when Firebase is configured but
  // unreachable (e.g. offline or a blocked network).
  var firebaseReady = false;
  // True when the Firebase project exists but has NO sign-in method enabled
  // in the console (Authentication never switched on). Detected at runtime so
  // the app can fall back to demo mode instead of dead-ending on a cryptic
  // "auth/configuration-not-found" error. See docs/FIREBASE-FIX.md.
  var authNotConfigured = false;

  var APP_PATH = 'dashboard.html';
  var SESSION_TTL = 12 * 3600000;   // 12 hours
  var IDLE_LOCK_MS = 5 * 60000;     // auto-lock after 5 min idle (if PIN set)
  var PIN_MAX_TRIES = 5;
  var PIN_LOCK_MS = 60000;          // 1 min lockout after too many tries

  var LS = {
    session: 'nexaflow_session',
    accounts: 'nexaflow_accounts',
    pin: 'nexaflow_pin',
    passkey: 'nexaflow_passkey',
    lastActive: 'nexaflow_last_active'
  };

  /* ============ helpers ============ */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getJSON(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function setJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function now() { return Date.now(); }
  function touch() { try { localStorage.setItem(LS.lastActive, String(now())); } catch (e) {} }
  function randomSalt() {
    var s = '';
    var chars = 'abcdef0123456789';
    for (var i = 0; i < 16; i++) { s += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return s;
  }

  /* ============ SHA-256 (sync, well-known compact impl) ============ */
  function sha256(ascii) {
    function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
    var mathPow = Math.pow, maxWord = mathPow(2, 32), result = '';
    var words = [], asciiBitLength = ascii.length * 8;
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k.length;
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (var i = 0; i < 313; i += candidate) { isComposite[i] = candidate; }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) { ascii += '\x00'; }
    for (var i = 0; i < ascii.length; i++) {
      var j = ascii.charCodeAt(i);
      if (j >> 8) { return; }
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);
    for (var j = 0; j < words.length;) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (var i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (var i = 0; i < 8; i++) { hash[i] = (hash[i] + oldHash[i]) | 0; }
    }
    for (var i = 0; i < 8; i++) {
      for (var j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  /* ============ session ============ */
  function getSession() {
    var s = getJSON(LS.session, null);
    if (s && s.expires && s.expires > now()) { return s; }
    try { localStorage.removeItem(LS.session); } catch (e) {}
    return null;
  }
  function createSession(user) {
    setJSON(LS.session, { user: user, created: now(), expires: now() + SESSION_TTL });
    touch();
  }

  /* ============ Firebase ============ */
  function loadFirebase(done, fail) {
    /* Once we know the project has no sign-in method enabled, keep saying so.
       Without this, a second call would see the SDK already loaded, skip the
       probe, and wrongly flip the app back to "Firebase connected". */
    if (authNotConfigured) { firebaseReady = false; fail(); return; }
    if (window.firebase && window.firebase.auth) { firebaseReady = true; done(); return; }
    // 6s safety timeout: if the SDK can't load (offline, blocked network),
    // fall back to demo mode instead of hanging.
    var settled = false;
    var timer = setTimeout(function () {
      if (!settled) { settled = true; firebaseReady = false; fail(); }
    }, 6000);
    function onDone() {
      if (settled) { return; }
      settled = true; clearTimeout(timer);
      firebaseReady = true; done();
    }
    function onFail() {
      if (settled) { return; }
      settled = true; clearTimeout(timer);
      firebaseReady = false; fail();
    }
    var s = document.createElement('script');
    s.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
    s.onload = function () {
      var s2 = document.createElement('script');
      s2.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
      s2.onload = function () {
        try {
          if (window.firebase.apps && !window.firebase.apps.length) {
            window.firebase.initializeApp(CONFIG);
          }
        } catch (e) { onFail(); return; }
        /* Keys can be correct while Authentication itself is switched off.
           Verify before claiming "connected", so the UI never lies and the
           app can fall back to demo mode instead of failing on sign-up. */
        probeAuthConfigured(function (configured) {
          if (configured === false) { authNotConfigured = true; onFail(); }
          else { onDone(); }
        });
      };
      s2.onerror = onFail;
      document.body.appendChild(s2);
    };
    s.onerror = onFail;
    document.body.appendChild(s);
  }

  /* Firebase Auth errors that mean "this project has no sign-in method
     enabled yet" (or it was switched off). Both are console-side, not
     connection-side — so demo mode is the correct fallback. */
  function isAuthNotConfiguredError(err) {
    var code = (err && err.code) ? String(err.code) : '';
    var msg = (err && err.message) ? String(err.message) : '';
    return code === 'auth/configuration-not-found' ||
           code === 'auth/operation-not-allowed' ||
           msg.indexOf('CONFIGURATION_NOT_FOUND') > -1 ||
           msg.indexOf('configuration-not-found') > -1;
  }

  /* Translate Firebase error codes into plain, actionable language. */
  function friendlyAuthError(err) {
    var code = (err && err.code) ? String(err.code) : '';
    if (isAuthNotConfiguredError(err)) {
      return 'Sign-in is not set up on this site yet — please use demo mode for now.';
    }
    var map = {
      'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
      'auth/invalid-email': 'That email address does not look right.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/user-not-found': 'No account found for this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
      'auth/network-request-failed': 'Network problem — check your connection and retry.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled. Try again.',
      'auth/popup-blocked': 'Popup was blocked — allow popups and try again.',
      'auth/requires-recent-login': 'For security, please sign in again.',
      'auth/user-disabled': 'This account has been disabled.'
    };
    return map[code] || ((err && err.message) || 'Something went wrong. Please try again.');
  }

  /* Ask Firebase whether Email/Password sign-in is actually switched on.
     Returns true (configured), false (definitely NOT configured), or null
     (could not tell — assume configured so we never break real sign-in). */
  function probeAuthConfigured(cb) {
    try {
      var auth = window.firebase.auth();
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) { settled = true; cb(null); }
      }, 3000);
      auth.fetchSignInMethodsForEmail('nexaflow-auth-probe@example.com')
        .then(function () {
          if (settled) { return; }
          settled = true; clearTimeout(timer); cb(true);
        })
        .catch(function (err) {
          if (settled) { return; }
          settled = true; clearTimeout(timer);
          cb(isAuthNotConfiguredError(err) ? false : null);
        });
    } catch (e) { cb(null); }
  }

  /* ============ demo (local) accounts ============ */
  function demoAccounts() { return getJSON(LS.accounts, []); }
  function demoRegister(name, email, password) {
    var accts = demoAccounts();
    var key = email.toLowerCase();
    for (var i = 0; i < accts.length; i++) { if (accts[i].key === key) { return { error: 'An account with this email already exists.' }; } }
    var salt = randomSalt();
    accts.push({ key: key, name: name, email: email, salt: salt, hash: sha256(salt + password) });
    setJSON(LS.accounts, accts);
    return { user: { name: name, email: email, method: 'email' } };
  }
  function demoLogin(email, password) {
    var accts = demoAccounts();
    var key = email.toLowerCase();
    for (var i = 0; i < accts.length; i++) {
      if (accts[i].key === key) {
        if (sha256(accts[i].salt + password) === accts[i].hash) {
          return { user: { name: accts[i].name, email: accts[i].email, method: 'email' } };
        }
        return { error: 'Incorrect password. Please try again.' };
      }
    }
    return { error: 'No account found for this email. Create one first.' };
  }

  /* ============ public: email sign up / in ============ */
  function emailSignUp(name, email, password, cb) {
    if (!FIREBASE_ENABLED) { cb(null, demoRegister(name, email, password)); return; }
    loadFirebase(function () {
      var auth = window.firebase.auth();
      auth.createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
          if (cred.user && name) { cred.user.updateProfile({ displayName: name }); }
          if (REQUIRE_EMAIL_VERIFICATION && cred.user && cred.user.sendEmailVerification) {
            cred.user.sendEmailVerification().catch(function () {});
          }
          cb(null, { user: { name: name || email, email: email, method: 'email', verifySent: REQUIRE_EMAIL_VERIFICATION } });
        })
        .catch(function (err) {
          if (isAuthNotConfiguredError(err)) {
            authNotConfigured = true; firebaseReady = false;
            cb(null, demoRegister(name, email, password));
            return;
          }
          cb(friendlyAuthError(err));
        });
    }, function () { firebaseReady = false; cb(null, demoRegister(name, email, password)); });
  }

  function emailSignIn(email, password, cb) {
    if (!FIREBASE_ENABLED) { cb(null, demoLogin(email, password)); return; }
    loadFirebase(function () {
      window.firebase.auth().signInWithEmailAndPassword(email, password)
        .then(function (cred) {
          cb(null, { user: { name: (cred.user && cred.user.displayName) || email, email: email, method: 'email' } });
        })
        .catch(function (err) {
          if (isAuthNotConfiguredError(err)) {
            authNotConfigured = true; firebaseReady = false;
            cb(null, demoLogin(email, password));
            return;
          }
          cb(friendlyAuthError(err));
        });
    }, function () { firebaseReady = false; cb(null, demoLogin(email, password)); });
  }

  function googleSignIn(cb) {
    if (!FIREBASE_ENABLED) { cb('Google sign-in needs Firebase. See security.md to connect it.'); return; }
    loadFirebase(function () {
      var provider = new window.firebase.auth.GoogleAuthProvider();
      window.firebase.auth().signInWithPopup(provider)
        .then(function (cred) {
          var u = cred.user;
          cb(null, { user: { name: (u && u.displayName) || 'Google user', email: (u && u.email) || '', method: 'google' } });
        })
        .catch(function (err) {
          if (isAuthNotConfiguredError(err)) {
            authNotConfigured = true; firebaseReady = false;
            cb('Google sign-in is not enabled on this site yet. Use email & password to continue.');
            return;
          }
          cb(friendlyAuthError(err));
        });
    }, function () { firebaseReady = false; cb('Google sign-in needs a live connection — use email & password to continue in demo mode.'); });
  }

  /* ---- forgot password UI ---- */
  var forgotLink = $('forgotLink');
  var resetPanel = $('resetPanel');
  var resetSubmit = $('resetSubmit');
  if (forgotLink && resetPanel) {
    forgotLink.addEventListener('click', function () {
      resetPanel.style.display = resetPanel.style.display === 'none' ? 'block' : 'none';
    });
  }
  if (resetSubmit) {
    resetSubmit.addEventListener('click', function () {
      var em = $('resetEmail').value.replace(/^\s+|\s+$/g, '');
      if (!em) { setFormMsg('Enter your account email first.', true); return; }
      setBusy(true, 'resetSubmit');
      sendResetEmail(em, function (err) {
        setBusy(false, 'resetSubmit');
        if (err) { setFormMsg(err, true); }
        else {
          setFormMsg('Reset link sent — check your inbox. 📧', false);
          resetPanel.style.display = 'none';
        }
      });
    });
  }

  /* ---- forgot password (Firebase) ---- */
  function sendResetEmail(email, cb) {
    if (!FIREBASE_ENABLED) {
      cb('Password reset needs Firebase. See firebase-setup.md to connect it.');
      return;
    }
    loadFirebase(function () {
      window.firebase.auth().sendPasswordResetEmail(email)
        .then(function () { cb(null, true); })
        .catch(function (err) {
          if (isAuthNotConfiguredError(err)) {
            authNotConfigured = true; firebaseReady = false;
            cb('Password reset is not enabled on this site yet. In demo mode your password is stored in this browser — sign in with it directly.');
            return;
          }
          cb(friendlyAuthError(err));
        });
    }, function () { cb('Firebase could not load. Check your connection.'); });
  }

  /* ============ PIN ============ */
  function getPinRec() { return getJSON(LS.pin, null); }
  function hasPIN() { return !!getPinRec(); }
  function pinRequiresOnOpen() { var r = getPinRec(); return !!(r && r.requireOnOpen); }
  function setPIN(pin, requireOnOpen) {
    var salt = randomSalt();
    setJSON(LS.pin, { salt: salt, hash: sha256(salt + pin), attempts: 0, lockedUntil: 0, requireOnOpen: !!requireOnOpen, setAt: now() });
    return true;
  }
  function removePIN() { try { localStorage.removeItem(LS.pin); } catch (e) {} }
  function verifyPIN(pin) {
    var rec = getPinRec();
    if (!rec) { return 'not-set'; }
    if (rec.lockedUntil && rec.lockedUntil > now()) { return 'locked'; }
    if (sha256(rec.salt + pin) === rec.hash) {
      rec.attempts = 0; setJSON(LS.pin, rec); return 'ok';
    }
    rec.attempts = (rec.attempts || 0) + 1;
    if (rec.attempts >= PIN_MAX_TRIES) { rec.lockedUntil = now() + PIN_LOCK_MS; rec.attempts = 0; }
    setJSON(LS.pin, rec);
    return rec.lockedUntil ? 'locked' : 'wrong';
  }
  function pinLockRemaining() {
    var r = getPinRec();
    return r && r.lockedUntil ? Math.max(0, r.lockedUntil - now()) : 0;
  }

  /* ============ fingerprint (WebAuthn passkey) ============ */
  function b64encode(buf) {
    var bytes = new Uint8Array(buf), bin = '';
    for (var i = 0; i < bytes.length; i++) { bin += String.fromCharCode(bytes[i]); }
    return btoa(bin);
  }
  function b64decode(str) {
    var bin = atob(str), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
    return bytes.buffer;
  }
  function hasPasskey() { return !!getJSON(LS.passkey, null); }

  function registerPasskey(userName, cb) {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      cb('Fingerprint/Face ID is not supported in this browser.');
      return;
    }
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      cb('Fingerprint requires HTTPS. It will work on your deployed site.');
      return;
    }
    var challenge = new Uint8Array(32);
    (window.crypto || window.msCrypto).getRandomValues(challenge);
    var userId = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(userId);
    var rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
    var opts = {
      publicKey: {
        challenge: challenge,
        rp: { name: 'NexaFlow AI', id: rpId },
        user: { id: userId, name: userName || 'nexaflow-user', displayName: userName || 'NexaFlow user' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        timeout: 60000,
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        attestation: 'none'
      }
    };
    navigator.credentials.create(opts).then(function (cred) {
      var alg = -7;
      if (cred.response.getPublicKeyAlgorithm) { alg = cred.response.getPublicKeyAlgorithm(); }
      setJSON(LS.passkey, {
        id: b64encode(cred.rawId),
        publicKey: b64encode(cred.response.getPublicKey()),
        alg: alg,
        userName: userName || 'NexaFlow user'
      });
      cb(null, true);
    }).catch(function () { cb('Fingerprint setup was cancelled or failed. Try again.'); });
  }

  function rawToDer(raw) {
    function enc(bytes, s, len) {
      var e = s + len;
      while (s < e && bytes[s] === 0) { s++; }
      if (s >= e) { return new Uint8Array([2, 1, 0]); }
      var pad = (bytes[s] & 0x80) ? 1 : 0;
      var out = new Uint8Array(2 + (e - s) + pad);
      out[0] = 2; out[1] = (e - s) + pad;
      if (pad) { out[2] = 0; }
      out.set(bytes.subarray(s, e), 2 + pad);
      return out;
    }
    var r = enc(raw, 0, 32), s = enc(raw, 32, 32);
    var seq = new Uint8Array(r.length + s.length + 2);
    seq[0] = 0x30; seq[1] = r.length + s.length;
    seq.set(r, 2); seq.set(s, 2 + r.length);
    return seq;
  }

  function loginWithPasskey(cb) {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      cb('Fingerprint/Face ID is not supported in this browser.');
      return;
    }
    var stored = getJSON(LS.passkey, null);
    if (!stored) { cb('No fingerprint enrolled on this device yet.'); return; }
    var challenge = new Uint8Array(32);
    (window.crypto || window.msCrypto).getRandomValues(challenge);
    var opts = {
      publicKey: {
        challenge: challenge,
        allowCredentials: [{ type: 'public-key', id: b64decode(stored.id) }],
        timeout: 60000,
        userVerification: 'required'
      }
    };
    navigator.credentials.get(opts).then(function (assertion) {
      var keyAlg = stored.alg === -7
        ? { name: 'ECDSA', namedCurve: 'P-256' }
        : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
      var sigAlg = stored.alg === -7
        ? { name: 'ECDSA', hash: { name: 'SHA-256' } }
        : { name: 'RSASSA-PKCS1-v1_5' };
      window.crypto.subtle.importKey('spki', b64decode(stored.publicKey), keyAlg, false, ['verify'])
        .then(function (key) {
          var authData = new Uint8Array(assertion.response.authenticatorData);
          var signed = new Uint8Array(authData.length + challenge.length);
          signed.set(authData, 0);
          signed.set(challenge, authData.length);
          var sig = assertion.response.signature;
          if (stored.alg === -7) { sig = rawToDer(new Uint8Array(sig)); }
          return window.crypto.subtle.verify(sigAlg, key, sig, signed);
        })
        .then(function (ok) {
          if (ok) { cb(null, true); }
          else { cb('Fingerprint verification failed. Try again.'); }
        })
        .catch(function () { cb('Fingerprint verification failed. Try again.'); });
    }).catch(function () { cb('Fingerprint login was cancelled.'); });
  }

  function removePasskey() { try { localStorage.removeItem(LS.passkey); } catch (e) {} }

  /* ============ lock overlay ============ */
  var lockEl = null, pinBuffer = '';

  function buildLock() {
    lockEl = document.createElement('div');
    lockEl.id = 'nexaLock';
    lockEl.className = 'lock-overlay';
    var keypad = '';
    for (var i = 1; i <= 9; i++) { keypad += '<button class="pk" data-d="' + i + '">' + i + '</button>'; }
    keypad += '<button class="pk pk-x" data-d="clear">⌫</button>';
    keypad += '<button class="pk" data-d="0">0</button>';
    keypad += '<button class="pk pk-x" data-d="ok">✓</button>';
    lockEl.innerHTML =
      '<div class="lock-card">' +
      '  <div class="lock-brand">⚡ NexaFlow AI</div>' +
      '  <div class="lock-title">App locked</div>' +
      '  <div class="lock-sub" id="lockSub">Enter your PIN to continue</div>' +
      '  <div class="pin-dots" id="lockDots">••••</div>' +
      '  <div class="pin-pad" id="lockPad">' + keypad + '</div>' +
      (hasPasskey() ? '<button class="btn btn-outline btn-block lock-fp" id="lockFp">🔓 Unlock with fingerprint</button>' : '') +
      '  <button class="lock-signout" id="lockSignout">Sign out</button>' +
      '</div>';
    document.body.appendChild(lockEl);
    document.body.style.overflow = 'hidden';

    var pad = lockEl.querySelector('#lockPad');
    pad.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b) { return; }
      var d = b.getAttribute('data-d');
      if (d === 'ok') { submitPin(); }
      else if (d === 'clear') { pinBuffer = pinBuffer.slice(0, -1); drawDots(); }
      else {
        pinBuffer += d;
        drawDots();
        if (pinBuffer.length >= 6) { submitPin(); }
      }
    });

    var fp = lockEl.querySelector('#lockFp');
    if (fp) {
      fp.addEventListener('click', function () {
        loginWithPasskey(function (err) {
          if (err) { setLockMsg(err, true); }
          else { unlock(); }
        });
      });
    }
    lockEl.querySelector('#lockSignout').addEventListener('click', function () {
      signOut();
      window.location.href = 'login.html';
    });
  }

  function drawDots() {
    var dots = lockEl && lockEl.querySelector('#lockDots');
    if (!dots) { return; }
    var s = '';
    for (var i = 0; i < 6; i++) { s += i < pinBuffer.length ? '●' : '○'; }
    dots.textContent = s;
  }

  function setLockMsg(msg, isErr) {
    var sub = lockEl && lockEl.querySelector('#lockSub');
    if (sub) { sub.textContent = msg; sub.style.color = isErr ? '#dc2626' : '#64748b'; }
  }

  function submitPin() {
    if (!pinBuffer.length) { return; }
    var res = verifyPIN(pinBuffer);
    pinBuffer = '';
    drawDots();
    if (res === 'ok') { unlock(); }
    else if (res === 'locked') {
      setLockMsg('Too many tries. Locked for ' + Math.ceil(pinLockRemaining() / 1000) + 's', true);
      setTimeout(function () { setLockMsg('Enter your PIN to continue', false); }, 2000);
    }
    else { setLockMsg('Wrong PIN — try again', true); }
  }

  function lock() {
    if (lockEl) { return; }
    if (!hasPIN()) { return; }
    buildLock();
  }
  function unlock() {
    if (lockEl) { lockEl.parentNode.removeChild(lockEl); lockEl = null; }
    pinBuffer = '';
    document.body.style.overflow = '';
    touch();
  }
  function isLocked() { return !!lockEl; }

  /* ============ user bar (injected on the app page) ============ */
  function injectUserBar() {
    var u = currentUser();
    if (!u || document.getElementById('nexaUserBar')) { return; }
    var bar = document.createElement('div');
    bar.id = 'nexaUserBar';
    bar.className = 'user-bar';
    bar.innerHTML =
      '<div class="user-bar-inner container">' +
      '  <span class="ub-avatar">' + esc((u.name || 'U').charAt(0).toUpperCase()) + '</span>' +
      '  <span class="ub-name">' + esc(u.name || u.email) + '</span>' +
      '  <span class="ub-method">' + (u.method === 'google' ? 'Google' : 'email') + ' \u00b7 ' + (demoMode() ? 'demo' : 'Firebase') + '</span>' +
      '  <span class="ub-actions">' +
      '    <a class="btn btn-outline" href="feedback.html" target="_blank" rel="noopener">\u2605 Feedback</a>' +
      (hasPIN() ? '    <button class="btn btn-outline" id="ubLock" type="button">🔒 Lock</button>' : '') +
      '    <button class="btn btn-primary" id="ubSignout" type="button">Sign out</button>' +
      '  </span>' +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);
    var l = document.getElementById('ubLock');
    if (l) { l.addEventListener('click', lock); }
    document.getElementById('ubSignout').addEventListener('click', function () {
      signOut();
      window.location.href = 'login.html';
    });
  }

  /* ============ inactivity auto-lock ============ */
  function startIdleWatch() {
    var evs = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    for (var i = 0; i < evs.length; i++) {
      window.addEventListener(evs[i], touch, true);
    }
    setInterval(function () {
      if (!isAuthed() || isLocked() || !hasPIN()) { return; }
      var last = parseInt(localStorage.getItem(LS.lastActive) || '0', 10);
      if (now() - last > IDLE_LOCK_MS) { lock(); }
    }, 10000);
  }

  /* ============ public API ============ */
  function demoMode() { return !firebaseReady; }
  function isAuthed() { return !!getSession(); }
  function currentUser() { var s = getSession(); return s ? s.user : null; }
  function signOut() {
    try { localStorage.removeItem(LS.session); } catch (e) {}
    if (FIREBASE_ENABLED && window.firebase && window.firebase.auth) {
      try { window.firebase.auth().signOut(); } catch (e) {}
    }
  }

  function finishLogin(user) {
    createSession(user);
    var r = getRedirect();
    window.location.href = r;
  }
  function getRedirect() {
    var m = /[?&]r=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : APP_PATH;
  }

  /* ============ page initializers ============ */
  function pageName() {
    var p = window.location.pathname.split('/').pop();
    return p || APP_PATH;
  }

  /* Wait for Firebase's persisted session to settle, then report the user
     (avoids a false "signed out" redirect while the session loads). */
  function whenFirebaseUser(cb) {
    var auth = window.firebase.auth();
    var called = false;
    function done(u) { if (!called) { called = true; cb(u); } }
    auth.onAuthStateChanged(function (user) {
      if (user) { done(user); return; }
      setTimeout(function () {
        if (!auth.currentUser) { done(null); }
      }, 900);
    });
  }

  /* Everything that must happen once a user is signed in, whichever mode
     (Firebase or demo) produced the session. */
  function enterApp() {
    injectUserBar();
    startIdleWatch();
    if (pinRequiresOnOpen()) { lock(); }
  }

  /* Redirect to login if there's no session (sync demo OR async Firebase). */
  function guardApp() {
    if (FIREBASE_ENABLED) {
      loadFirebase(function () {
        whenFirebaseUser(function (user) {
          if (!user && !isAuthed()) {
            window.location.replace('login.html?r=' + encodeURIComponent(pageName()));
          }
        });
      }, function () {
        if (!isAuthed()) { window.location.replace('login.html?r=' + encodeURIComponent(pageName())); }
      });
    } else if (!isAuthed()) {
      window.location.replace('login.html?r=' + encodeURIComponent(pageName()));
    }
  }


  function initAppPage() {
    if (FIREBASE_ENABLED) {
      loadFirebase(function () {
        whenFirebaseUser(function (user) {
          if (!user && !isAuthed()) {
            window.location.replace('login.html?r=' + encodeURIComponent(pageName()));
            return;
          }
          var method = 'email';
          if (user && user.providerData && user.providerData[0]) {
            method = String(user.providerData[0].providerId)
              .replace('google.com', 'google').replace('password', 'email');
          }
          if (user) {
            createSession({ name: user.displayName || user.email || 'User', email: user.email || '', method: method });
          }
          enterApp();
        });
      }, function () {
        /* Firebase configured but unusable (offline, or no sign-in method
           enabled). Fall back to the local session — the user must still get
           the user bar, idle lock and PIN, exactly like demo mode. */
        if (!isAuthed()) { window.location.replace('login.html?r=' + encodeURIComponent(pageName())); return; }
        enterApp();
      });
      return;
    }
    if (!isAuthed()) {
      window.location.replace('login.html?r=' + encodeURIComponent(pageName()));
      return;
    }
    enterApp();
  }

  function status() {
    return {
      firebase: firebaseReady,
      demo: !firebaseReady,
      authNotConfigured: authNotConfigured,
      configured: FIREBASE_ENABLED,
      verifyEmail: REQUIRE_EMAIL_VERIFICATION
    };
  }

  function initLoginPage() {
    if (isAuthed() && !pinRequiresOnOpen() && !hasPIN()) {
      // already signed in — offer quick entry
    }
    wireLoginUI();
  }

  /* ============ login page wiring ============ */
  function wireLoginUI() {
    var tabs = document.querySelectorAll('.auth-tab');
    var signinPanel = $('signinPanel');
    var signupPanel = $('signupPanel');
    function show(which) {
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === which);
      }
      signinPanel.style.display = which === 'signin' ? 'block' : 'none';
      signupPanel.style.display = which === 'signup' ? 'block' : 'none';
    }
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function () { show(this.getAttribute('data-tab')); });
    }

    // signed-in panel (shown when a session already exists)
    var sessionPanel = $('signedInPanel');
    var siUser = currentUser();
    if (sessionPanel && siUser) {
      sessionPanel.style.display = 'block';
      var siName = $('signedInName');
      if (siName) { siName.textContent = siUser.name || siUser.email; }
      var continueBtn = $('continueBtn');
      if (continueBtn) { continueBtn.addEventListener('click', function () { window.location.href = APP_PATH; }); }
      var signOutBtn = $('signedOutBtn');
      if (signOutBtn) {
        signOutBtn.addEventListener('click', function () {
          signOut();
          window.location.reload();
        });
      }
    }

    // connection status pill + demo banner
    var pill = $('authStatus');
    if (pill) { pill.style.display = 'block'; }
    if (FIREBASE_ENABLED) {
      if (pill) { pill.textContent = 'Connecting to Firebase...'; pill.className = 'auth-status warn'; }
      loadFirebase(function () {
        if (pill) { pill.textContent = 'Firebase connected - real accounts active'; pill.className = 'auth-status ok'; }
      }, function () {
        var banner = $('demoBanner');
        if (banner) { banner.style.display = 'block'; }
        if (pill) {
          pill.className = 'auth-status warn';
          if (authNotConfigured) {
            pill.textContent = 'Firebase sign-in is not switched on yet - using demo mode (accounts stay in this browser).';
            /* One tap straight to the exact console page, so the owner does
               not have to go looking for it. Built with DOM APIs (no innerHTML)
               and the project id is encoded, so nothing here is injectable. */
            var consoleLink = document.createElement('a');
            consoleLink.href = 'https://console.firebase.google.com/project/' +
              encodeURIComponent(CONFIG.projectId || '') + '/authentication/providers';
            consoleLink.target = '_blank';
            consoleLink.rel = 'noopener';
            consoleLink.style.cssText = 'margin-left:6px; font-weight:700; text-decoration:underline; color:#b45309;';
            consoleLink.textContent = 'Enable sign-in in Firebase \u2192';
            pill.appendChild(consoleLink);
          } else {
            pill.textContent = 'Could not reach Firebase - switching to demo mode.';
          }
        }
      });
    } else {
      if (pill) { pill.textContent = 'Demo mode - accounts stored in this browser.'; pill.className = 'auth-status warn'; }
      var banner = $('demoBanner');
      if (banner) { banner.style.display = 'block'; }
    }

    // show/hide password
    var toggles = document.querySelectorAll('.pw-toggle');
    for (var q = 0; q < toggles.length; q++) {
      toggles[q].addEventListener('click', function () {
        var inp = document.getElementById(this.getAttribute('data-for'));
        if (inp.type === 'password') { inp.type = 'text'; this.textContent = 'Hide'; }
        else { inp.type = 'password'; this.textContent = 'Show'; }
      });
    }

    // strength meter
    var pw = $('suPassword');
    if (pw) {
      pw.addEventListener('input', function () {
        var s = 0, v = pw.value;
        if (v.length >= 8) { s++; }
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) { s++; }
        if (/\d/.test(v)) { s++; }
        if (/[^A-Za-z0-9]/.test(v)) { s++; }
        var bar = $('strengthBar'), label = $('strengthLabel');
        if (bar && label) {
          bar.className = 'strength-bar s' + s;
          label.textContent = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][Math.min(s, 4)];
        }
      });
    }

    // email sign in
    var siForm = $('signinForm');
    if (siForm) {
      siForm.addEventListener('submit', function (e) {
        e.preventDefault();
        setFormMsg('', false);
        var email = $('siEmail').value.replace(/^\s+|\s+$/g, '');
        var pass = $('siPassword').value;
        if (!email || !pass) { setFormMsg('Enter your email and password.', true); return; }
        setBusy(true, 'siSubmit');
        emailSignIn(email, pass, function (err, res) {
          setBusy(false, 'siSubmit');
          if (err) { setFormMsg(err, true); }
          else if (res.error) { setFormMsg(res.error, true); }
          else { finishLogin(res.user); }
        });
      });
    }

    // email sign up
    var suForm = $('signupForm');
    if (suForm) {
      suForm.addEventListener('submit', function (e) {
        e.preventDefault();
        setFormMsg('', false);
        var name = $('suName').value.replace(/^\s+|\s+$/g, '');
        var email = $('suEmail').value.replace(/^\s+|\s+$/g, '');
        var pass = $('suPassword').value;
        var confirm = $('suConfirm').value;
        if (!name) { setFormMsg('Enter your name.', true); return; }
        if (!email) { setFormMsg('Enter your email.', true); return; }
        if (pass.length < 6) { setFormMsg('Password must be at least 6 characters.', true); return; }
        if (pass !== confirm) { setFormMsg('Passwords do not match.', true); return; }
        setBusy(true, 'suSubmit');
        emailSignUp(name, email, pass, function (err, res) {
          setBusy(false, 'suSubmit');
          if (err) { setFormMsg(err, true); }
          else if (res.error) { setFormMsg(res.error, true); }
          else { finishLogin(res.user); }
        });
      });
    }

    // google
    var gBtn = $('googleBtn');
    if (gBtn) {
      gBtn.addEventListener('click', function () {
        setFormMsg('', false);
        setBusy(true, 'googleBtn');
        googleSignIn(function (err, res) {
          setBusy(false, 'googleBtn');
          if (err) { setFormMsg(err, true); }
          else { finishLogin(res.user); }
        });
      });
    }

    // quick unlock: fingerprint
    var fpBtn = $('quickFp');
    if (fpBtn) {
      fpBtn.style.display = hasPasskey() ? 'inline-flex' : 'none';
      fpBtn.addEventListener('click', function () {
        setFormMsg('', false);
        loginWithPasskey(function (err) {
          if (err) { setFormMsg(err, true); }
          else {
            var u = currentUser();
            if (u) { finishLogin(u); }
            else {
              // passkey ok but no session: create a passkey session
              var pk = getJSON(LS.passkey, null);
              finishLogin({ name: (pk && pk.userName) || 'Passkey user', email: 'biometric', method: 'passkey' });
            }
          }
        });
      });
    }

    // quick unlock: PIN
    var pinBtn = $('quickPin');
    var pinPanel = $('pinPanel');
    if (pinBtn && pinPanel) {
      pinBtn.style.display = hasPIN() ? 'inline-flex' : 'none';
      pinBtn.addEventListener('click', function () {
        pinPanel.style.display = pinPanel.style.display === 'none' ? 'block' : 'none';
        pinBuffer = '';
        drawPinDots();
      });
      pinPanel.querySelector('.pin-pad').addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('button') : null;
        if (!b) { return; }
        var d = b.getAttribute('data-d');
        if (d === 'ok') { submitQuickPin(); }
        else if (d === 'clear') { pinBuffer = pinBuffer.slice(0, -1); drawPinDots(); }
        else { pinBuffer += d; drawPinDots(); if (pinBuffer.length >= 6) { submitQuickPin(); } }
      });
    }

    // security settings
    var setPinBtn = $('setPinBtn');
    var setFpBtn = $('setFpBtn');
    var removePinBtn = $('removePinBtn');
    var removeFpBtn = $('removeFpBtn');
    var pinSetup = $('pinSetup');

    if (setPinBtn && pinSetup) {
      setPinBtn.addEventListener('click', function () {
        pinSetup.style.display = pinSetup.style.display === 'none' ? 'block' : 'none';
      });
      $('savePinBtn').addEventListener('click', function () {
        var p1 = $('newPin').value, p2 = $('confirmPin').value;
        if (!/^\d{4,6}$/.test(p1)) { setFormMsg('PIN must be 4–6 digits.', true); return; }
        if (p1 !== p2) { setFormMsg('PINs do not match.', true); return; }
        setPIN(p1, $('requireOnOpen').checked);
        setFormMsg('PIN saved ✓ Use it to unlock the app.', false);
        $('newPin').value = ''; $('confirmPin').value = '';
        pinSetup.style.display = 'none';
        refreshQuickAccess();
      });
    }
    if (setFpBtn) {
      setFpBtn.addEventListener('click', function () {
        var u = currentUser();
        registerPasskey(u ? u.name : 'NexaFlow user', function (err) {
          if (err) { setFormMsg(err, true); }
          else { setFormMsg('Fingerprint enrolled ✓ You can now unlock with it.', false); refreshQuickAccess(); }
        });
      });
    }
    if (removePinBtn) {
      removePinBtn.addEventListener('click', function () { removePIN(); refreshQuickAccess(); });
    }
    if (removeFpBtn) {
      removeFpBtn.addEventListener('click', function () { removePasskey(); refreshQuickAccess(); });
    }

    refreshQuickAccess();
  }

  function drawPinDots() {
    var dots = $('pinDots');
    if (!dots) { return; }
    var s = '';
    for (var i = 0; i < 6; i++) { s += i < pinBuffer.length ? '●' : '○'; }
    dots.textContent = s;
  }
  function submitQuickPin() {
    if (!pinBuffer.length) { return; }
    var res = verifyPIN(pinBuffer);
    pinBuffer = '';
    drawPinDots();
    if (res === 'ok') {
      var u = currentUser();
      finishLogin(u || { name: 'PIN user', email: 'pin', method: 'pin' });
    } else if (res === 'locked') {
      setFormMsg('Too many tries. Locked for ' + Math.ceil(pinLockRemaining() / 1000) + 's', true);
    } else {
      setFormMsg('Wrong PIN — try again', true);
    }
  }

  function refreshQuickAccess() {
    var fpBtn = $('quickFp'), pinBtn = $('quickPin');
    var hasFp = hasPasskey(), hasPin = hasPIN();
    if (fpBtn) { fpBtn.style.display = hasFp ? 'inline-flex' : 'none'; }
    if (pinBtn) { pinBtn.style.display = hasPin ? 'inline-flex' : 'none'; }
    var rs = document.getElementById('secStatus');
    if (rs) {
      rs.textContent = (hasPin ? 'PIN: set ✓' : 'PIN: not set') + '   ·   ' + (hasFp ? 'Fingerprint: enrolled ✓' : 'Fingerprint: not enrolled');
    }
  }

  function setFormMsg(msg, isErr) {
    var el = $('formMsg');
    if (!el) { return; }
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
    el.className = 'form-msg ' + (isErr ? 'err' : 'ok');
  }
  function setBusy(busy, id) {
    var btn = $(id);
    if (!btn) { return; }
    if (busy) { btn.setAttribute('data-label', btn.textContent); btn.textContent = 'Please wait…'; btn.disabled = true; }
    else { btn.textContent = btn.getAttribute('data-label') || btn.textContent; btn.disabled = false; }
  }

  /* ============ expose ============ */
  window.NexaAuth = {
    isAuthed: isAuthed,
    currentUser: currentUser,
    signOut: signOut,
    hasPIN: hasPIN,
    setPIN: setPIN,
    verifyPIN: verifyPIN,
    removePIN: removePIN,
    hasPasskey: hasPasskey,
    registerPasskey: registerPasskey,
    loginWithPasskey: loginWithPasskey,
    removePasskey: removePasskey,
    lock: lock,
    unlock: unlock,
    isLocked: isLocked,
    initAppPage: initAppPage,
    guardApp: guardApp,
    demoMode: demoMode,
    initLoginPage: initLoginPage,
    initSignupPage: initLoginPage,
    sendResetEmail: sendResetEmail,
    status: status,
    sha256: sha256
  };
})();
