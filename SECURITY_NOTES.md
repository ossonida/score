# Security hardening — 2026-10-12

Implemented:
- Backend dependencies updated and pinned through `functions/package-lock.json`; `npm audit --omit=dev` reports zero known vulnerabilities for this resolved dependency tree at review time.
- BGG backend verifies Bearer syntax and revoked/disabled Firebase sessions, rejects unexpected browser origins, limits each UID to 30 requests per minute via an Admin-only Firestore collection, and fails closed if rate-limit storage is unavailable.
- Upstream responses are bounded at 2 MB while streaming; DTD/entity declarations and redirects are rejected. No BGG credentials are exposed to the browser.
- BGG records/caches are validated before display or storage. Account changes cancel old searches/imports and token acquisition checks the expected UID.
- Score record IDs and player names are bounded, including path-component validation; Firestore validates game IDs and BGG record envelopes.

Deployment:
GitHub Pages serves frontend updates only. Functions and rules require separate authenticated Firebase deployment:

```bash
npm --prefix functions ci --ignore-scripts
npx firebase-tools deploy --only functions:bggSearch,firestore:rules --project score-1948e
```

The session has no Firebase deployment credentials or BGG token, so publishing the repository does not activate server-side changes. `_bggLimits` is denied to clients by the default Firestore rules; one rate document per UID is reused.

Limits:
This is a focused code/dependency review, not a penetration test. Zero audit findings do not mean zero vulnerabilities. Existing score statistics remain client-generated and each user's own `players` list is not fully validated element-by-element by Firestore rules; the client validates player fields. Public BGG imports do not prove ownership of a BGG username. Hosting-level headers such as frame-ancestors require a host that supports custom response headers.

Validation performed:
- 23 local tests across scoring, record UI, BGG parsing/import/account switching, request limits, bounded XML, and malformed input rejection passed.
- Firestore Emulator: 13 actual access-control and data-validation checks passed, including cross-account/anonymous rejection and client denial for the rate-limit collection. Harness: `tests/firestore-rules-check.mjs` (requires `@firebase/rules-unit-testing`, `firebase`, and a Firestore emulator at port 8180).
- Updated backend SDK imports and XML parsing smoke checks passed. Local Node runtime was 24; deployment remains configured for Node 22.
