/* ============================================================
   NexaFlow AI — Firebase configuration
   ============================================================
   ✅ REAL KEYS PASTED — the project exists and the keys are valid.

   ⚠️ BUT SIGN-IN IS NOT SWITCHED ON YET, so Firebase rejects every
   sign-up/sign-in with "auth/configuration-not-found".
   Verified 2026-09-19: API key valid, project reachable, but
   Email/Password and Google are both OFF in the console.

   ➡️ 60-SECOND FIX (no code change, no redeploy):
   console.firebase.google.com/project/nexa-flow-ai-website/authentication/providers
   → Email/Password → Enable → Save   (and optionally Google → Enable)
   Full walkthrough: docs/FIREBASE-FIX.md

   Until then the app detects this automatically and runs in demo
   mode (browser-only accounts) and says so on screen.

   NOTE: this config is PUBLIC by design (it only identifies your
   project). It cannot access user data — Firebase's server-side
   security protects that. Never share a private key file instead.

   AFTER enabling sign-in, also add your domain under
   Authentication → Settings → Authorized domains (needed for the
   Google pop-up).
   ============================================================ */
window.NEXAFLOW_FIREBASE = {
  apiKey: "AIzaSyBM1kOYyGitZEDT2GIWMRJdnv-fQagx5JU",
  authDomain: "nexa-flow-ai-website.firebaseapp.com",
  projectId: "nexa-flow-ai-website",
  storageBucket: "nexa-flow-ai-website.firebasestorage.app",
  messagingSenderId: "789816351216",
  appId: "1:789816351216:web:6cbe9fa227a9b8a3d4a535",
  measurementId: "G-FT6DMWPDDY",

  // Optional: require new users to verify their email before use.
  requireEmailVerification: false
};
