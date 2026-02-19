# Release: Security & Pre-launch Hardening

Date: 2026-02-19

This release contains P0/P1 security and pre-launch hardening for TalentWharf (dashboard + extension + Supabase Edge Functions).

Changes included:

- Add rate-limiting guards to Edge Functions:
  - `supabase/functions/extension-capture/index.ts` — per-key capture rate limit (60/min)
  - `supabase/functions/match-job/index.ts` — per-user match rate limit (6/min)
  - `supabase/functions/send-email/index.ts` — per-user email send rate limit (30/min)

- Prevented detailed DB error leakage in API responses (generic errors + server logging).
- Replaced wildcard CORS with origin-aware responses in Edge Functions.
- Fixed postMessage usage in extension content scripts to use `window.location.origin`.
- Removed demo credentials from dashboard login UI.
- Added input sanitization in extension popup (`popup.js`).
- Updated `.gitignore` to exclude `.env` files.

Notes / follow-ups:
- Implement stronger API key storage/encryption in the extension (recommended).
- Add a dedicated rate-limiting store (Redis) for more accurate enforcement.
- Perform a security pen-test before public launch.

How to create the release PR:
1. Create a branch: `git checkout -b release/security-hardening-2026-02-19`
2. Commit changes and push: `git add . && git commit -m "chore: security hardening (rate limits, CORS, sanitization)" && git push --set-upstream origin release/security-hardening-2026-02-19`
3. Open PR with this file as the summary and assign reviewers (backend, security, legal).
