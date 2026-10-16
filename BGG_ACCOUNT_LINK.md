# BGG account linking and manual play posting

Implemented as an explicit, experimental adapter to BGG's website login and play-save endpoints, separate from the approved read-only XML API. The protocol shape was researched from public source; it is not evidence of a stable, publicly documented OAuth/write API or a guarantee of BGG authorization for every use. BGG can change it, reject Cloudflare-hosted requests, or require interactive verification. Do not bypass those restrictions. Real login/posting has not been tested with a user's BGG credentials in this environment. Never ask users to send credentials in chat.

Protocol references (facts only; no Kotlin implementation copied):
- https://github.com/ccomeaux/boardgamegeek4android/blob/33357ae7d372d42994f9847be309fda804762cb1/app/src/main/java/com/boardgamegeek/repository/AuthRepository.kt
- same revision: `auth/BggCookieJar.kt`, `io/AuthInterceptor.kt`, `mappers/PlayMapper.kt`, `io/model/PlayPostResponse.kt`

## Deployment by the account owner
The existing Worker must be updated by the Windows user whose Wrangler OAuth session has Cloudflare access. Updating GitHub Pages alone does not deploy Cloudflare code.

From PowerShell:
```powershell
cd D:\dev\score\worker
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/ossonida/score/main/scripts/setup-bgg-link.mjs" -OutFile ".\setup-bgg-link.mjs"
node .\setup-bgg-link.mjs
```

The reviewed setup script downloads a single GitHub commit snapshot of the four changed Worker files, backs up existing source, validates the bundle, checks secret **names only**, creates a separate random 256-bit `BGG_SESSION_KEY` if missing (never prints its value), preserves existing secrets, and deploys the Worker. Keep `BGG_API_TOKEN` as the approved application token. It is not the user's password. Wrangler config preserves the v1 limiter migration and adds a v2 SQLite Durable Object for sessions (Workers Free supported). No Firebase Blaze upgrade or new Firestore rules are required.

After deployment refresh Score Counter → Settings → BoardGameGeek → 상태 확인. Login fields stay disabled until the authenticated server reports that the session service is ready. The user enters their BGG credentials directly in the app. Credentials go by HTTPS to the Worker and then to BGG only for login; passwords are not written to browser storage, Firestore or Durable Object storage. The upstream authenticated cookie is encrypted with AES-256-GCM using the separate Cloudflare secret, bound to the Durable Object owner ID, and expires no later than BGG's cookie expiry (capped at seven days). No cookies/passwords are returned to the browser or logged by this code. Do not turn on request-body logging externally.

## UI and behavior
- Google login is required. The verified Firebase UID selects a private session actor; the client cannot select another actor.
- Settings: login, change account, disconnect, status refresh, and import. Existing username-only public import remains a separate fallback.
- An authenticated session cookie is included in collection/play XML reads only for that same BGG username. App API authorization is still required. Import keeps original BGG records separate from Score statistics.
- Each Score history card offers manual **BGG에 등록** / **BGG 기록 업데이트** after BGG login. No automatic posting is enabled.
- Only explicit valid BGG game IDs are posted. Unknown scores remain empty. Cooperative or unknown winners do not create invented wins; nowinstats is used when no competitive result is known. The selected self player gets the linked BGG username; other participants are names only.
- Posts are idempotent by Firebase account + BGG username + Score play ID. Confirmed updates reuse the stored BGG play ID, never a client-supplied remote ID.
- Request handling is serialized per owner. A pending marker is persisted before the upstream write. Identical confirmed submissions return the existing result. Network timeouts/unconfirmed responses retain an **unknown** marker and block blind retries to prevent duplicate plays. Those records need manual verification on BGG; automatic reconciliation/reset is not implemented in this first adapter.
- Disconnect deletes the encrypted session, retaining the upload mapping for duplicate prevention on reconnection. It disconnects this app; it does not claim to log out other BGG browsers. Deleting a Score record does not automatically delete BGG records.
- Existing collection/plays are not automatically merged into Score statistics and historical imported records are not automatically uploaded back to BGG.

## Verification performed
Unit tests cover token/owner isolation, encryption at rest, expired and disconnected sessions, malformed/oversized inputs, blocked/unconfirmed logins, score/winner mapping, concurrent duplicate suppression, explicit update IDs, and uncertain writes. A local real Workers runtime test exercises SQLite Durable Objects, WebCrypto, streaming JSON and form-post response handling using mock BGG responses. Chromium/WebKit tests cover settings/login, cleared password field, manual posting/updating, and disconnect at 320/375/768 px with mock account/server responses. These are not a real BGG credential or remote-write acceptance test.

## 계정 변경 시 전송 보호

기록 전송은 화면에서 확인한 BGG 사용자명과 서버 세션의 사용자명이 일치할 때만 허용합니다. 다른 기기에서 연결 계정을 변경했다면 `BGG_ACCOUNT_CHANGED`로 중단하며 설정에서 상태를 다시 확인해야 합니다. 클라이언트 요청은 리디렉션을 거부하고 브라우저 쿠키를 보내지 않습니다.
