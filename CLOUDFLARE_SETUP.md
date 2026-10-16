# BGG on Cloudflare Workers Free

Keep Firebase Authentication and Firestore on the existing Spark plan. This Worker only calls BGG XML API2 and checks Firebase ID tokens; it does not receive a Firebase service-account key, query private Firestore data, or write to BGG. Cloudflare signup/login is required. No account credential is available in this execution environment, so deployment must be performed by the account owner.

## First step
Create or log into an account at https://dash.cloudflare.com/. Use the Workers Free plan. Do not enable a paid subscription for this setup. Free quotas apply and can cause requests to be rejected once exhausted; this is not unlimited hosting.

## Windows PowerShell deployment (after updating local source)

Use the updated repository, including the `worker` and `functions` directories; shared parsers are imported from `functions`, but Firebase Functions will not be deployed.

```powershell
cd D:\dev\score-main\worker
npm.cmd ci
npx.cmd wrangler login
npm.cmd run deploy
```

Wrangler opens the Cloudflare authorization page. Authorize your own account. Deployment creates `score-bgg`, its workers.dev URL, and a SQLite Durable Object namespace for request limits. SQLite Durable Objects are supported on Workers Free. The service returns 503 until its token is configured.

```powershell
npx.cmd wrangler secret put BGG_API_TOKEN
```

Paste the newly issued BGG token only into the secret prompt. Do not paste it into chat, commit it, pass it as a shell command argument, or put it in firebase-config.js. Revoke any previously exposed token at BGG before using a replacement. The old Firebase Secret Manager command is not used for this deployment.

Copy the public `https://score-bgg.<subdomain>.workers.dev` URL from deployment output. This URL is safe to share. After configuring the official Powered by BGG logo, set `bggSearchUrl` in `firebase-config.js` to that URL and deploy the frontend with a new service-worker cache version. Until these steps are complete, the current local search remains active.

## Required BGG attribution
Use the official **Powered by BGG** artwork from https://boardgamegeek.com/using_the_xml_api, with a link to BGG, in the search UI and BGG import section. Approval requires this logo. Do not substitute a text credit or a redrawn logo. Artwork has not yet been provided; keep live frontend API access disabled until it is installed.

## Safety and validation
- Firebase JWTs require RS256 signatures from Google's fixed securetoken JWK endpoint, the correct project audience/issuer, expiration, subject, issue and authentication times. Signing out/revoking a session cannot immediately revoke already-issued JWTs at this stateless gateway; Firebase ID tokens expire normally (typically within one hour).
- Explicit CORS origins are the production GitHub Pages origin and Capacitor local origins. CORS does not substitute for login verification. Native app networking still needs device verification.
- Request quotas: 30 validated requests/minute per Firebase user and 60/minute across this Worker. Durable counters are removed after inactivity. No user records, usernames, or game payloads are stored by the limiter.
- Only fixed BGG endpoints are allowed. XML size is limited to 2 MB; DTD/entity declarations and redirects are rejected; errors never return the secret or upstream response body.
- BGG queue/throttle responses return a retry instruction. Collection requests omit brief=1 so ownership status is retained. Public BGG plays stay separate from Score statistics.
- Search still depends on BGG's available names. Korean aliases in the app remain useful; the API does not guarantee every Korean game title is searchable.

Local checks: `npm.cmd test`, `npm.cmd run build` from `worker`. The build is a dry run and does not publish. No token is needed for these checks. After deployment verify Google login → game search → select/save, cover/type refresh, and public collection/play import. Existing score/cloud records must remain intact.

To disconnect, clear `bggSearchUrl` and publish the frontend. This leaves existing Firebase records untouched.
