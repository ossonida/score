# Personal game statistics

Select a game under Statistics, then choose the player name representing you. Settings → Statistics player provides the same editor. Link old nicknames using checkboxes; records are not renamed or merged. This preference is stored locally per active account/guest scope, not in cloud storage. A play containing multiple linked names is excluded from personal analysis and reported as ambiguous.

The game dashboard separates winning rules and shows personal participation, known-outcome wins/rate, score average, best score and its date, first/latest dates, a recent 30-play score chart, the last five plays, player-count results, and relative opponent comparisons. Cooperative games have no individual win rate. Score charts preserve missing values and negative scores. A five-versus-five comparison needs scores in all latest ten plays and a date boundary between the groups; imported same-day ordering is not inferred.

Opponent comparisons use explicit ranks when both exist, otherwise relative scores according to the winning rule. They are not wins; missing comparison data and duplicate opponent names are excluded from comparisons. Shared victories count as wins in win rates.

Recent plays open inline personal analysis with score rank over all personal same-game/same-rule scores, recorded/score-derived placement, prior-date average, prior-date best improvement, a winner-consistent score gap, and same-game shared-play counts. History cards offer the same analysis in an expandable section. Best/average comparisons exclude the current day because original imported same-day chronology is unavailable. Score gaps are withheld when manual winners disagree with score order.

Validation: automated analytics and existing app tests, browser interactions at phone/fold/desktop widths, profile and alias persistence, graph and match details. Changes to installed Android APKs require rebuilding; Pages updates only the website/PWA.

## Player memory update

Selected-game overview now shows total plays and highest score, with no full-period/day-count fields or duplicate all-player performance card. Counter players now remember whether their display name was automatically generated. Newly created automatic names that remain unchanged are saved as anonymous players; older untagged names cannot be reliably classified and are retained. Renaming an automatically generated player clears the flag; changing only its color does not. Live display names are preserved when a game is saved.

Each saved player may carry boolean `anonymous` and `isSelf` fields, preserved through the existing record validation/storage. A record with explicit `isSelf` fields overrides name-based identity lookup, allowing an anonymous slot to be selected as self without linking all anonymous people. Assignment is available in the finish dialog and in each saved record; changes join the normal cloud sync queue. Explicitly assigned self records also aggregate as “나” in detailed game statistics. Anonymous opponents are excluded from cross-game individual comparisons.

Settings provides the active-board self selector, manual roster saving, and up to eight recent roster combinations (also saved automatically on game finish). Rosters include names, colors, automatic-name flags and the self choice, but no scores or original runtime IDs. Restoring requires confirmation, creates fresh IDs and resets scores to zero. Roster memory and nickname preferences are local and scoped to the active account/guest. The active board’s self flag also carries an account scope to avoid reusing another account’s choice.

## Simplified interface

Game statistics now show the game summary, personal metrics, score trend, recent plays and player-count results. The opponent card and all match-analysis panels have been removed. Recent plays and the personal-best link open the record directly. Calculation details are in one collapsed section. History cards show scores and an optional “개인 기록 갱신” label at the bottom, only for a personal score exceeding the prior-date best in the same game and winning rule; initial records, ties, missing scores and cooperative games do not get a label. Restore, deletion and self assignment are grouped under Record management. Settings groups recent rosters and BGG integration in disclosures; explanatory copy and repeated titles have been shortened.

## Removed roster controls and BGG covers

The player card and all roster saving/restoring UI have been removed from Settings. Name linking remains in the selected-game player editor, and self selection remains in game finish/history. Game finish no longer writes roster memory. Previously saved roster keys are left untouched but unused. Game-level self assignment and record-name linking remain available. The game title appears once with a BGG cover when known; the separate overall play/highest metrics are shown only if no personal summary can be displayed, avoiding duplicate score summaries.

BGG cover URLs were verified from public BGG metadata for all 22 starter-catalog games. Artwork also accepts image metadata in BG Stats imports, cached separately from Firestore play documents. Only HTTPS cf.geekdo-images.com URLs are accepted. Covers appear in the selected-game header, search choices and saved-game preview; a failed image hides its reserved area. Arbitrary BGG IDs without known image metadata have no image: the full BGG API server remains unconnected, so no universal live image lookup is claimed.
