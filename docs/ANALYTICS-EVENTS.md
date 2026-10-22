# 사용자 기능 분석 이벤트

이벤트명·매개변수 열거형의 단일 출처는 `analytics-events.js`이고, 전송은 `app-analytics.js`의 `window.ScoreAnalytics`만 사용한다.

## 원칙

- 이벤트는 자동 초기화·저장 상태 복원이 아니라 사용자가 시작해 완료된 동작에서만 기록한다.
- 기록·설정·가져오기 이벤트는 앱 코드의 실제 완료 지점에서 `window.ScoreAnalytics?.…`로 호출한다. GA가 차단·미로드여도 호출은 조용히 무시된다.
- 점수판 이벤트는 사용자 조작으로 무장한 뒤 `scorecounter:changed` 상태 변화가 확인될 때만 기록한다. 조작 없이 일어난 변화(복원·자동 갱신)는 기록하지 않는다.
- 한 번의 사용자 액션은 이벤트 하나만 만든다. 이미 열린 탭·선택된 보기를 다시 누르면 기록하지 않는다.
- 플레이어명, 게임명, 메모, 계정·사용자 식별자, 실제 점수와 같은 입력값은 전송하지 않는다.
- 매개변수는 아래 열거형만 허용하고, 그 밖의 키·값은 버린다. 필수 매개변수가 빠진 이벤트는 전송하지 않는다. 인원은 `1`, `2`, `3-4`, `5+`로 구간화한다.
- 브라우저 종료 이벤트는 만들지 않는다. 이탈은 GA4 세션 내 퍼널의 다음 이벤트가 없는 것으로 분석한다.

## 핵심 퍼널

| 이벤트 | 발생 조건 | 허용 매개변수 |
|---|---|---|
| `setup_started` | 게임 설정 또는 무점수 기록 설정(모드·인원·팀 수)을 처음 조작. 페이지 세션당 1회 | `entry_point`: `game_setup`, `scoreless_setup` |
| `player_added` | 플레이어 추가가 반영된 직후 | `entry_point`: `manual`, `random`, `bulk`, `saved`, `game_setup`, `scoreless_setup`; `player_count` |
| `game_started` | 점수·승패·팀·순위·협력 기록 화면 시작 완료 | `mode`: `score`, `win`, `team`, `rank`, `cooperative`; `player_count` |
| `first_score_changed` | 현재 게임에서 최초 점수 변경 완료. 게임당 1회, 새로고침 후에도 중복 없음 | `direction`: `increase`, `decrease`; `input_method`: `step`, `direct` |
| `game_end_started` | 저장 화면(게임 종료 흐름)을 엶 | `mode` |
| `game_ended` | 게임 종료 확정. 게임당 1회 | `mode`; `outcome`: `saved`(기록 저장 완료), `discarded`(저장하지 않고 홈으로, 결과 입력 취소 확정) |
| `statistics_viewed` | 사용자가 통계 화면을 직접 열거나 게임별 통계로 이동 | `entry_point`: `navigation`, `game_library`, `record` |
| `history_viewed` | 사용자가 기록 화면을 직접 엶 | `entry_point`: `navigation`, `statistics` |

## 화면

| 이벤트 | 발생 조건 | 허용 매개변수 |
|---|---|---|
| `screen_viewed` | 하단 탭으로 다른 화면을 엶. 통계는 `statistics_viewed`로 기록 | `screen`: `home`, `games`, `settings` |

## 점수·기록·플레이어

| 이벤트 | 발생 조건 | 허용 매개변수 |
|---|---|---|
| `score_changed` | 점수 증감 완료 | `direction`; `input_method` |
| `player_removed` | 점수판·결과판·저장된 기록에서 플레이어 삭제 완료 | `context`: `scoreboard`, `result_board`, `record` |
| `player_reordered` | 순위 또는 팀 이동 완료 | `context`: `rank`, `team` |
| `player_updated` | 점수판 플레이어 편집 완료 | `change_type`: `name`, `color`, `team` |
| `record_changed` | 저장된 기록 수정 완료 | `change_type`: 아래 표 |
| `record_deleted` | 경기 기록 삭제 확정 완료 | 없음 |

`record_changed.change_type`은 기록 수정 필드(`records.js`의 `recordEditing.field`)로 결정한다.

| 수정 필드 | `change_type` |
|---|---|
| 플레이어 이름 `name` | `name` |
| 점수 `score` | `score` |
| 승패·순위 결과 `result` | `result` |
| 협력 성공·실패 `cooperativeResult` | `cooperative_result` |
| 협력 공동 점수 `sharedScore` | `shared_score` |
| 기록에서 플레이어 삭제 | `player_removed` (`player_removed`의 `context: record`와 함께 기록) |

## 기타 기능

기타 완료 동작은 `feature_used`로 기록한다.

| `feature` | `action` | 발생 조건 |
|---|---|---|
| `scoreboard` | `scores_reset`, `players_reset` | 점수·플레이어 초기화 확정 |
| `record_mode` | `mode_selected`, `result_changed` | 무점수 기록 모드 선택, 결과 선택·변경 |
| `statistics` | `filter_changed` | 통계 보기 탭 전환, 게임 필터 변경, 기간 프리셋 변경, 직접 기간 적용(유효한 기간일 때만) |
| `statistics` | `share_completed` | 공유 이미지 저장·전송 |
| `game_library` | `game_added`, `search_completed` | 게임 추가, 게임 검색 완료 |
| `data_transfer` | `import_previewed`, `import_cancelled`, `import_completed` | 파일 가져오기 미리보기 표시, 취소, 가져오기 완료 |
| `account` | `login_completed`, `logout_completed` | 로그인·로그아웃 완료 |
| `account` | `guest_records_merged`, `guest_records_deleted`, `recovery_completed` | 로그인 전 기록 합치기·삭제, 기기 기록 복구 완료 |
| `cloud_sync` | `sync_completed` | 수동 동기화 완료 |
| `bgg` | `link_completed`, `unlink_completed`, `import_completed`, `export_completed` | BGG 연결·해제, 공개 정보 가져오기, 플레이 내보내기 완료 |
| `settings` | `identity_changed` | 설정에서 내 닉네임·연결 닉네임 저장 |
| `install` | `install_accepted` | 홈 화면 추가 버튼 이후 설치 완료 |

화면 열기와 기능 완료는 구분한다. 모달 취소는 흐름 분석에 필요한 가져오기 취소(`import_cancelled`)와 결과 입력 취소(`game_ended discarded`)만 기록한다. 일반 모달 닫기는 기능 사용으로 세지 않는다.

## 존재하지 않는 기능

실행 취소·재실행, 앱 데이터(JSON) 내보내기 기능은 현재 앱에 없어 이벤트도 없다. 내보내기는 BGG 플레이 내보내기(`bgg`/`export_completed`)만 있다.
