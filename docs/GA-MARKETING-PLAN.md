# Score Counter GA 마케팅 측정 설계

이벤트 정의의 단일 출처는 `docs/ANALYTICS-EVENTS.md`와 `analytics-events.js`다. 이 문서는 그 위에 **마케팅 판단에 필요한 유입·활성화·재방문·확산 측정**을 얹는 설계다. 개인정보 원칙은 그대로 유지한다: 이름·게임명·점수·이메일·UID는 보내지 않는다.

## 1. 답하려는 질문

| 질문 | 판단에 쓰는 지표 | 지금 볼 수 있나 |
|---|---|---|
| 어느 채널이 **기록을 남기는 사용자**를 데려오나 | 채널·캠페인별 신규 사용자 → 첫 기록 저장 비율 | ✗ UTM 없음, 유입 100%가 direct |
| 처음 온 사람이 어디서 막히나 | 첫 방문 → 게임 시작 → 첫 점수 → 기록 저장 퍼널 | △ 점수 이벤트가 11/25에야 정상화 |
| 다시 오나, 언제 떠나나 | 첫 방문 주 기준 D1·D7·D30 재방문, 기록 저장 재발생 | △ 지표는 있으나 기준 이벤트 미설정 |
| 사용자가 다른 사람을 데려오나 | 공유 완료 수 → 공유 링크 유입 신규 사용자 | ✗ 공유 이미지·문구에 링크 없음 |
| 설치(홈 화면 추가)·로그인 사용자가 더 남나 | 사용자 속성별 재방문율 | ✗ 사용자 속성 없음 |
| Pro를 낼 사람이 얼마나 되나 | Pro 시트 노출 → 출시 알림 신청, 베타 기능 사용 | △ 이벤트는 있으나 보고서 미구성 |

## 2. 현재 한계

1. **속성 공용**: BGR_HOME 속성 하나를 히든노트·BGW와 같이 쓴다. 주요 이벤트(30개)·맞춤 측정기준(이벤트 50·사용자 25)·잠재고객 한도를 나눠 쓰고, 기본 보고서마다 세그먼트를 걸어야 한다.
2. **유입 정보 없음**: 링크에 UTM이 없어 커뮤니티·QR·지인 공유가 모두 `(direct)`로 섞인다.
3. **확산 경로 끊김**: 결산·게임 공유 이미지와 공유 문구에 앱 주소가 없다. 공유가 일어나도 유입으로 이어지는지 알 수 없다.
4. **매개변수가 보고서에 안 보임**: `mode`, `outcome`, `entry_point` 등을 맞춤 측정기준으로 등록하지 않아 GA 화면에서 나눠 볼 수 없다.
5. **주요 이벤트(전환) 미설정**: "기록 저장"이 전환으로 잡혀 있지 않아 채널별 성과 비교가 안 된다.
6. **과거 데이터 오염**: 11/25 이전은 localhost·헤드리스 접속이 섞였고 점수 이벤트가 누락됐다. **비교 기준은 2026-11-26 이후 데이터**로 잡는다.

## 3. 속성 구성

**권장: Score Counter 전용 GA4 속성(새 측정 ID)을 만든다.**

- 이유: 위 한도와 주요 이벤트·잠재고객을 Score Counter만 쓰고, 모든 기본 보고서가 세그먼트 없이 바로 Score Counter 데이터가 된다.
- 비용: 과거 데이터는 기존 속성에 남는다(이미 오염돼 있어 손실이 작다). `app-analytics.js`의 `measurementId` 한 줄 교체.
- 기존 속성은 그대로 두고 `content_group:'score'`로 사이트 비교만 계속한다(원하면 두 속성에 동시 전송 가능: `gtag('config', 새ID)` 추가).

새 속성 설정:

| 항목 | 값 |
|---|---|
| 데이터 보관 | 14개월 |
| 보고 시간대·통화 | 대한민국, KRW |
| Google 신호 | 끔(로그인 사용자 교차 기기 불필요, 임계값 적용으로 소수 데이터가 숨겨짐) |
| 보고용 식별 기준 | 기기 기반(소수 사용자 데이터가 임계값에 가려지지 않게) |
| 향상된 측정 | 페이지 조회·스크롤만. 이탈 클릭·사이트 검색·양식·동영상·파일 다운로드 끔(앱 이벤트와 중복·잡음) |
| BigQuery 연결 | 켬(무료 일일 내보내기). 14개월 이후에도 원본 보존, 코호트 직접 계산 |
| Search Console 연결 | ossonida.github.io 등록 후 연결. 자연 검색어 확인 |

## 4. 유입 추적(UTM)

### 명명 규칙

모두 소문자, 공백 대신 `_`. 같은 의미는 항상 같은 값을 쓴다.

