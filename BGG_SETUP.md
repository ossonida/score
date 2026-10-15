# BGG public-data integration

The account dialog supports registering a BGG username, importing owned board games, and saving public plays separately from Score Counter score records. This is not BGG account authentication. No BGG password is collected and the app does not write records to BGG.

BGG approval, an API token, Firebase deployment access, and a project with Functions billing enabled are required for live imports. The frontend must not contain the API token.

From the repository root:

```bash
npx firebase-tools login
npx firebase-tools functions:secrets:set BGG_API_TOKEN --project score-1948e
npm --prefix functions install
npx firebase-tools deploy --only functions:bggSearch,firestore:rules --project score-1948e
```

Set `bggSearchUrl` in `firebase-config.js` to the function URL returned by deployment. The same endpoint supports search and authenticated `action=collection` / `action=plays` requests. Publish the updated configuration to GitHub Pages.

Firestore stores the username at `users/{uid}/settings/bgg`, owned games under `bggCollection`, and public plays under `bggPlays`. Rules restrict these to the signed-in Google account. Registering before deploying the new rules stores the username locally and reports that cloud saving failed.

Imports are on demand, retain BGG record IDs, replace the current imported snapshot for the registered username, and import at most 10 pages / 1,000 play records per request sequence. BGG quantity and unknown scores are preserved. They do not contribute to existing score statistics because BGG records do not reliably specify the app's scoring rule. BGG queued responses (202) and throttling (429) ask the user to retry later; they do not erase previously imported information.

## Game images and types
The same endpoint now accepts authenticated `action=details&ids=13,30549` (maximum 20 IDs).
It returns official XML API `thing?stats=1` covers, all BGG family ranks (game types), and the Cooperative Game mechanic.
The frontend refreshes saved games in batches and caches details locally for seven days. Failures keep existing covers and records. Name-only games match only exact known aliases; arbitrary names are not guessed.
Until BGG approval and server deployment are complete, only packaged BGG metadata and imported covers are available. The app deliberately does not bypass BGG API approval using a public proxy.
Manual type overrides are no longer used. Types can overlap; totals can exceed play count. Cooperative is a mechanic, shown separately from BGG game types.

## Approval received
The public, non-commercial application has been approved by BGG. Approval does not configure the token or deploy the server. Obtain the API token from the approved application at https://boardgamegeek.com/applications and store it only using Firebase Secret Manager (command above). Never paste it into chat, frontend configuration, or GitHub.

Before enabling live API access, display the official “Powered by BGG” logo in the app according to https://boardgamegeek.com/using_the_xml_api. A text credit is not a substitute for the required logo. Download the official artwork from BGG; do not redraw their logo. The official page/artwork could not be retrieved from this execution environment, so logo placement remains a prerequisite.
