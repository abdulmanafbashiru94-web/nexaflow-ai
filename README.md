# NexaFlow AI — Project Source

Static website source for **NexaFlow AI** — an AI website + WhatsApp automation
service for small businesses (7-day delivery, packages from $250).

Live site: https://abdulmanafbashiru94-web.github.io/nexaflow-ai/

> Source captured from the live deployment on 2026-09-29 (all pages, CSS, JS,
> and fonts included). No build step required — it is a plain static site.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Marketing landing page |
| `pricing.html` | Package tiers (Essential $250 / Core $350 / Growth $400) |
| `services.html` | Services overview |
| `contact.html` | Contact / booking form |
| `ai-studio.html` | AI website generator demo (`?b=<name>&t=<type>&go=1`) |
| `business-name-generator.html` | Business name generator tool |
| `whatsapp-reply-builder.html` | WhatsApp auto-reply builder tool |
| `demo-chatbot.html` / `demo-whatsapp.html` | Product demos |
| `login.html` / `signup.html` / `dashboard.html` / `settings.html` | App area (Firebase auth) |
| `pay.html` | Payment page (`?amount=<usd>`) |
| `feedback.html` | Review/feedback form |

## Structure

```
css/    styles.css, ai.css, auth.css, demos.css, fonts/ (Montserrat, Roboto)
js/     script.js, ai-studio.js, auth.js, firebase-config.js
docs/   firebase-setup.md
```

## Run locally

Any static server works:

```bash
cd nexaflow-ai
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

Hosting: **GitHub Pages** — pushing to `main` auto-publishes the site at
`https://abdulmanafbashiru94-web.github.io/nexaflow-ai/`

```bash
git add -A && git commit -m "update" && git push
```

(Repo → Settings → Pages → Source: `main` / root. The `.nojekyll` file
disables Jekyll processing so files are served as-is.)

## Notes

- Firebase auth config lives in `js/firebase-config.js`; setup steps are in
  `docs/firebase-setup.md`.
- WhatsApp contact: https://wa.me/233545886354
- `robots.txt` on the live site disallows all crawlers.
