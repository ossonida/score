# 작업 인수인계

> 작업 재개 시 이 파일만 먼저 읽는다. 단계가 끝날 때마다 갱신한다. 커밋하지 않는다.

## 원래 요청 (정밀수정, 커밋·푸시·배포 금지)
GA4 사용자 기능 이용 분석 구현. 원문 요약:
- 목표: 기능별 사용량 / 주요 흐름 단계별 이탈 / 플레이어 추가 후 기능·기록 변경 이용
- 실제 화면·핸들러·app-analytics.js를 좁게 검색해 기능 목록화 → 같은 작업에서 구현까지
- docs/ANALYTICS-EVENTS.md에 이벤트명·발생 조건·허용 매개변수 명세, 구현과 일치
- 퍼널: setup_started, player_added, game_started, first_score_changed(게임당 1회), game_end_started, game_ended(게임당 1회), statistics_viewed, history_viewed
- 기능: 완료 시점 기록. score_changed{direction,input_method}만. record_changed{change_type}. 플레이어 추가·삭제·순서변경 각각. 통계·기록 필터, 실행취소/재실행, 설정 변경, 가져오기·내보내기 등 실재 기능 누락 금지. 화면 열기≠기능 완료, 모달 열기·취소·확정은 필요 시 구분
- 규칙: 자동 초기화·새로고침·복원 시 미발생 / 1액션 1이벤트 / GA4 세션 순서로 분석 / 브라우저 종료 이벤트 금지 / 개인정보·자유입력 금지 / 수치는 1,2,3-4,5+ 구간 / 매개변수는 열거형만
- 구현: app-analytics.js 공통 헬퍼, 기존 GA 초기화 재사용, GA 차단돼도 오류 없음, 이벤트·매개변수 한곳 관리(analytics-events.js), 숨은 버튼/UI 우회 금지, 저장형식·로그인·동기화·게임로직 변경 금지
- 테스트: 중복, 자동복원 미발생, 퍼널 순서, record_changed.change_type. 전체 테스트 + 빌드(npm run build). 브라우저 자동화는 필요 시만
- 보고: 변경 / 검증 / 커밋·배포 각 한 줄

## 현재 상태
- 커밋 3470720: analytics-events.js(스키마·헬퍼), app-analytics.js(리스너), docs/ANALYTICS-EVENTS.md, tests/analytics.test.mjs
- 미커밋 app-analytics.js: scorecounter:changed 기반 점수판 이벤트(점수·플레이어 추가/삭제/편집·리셋·결과·순서), 설치
- 기간 분석(period-*.js 등) 미커밋 변경은 별개 작업 → 건드리지 않음

## 진행 (계획: C:\Users\e1209\.claude\plans\sunny-plotting-nebula.md)
- [x] 기능 목록화 → 누락 이벤트 식별 (실행취소/재실행·JSON 내보내기는 앱에 없음)
- [x] 누락 구현: records.js/settings.js/bgg-account.js 완료 지점에서 window.ScoreAnalytics 호출, app-analytics.js 추정 코드 정리
- [x] records.js 이중 로드 수정(settings/bgg-link/games-screen import v113→v116), index v117, sw 캐시 v117
- [x] docs/ANALYTICS-EVENTS.md 갱신
- [x] 테스트 추가: analytics.test.mjs 4개, records-ui 통합 1개(하네스에 search.analytics 주입) — 통과
- [x] 전체 테스트 245/247 + 빌드 성공. 실패 2: records-ui:86(기존), custom period 테스트(statsDetailCount — 다른 세션이 기간 분석을 동시 수정 중인 것으로 보임, 10:56 period-dashboard.js 외부 변경)
- 분석 작업 완료. 남은 것: 사용자 확인 후 커밋·배포 (지시상 금지)
- 참고: scripts/build-web.mjs(Android dist) 목록에 analytics-events.js·period-*.js 없음 → Android 범위라 미수정, 보고만

## 환경 메모
- node: `"/c/Program Files/nodejs/node.exe" --experimental-vm-modules --test tests/*.test.mjs` (Bash PATH에 node 없음)
- 기존 실패: records-ui.test.mjs:86 (HEAD에서도 실패, 본 작업 무관)
