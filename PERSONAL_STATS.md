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
