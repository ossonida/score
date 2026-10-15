# Settings, backup and Board Game Stats import

Bottom navigation provides Home and Settings. File import/export is under Settings → Data management. Files are parsed on the device and imported only after preview confirmation. Existing records win on duplicate IDs. Live players and scores are never replaced by import or navigation.

Supported inputs:
- Score JSON: `{format:"score-backup", version:1, records:[...]}` exported by this application.
- Board Game Stats JSON containing `games`, `players`, `plays`, gameRefId/playerRefId references, playDate/playDateYmd, playerScores and play UUIDs. Confirmed structural references: https://github.com/ctuncan/bga_bgstats/blob/master/bga_bgstats.py and https://github.com/louieddxu2/BoardGameScorePad/blob/main/src/features/bgstats/mocks/bgStatsSample.ts . No source file/user data is transmitted to these services.

Imports retain game names/BGG IDs, date, player names, numeric or absent scores, and explicit winner flags. Explicit winners override score inference. Missing scores are not converted to zero or included in score averages. Decimal/missing-score records can be viewed in history and statistics but cannot replace the integer-based live counter.

BG Stats notes, locations, photos, collections, challenges, and source account details are not imported in this version. Ignored records and invalid references are excluded with counts/reasons in preview. Original files should be retained. Each file is limited to 20 MB and 10,000 plays. A BG Stats UUID determines stable identity; absent UUIDs use a content fingerprint plus occurrence number, which preserves repeated identical plays within one file but cannot identify edited records reliably across files without UUIDs.

Score exports contain the active account's stored game records (or this browser's guest records). They exclude live counter state and authentication data. Guest imports are stored locally; use account migration in the account dialog after sign-in to copy these to an account. Signed-in imports use the existing pending-cloud-sync queue, with failures retained locally. Account changes invalidate pending previews.

Android exports use Capacitor Filesystem cache storage and the native share/save chooser; source code changes require `npm ci` and `npm run android:setup`, followed by rebuilding the APK. Installed Android applications are not automatically updated by GitHub Pages deployment. Native file sharing was synchronized/configured but not tested on an Android device in this session.

Validation: parser/deduplication/backup round-trip tests, existing scoring/record/auth/analytics tests, and Chromium checks at 390×844, 768×900, and 1280×900 for import preview/merge/dedup/export/navigation, unchanged live scores, and horizontal overflow.
