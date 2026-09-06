---
name: deploy-site
description: Ship the pogo site to GitHub Pages and confirm it is actually live. Use when the user says to deploy, publish, push it live, or "get it up on GitHub Pages", and after any change to web/. Covers the Pages workflow, verifying against the live URL, the HTML cache window, and the Firebase console steps that are not deployable from here.
---

# Deploy to GitHub Pages

The site is served from `web/` by `.github/workflows` using `actions/upload-pages-artifact`.
Pushing to `main` is the deploy. Live at **https://jasonkidd91.github.io/pogo/**.

## Before pushing

1. Verify in a browser — the `verify-site` skill. Do not deploy on "the source looks right".
2. `node --check` every JS file you touched. There is no bundler to catch a syntax error, and
   a broken script means a blank page.
3. If a data file changed, confirm it still carries its `GENERATED` header and source URL.

## Ship it

```bash
git add -A && git commit && git push origin main
```

Then wait for the run to finish and confirm it succeeded — a green push is not a green deploy:

```bash
until [ "$(gh run list --limit 1 --json status --jq '.[0].status')" = "completed" ]; do sleep 10; done
gh run list --limit 1 --json status,conclusion,displayTitle \
  --jq '.[0] | "\(.status) \(.conclusion) — \(.displayTitle)"'
```

## Then verify against the live URL, not localhost

Re-run the browser suite with the base URL swapped to `https://jasonkidd91.github.io/pogo`.
This has caught things localhost cannot: a missing file that 404s only under the `/pogo/`
path prefix, and CDN/CORS behaviour that differs from a local origin.

## The ten-minute cache

GitHub Pages serves HTML with `cache-control: max-age=600`. For up to ten minutes after a
deploy a returning visitor can get the **previous** HTML while the new CSS and JS load beside
it. If the user reports that a just-shipped change is missing, this is the first thing to
suspect — have them hard-refresh (Cmd/Ctrl+Shift+R) — but do not stop there. Check the live
page yourself, because a real bug can hide behind a plausible cache explanation.

## What deploying does not cover

Two things live in the Firebase console and cannot be shipped from here. Say so plainly rather
than reporting an unqualified success:

- **Authorized domains.** `jasonkidd91.github.io` must be listed under Authentication →
  Settings → Authorized domains or live sign-in fails with `auth/unauthorized-domain`.
- **Security rules.** `firebase deploy --only firestore:rules` needs the Firebase CLI and an
  interactive login. The repo is **public** and the project id is in `auth.js`, so until the
  rules are deployed the tracker data is world-writable to anyone who looks. The web API key
  is a public identifier and authorises nothing — `firestore.rules` is the actual control.

## Notifying the user

When the user asks to be notified — they have used `ntfy.sh` for this:

```bash
curl -s -X POST "https://ntfy.sh/<topic>" -H "Title: <short title>" -d "<body>"
```

Keep it to what changed, the URL, and anything still waiting on them. Never put the user's
email address or any credential in it: an ntfy topic is a public URL to anyone who knows it.