| 매개변수 | 의미 | 값 예시 |
|---|---|---|
| `utm_source` | 어디(사이트·장소) | `boardlife`, `naver_cafe_<카페명>`, `dcinside`, `instagram`, `threads`, `kakao_openchat`, `cafe_<매장명>`, `share` |
| `utm_medium` | 어떤 형태 | `community_post`, `profile_link`, `qr`, `chat`, `recap_image`, `game_share`, `referral` |
| `utm_campaign` | 무엇 때문에 | `launch_2026`, `pro_beta`, `yearly_recap_2026`, `evergreen` |
| `utm_content` | 같은 캠페인 안 소재 구분 | `post_a`, `sticker_table`, `sticker_counter` |

### 링크 예시

| 채널 | 링크 |
|---|---|
| 보드라이프 글 | `https://ossonida.github.io/score/?utm_source=boardlife&utm_medium=community_post&utm_campaign=evergreen` |
| 인스타 프로필 | `…/score/?utm_source=instagram&utm_medium=profile_link&utm_campaign=evergreen` |
| 보드게임 카페 테이블 QR | `…/score/?utm_source=cafe_<매장명>&utm_medium=qr&utm_campaign=cafe_pilot&utm_content=sticker_table` |
| 연말 결산 홍보 | `…/score/?utm_source=threads&utm_medium=community_post&utm_campaign=yearly_recap_2026` |

QR은 매장·위치별로 `utm_content`를 달리해 어느 스티커가 실제 기록 사용자를 만드는지 비교한다.

### 앱 쪽 처리(구현 필요)

- 첫 화면에서 UTM이 붙어 들어오면 GA가 읽은 뒤 주소창에서 지운다(`history.replaceState`). 홈 화면에 추가할 때 UTM이 시작 주소로 굳어 이후 실행이 모두 그 캠페인으로 잡히는 것을 막는다. `gtag('config')`에 `page_location`을 원래 주소로 명시한 다음 지운다.
- `manifest.webmanifest`의 `start_url`을 `./?utm_source=pwa&utm_medium=app_launch`로 바꾼다. 설치 앱 실행이 `(direct)`와 구분된다(GA는 같은 사용자의 최초 유입 채널은 유지한다).

## 5. 확산 경로(공유 → 유입)

| 위치 | 변경 |
|---|---|
| 공유 문구(`navigator.share`의 `text`) | 끝에 `https://ossonida.github.io/score/?utm_source=share&utm_medium=<recap_image\|game_share>&utm_campaign=user_share` 추가 |
| 공유 이미지 하단 | 앱 이름과 짧은 주소(또는 QR)를 작게 표기. 사진만 퍼져도 찾아올 수 있게 |
| `feature_used`·`share_completed` | `share_type`(`recap_single`, `recap_set`, `game`), `scope`(`public`, `friends`) 매개변수 추가 |

측정: **공유 계수 = (utm_source=share 신규 사용자) ÷ (share_completed 사용자)**. 주 단위로 본다.

## 6. 주요 이벤트(전환)

GA 관리 → 이벤트 → **이벤트 만들기**로 기존 이벤트에서 파생 이벤트를 만들고 주요 이벤트로 표시한다. 코드 변경 없이 된다.

| 파생 이벤트 | 조건 | 주요 이벤트 | 의미 |
|---|---|---|---|
| `game_saved` | `event_name = game_ended` 이고 `outcome = saved` | ✓ | 활성화의 핵심. 채널 성과 기준 |
| `share_done` | `event_name = feature_used` 이고 `action = share_completed` | ✓ | 확산 |
| `install_done` | `event_name = feature_used` 이고 `action = install_accepted` | ✓ | 설치 |
| `login_done` | `event_name = feature_used` 이고 `action = login_completed` | | 계정 전환 |
| `pro_interest` | (기존 이벤트) | ✓ | 유료 수요 |

추가로 코드에서 **첫 기록 저장**을 따로 보낸다: `first_game_saved`(기기 기준 저장 기록 0 → 1이 된 순간, 1회). 신규 사용자 활성화율의 분자다. 주요 이벤트로 표시한다.

## 7. 사용자 속성

`gtag('set','user_properties',{…})`로 앱 시작 시와 값이 바뀔 때 설정한다. 모두 구간·열거형이라 개인을 식별하지 않는다. GA 맞춤 측정기준(범위: 사용자)으로 등록한다.

| 속성 | 값 | 쓰임 |
|---|---|---|
| `display_mode` | `standalone`, `browser` | 설치 사용자 vs 웹 사용자 재방문 비교 |
| `signed_in` | `yes`, `no` | 로그인이 유지에 주는 효과 |
| `record_bucket` | `0`, `1`, `2-4`, `5-19`, `20+` | 기록량별 행동·Pro 관심 |
| `main_mode` | `score`, `win`, `team`, `rank`, `cooperative` (저장 기록 최다) | 어떤 사용 방식이 남는지 |
| `bgg_linked` | `yes`, `no` | BGG 사용자층 크기 |
| `ui_lang` | `ko`, `en` | 해외 유입 확인 |

