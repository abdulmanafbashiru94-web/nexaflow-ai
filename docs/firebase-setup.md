# NexaFlow AI — Firebase Setup (make accounts REAL)

> This turns the login system from **demo mode** (browser-only) into **real,
> secure, server-verified accounts**. Takes ~10 minutes and it's free.
> You only need a Google account — **abdulmanafbashiru94@gmail.com works**.

---

## Step 1 — Create the project (2 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Sign in with your Google account
3. Click **"Create a project"** (or "Add project")
4. Project name: `nexaflow-ai` → **Continue**
5. You can disable Google Analytics (not needed) → **Create project**
6. Wait for it to finish, then click **Continue** to open the project

---

## Step 2 — Enable sign-in methods (2 min)

1. In the left menu, click **Build → Authentication** → **Get started**
2. Go to the **Sign-in method** tab
3. Click **Email/Password** → enable → **Save**
4. Click **Google** → enable → it will ask for a **support email** → choose your own email → **Save**

That's it — email/password and Google sign-in are now live for your project.

---

## Step 3 — Get your config keys (2 min)

1. Click the **gear icon ⚙️** (top left) → **Project settings**
2. Scroll to **"Your apps"** → click the **`</>` Web** icon
3. App nickname: `NexaFlow website` → **Register app**
4. Firebase shows a block of code. Copy ONLY these values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
5. Open **`js/firebase-config.js`** in your project folder and paste them:

```js
window.NEXAFLOW_FIREBASE = {
  apiKey: "AIzaSy...",                    // ← paste your apiKey
  authDomain: "nexaflow-ai.firebaseapp.com",
  projectId: "nexaflow-ai",
  storageBucket: "nexaflow-ai.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123...",
  requireEmailVerification: false
};
```

6. **Save** and **re-upload** your site (or push to Git). Done! 🎉

The login page will now show **"🔗 Firebase connected — real accounts active"** — that's your confirmation it's working.

---

## Step 4 — Add your domain (if you use a custom domain)

Firebase automatically allows `localhost` and the `<project>.web.app` domains.
If you deploy to Netlify/GitHub Pages with your own domain:

1. Firebase → **Authentication → Settings → Authorized domains**
2. Click **Add domain** → paste your domain (e.g. `nexaflowai.com`) → **Add**

---

## Step 5 — Test it works

1. Open your deployed site → **Sign in → Create account** → make a test account
2. Check Firebase → **Authentication → Users** — you'll see the new user ✅
3. Try **"Forgot password?"** — a real reset email arrives ✅
4. Try **"Continue with Google"** (works on your live site; the preview sandbox blocks the popup)

---

## Optional extras

**Require email verification**
- Set `requireEmailVerification: true` in `js/firebase-config.js`, or
- Firebase → Authentication → Settings → tick **"Email link / verification required"**

**Manage users / delete accounts**
- Firebase → Authentication → Users → click a user to disable or delete

**Team members**
- Anyone can self-register. To restrict to only your team, ask me to add an
  "allow-list" (only approved emails can sign in).

---

## Security recap

- Passwords are hashed by Firebase (bcrypt) — never stored in plain text
- Sessions use Firebase's secure tokens, not just a browser cookie
- Your Firebase **apiKey is public by design** (it identifies your project);
  it does NOT grant access to user data. User data stays protected by Firebase's
  security rules, and only the email/password + providers can authenticate.

*Stuck at any step? Message +233 54 588 6354 — or ask here and I'll help.*
