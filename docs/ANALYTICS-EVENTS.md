# 사용자 기능 분석 이벤트

## 원칙

- 이벤트는 자동 초기화·저장 상태 복원이 아니라 사용자가 시작해 완료된 동작에서만 기록한다.
- 플레이어명, 게임명, 메모, 계정·사용자 식별자, 실제 점수와 같은 입력값은 전송하지 않는다.
- 매개변수는 아래 열거형만 허용한다. 인원은 `1`, `2`, `3-4`, `5+`로 구간화한다.
- 브라우저 종료 이벤트는 만들지 않는다. 이탈은 세션 내 퍼널의 다음 이벤트 부재로 분석한다.

## 핵심 퍼널

| 이벤트 | 발생 조건 | 허용 매개변수 |
|---|---|---|
| `setup_started` | 게임 또는 무점수 기록 설정을 처음 조작 | `entry_point`: `game_setup`, `scoreless_setup` |
| `player_added` | 플레이어 추가가 저장된 직후 | `entry_point`: `manual`, `random`, `bulk`, `saved`, `game_setup`, `scoreless_setup`; `player_count` |
| `game_started` | 점수·승패·팀·순위·협력 기록 화면 시작 완료 | `mode`: `score`, `win`, `team`, `rank`, `cooperative`; `player_count` |
| `first_score_changed` | 현재 게임에서 최초 점수 변경 완료. 탭 새로고침 중복 방지 | `direction`: `increase`, `decrease`; `input_method`: `step`, `direct` |
| `score_changed` | 점수 증감 완료 | `direction`; `input_method` |
| `game_end_started` | 저장 또는 종료 흐름 진입 | `mode` |
| `game_ended` | 게임 저장 또는 저장하지 않고 종료 완료. 게임당 한 번 | `mode`; `outcome`: `saved`, `discarded` |
| `statistics_viewed` | 사용자가 통계 화면을 직접 열거나 게임별 통계로 이동 | `entry_point`: `navigation`, `game_library`, `record` |
| `history_viewed` | 사용자가 기록 화면을 직접 열음 | `entry_point`: `navigation`, `statistics` |

## 기록과 플레이어

| 이벤트 | 발생 조건 | 허용 매개변수 |
|---|---|---|
| `player_removed` | 점수판·결과판·기록에서 플레이어 삭제 완료 | `context`: `scoreboard`, `result_board`, `record` |
| `player_reordered` | 순위 또는 팀 이동 완료 | `context`: `rank`, `team` |
| `player_updated` | 플레이어 편집 완료 | `change_type`: `name`, `color`, `team` |
| `record_changed` | 저장된 기록 변경 완료 | `change_type`: `name`, `score`, `result`, `cooperative_result`, `shared_score`, `player_removed`, `identity` |
| `record_deleted` | 경기 기록 삭제 완료 | 없음 |

## 기타 기능

기타 완료 동작은 `feature_used`로 기록한다.

- `feature`: `scoreboard`, `record_mode`, `statistics`, `history`, `game_library`, `data_transfer`, `account`, `cloud_sync`, `bgg`, `install`
- `action`: `scores_reset`, `players_reset`, `mode_selected`, `result_changed`, `filter_changed`, `game_opened`, `game_added`, `search_completed`, `import_previewed`, `import_completed`, `import_cancelled`, `export_completed`, `login_completed`, `logout_completed`, `sync_completed`, `recovery_completed`, `guest_records_merged`, `guest_records_deleted`, `link_completed`, `unlink_completed`, `share_completed`, `install_accepted`

화면 열기와 기능 완료는 구분한다. 취소는 제품 흐름 분석에 필요한 가져오기 취소만 `import_cancelled`로 기록하며, 일반 모달 닫기는 기능 사용으로 세지 않는다.