## 8. 맞춤 측정기준 등록(이벤트 범위)

이미 보내고 있는 매개변수를 등록만 하면 보고서·탐색에서 나눠 볼 수 있다. 등록 전 데이터는 소급되지 않으므로 **가장 먼저** 한다.

| 매개변수 | 표시 이름 | 우선순위 |
|---|---|---|
| `mode` | 게임 모드 | 1 |
| `outcome` | 게임 종료 결과 | 1 |
| `feature`, `action` | 기능, 동작 | 1 |
| `entry_point` | 진입 경로 | 1 |
| `reason` | Pro 기능 | 1 |
| `player_count` | 인원 구간 | 2 |
| `input_method`, `direction` | 점수 입력 방식·방향 | 2 |
| `screen`, `context`, `change_type` | 화면·맥락·수정 종류 | 3 |
| `share_type`, `scope` | 공유 종류·범위(5절 구현 후) | 2 |

## 9. 보고서·탐색 구성

| 이름 | 기법 | 설정 | 보는 법 |
|---|---|---|---|
| 채널 성과 | 자유 형식 | 행: 첫 사용자 소스/매체·캠페인 / 값: 신규 사용자, `first_game_saved` 사용자, 7일 내 재방문 사용자 | 신규가 아니라 **활성화율** 순으로 채널 우선순위를 정한다 |
| 첫날 퍼널 | 유입경로 탐색(개방형 아님, 같은 세션 아님) | `first_visit` → `game_started` → `first_score_changed` → `game_saved` / 분류: 기기, 첫 사용자 매체 | 가장 많이 빠지는 단계를 다음 개선 대상으로 |
| 재방문 코호트 | 동질 집단 | 포함: `first_visit` / 재방문: `game_saved` / 주 단위, 6주 | 1주차 유지율이 바뀌는지 릴리스별로 비교 |
| 확산 루프 | 자유 형식 | 행: 주 / 값: `share_done` 사용자, utm_source=share 신규 사용자 | 공유 계수 추이 |
| 설치·로그인 효과 | 자유 형식 + 세그먼트 | 세그먼트: `display_mode=standalone`, `signed_in=yes` / 값: 사용자당 `game_saved`, 재방문율 | 설치 유도 문구에 힘을 줄지 판단 |
| Pro 수요 | 유입경로 | `pro_sheet_viewed` → `pro_interest`, 분류: `reason` | 어떤 Pro 기능이 관심을 끄는지 |

잠재고객(추후 재방문 광고·비교용): `기록 1회 후 14일 미방문`, `기록 5회 이상`, `공유 경험 있음`, `Pro 관심`.

## 10. 주간 핵심 지표

매주 월요일, 지난 7일 기준으로 본다.

| 지표 | 정의 |
|---|---|
| 신규 사용자(채널별) | 첫 사용자 소스/매체별 신규 사용자 |
| 활성화율 | `first_game_saved` 사용자 ÷ 신규 사용자 |
| 주간 기록 사용자 | `game_saved`가 1회 이상인 사용자 |
| 1주차 유지율 | 전주 신규 중 이번 주 `game_saved` 사용자 비율 |
| 공유 계수 | 5절 정의 |
| 설치 수 | `install_done` |
| Pro 관심 | `pro_interest` 사용자, 누적 |

현재(11/26 이전) 기준값은 실사용 2개월 37명, 재방문 8명, 기록 저장 4명뿐이다. 소수라 비율보다 **절대 수와 추이**로 본다.

## 11. 진행 순서

| 단계 | 내용 | 코드 변경 |
|---|---|---|
| 1 | 맞춤 측정기준 등록(8절), 파생 이벤트·주요 이벤트(6절) | 없음(GA 관리 화면) |
| 2 | 전용 속성 결정 → 측정 ID 교체, BigQuery·Search Console 연결 | `app-analytics.js` 1줄 |
| 3 | UTM 정리·`start_url`·공유 문구 링크·`share_type`/`scope` | `app-analytics.js`, `manifest.webmanifest`, `recap-share.js` |
| 4 | 사용자 속성, `first_game_saved` | `app-analytics.js`, `analytics-events.js` |
| 5 | 채널별 UTM 링크·QR 배포, 9절 탐색 저장, 주간 지표 점검 시작 | 없음 |

각 단계의 이벤트·매개변수는 구현 시 `docs/ANALYTICS-EVENTS.md`와 `analytics-events.js` 허용 목록에 함께 추가한다.
