# Stage 8 과거 실행 보고 — 2026-08-05

> 현재 상태 공지(2026-08-15): 아래 본문은 2026-08-05 당시 실행 이력으로 보존한다. 현재 정본은 `harness/status.json`이며 Gate 5는 `VERIFIED`, Gate 6는 `IN_PROGRESS`, Gate 7~8은 `NOT_STARTED`다. 현재 보고는 `docs/stage8/audits/REMAINING_WORK_REPORT_v1.0.md`를 따른다.

## 결과

사용자의 최신 결정에 따라 3D 제작 경로를 종료하고, Stage 7 승인 캐릭터를 직접 참조한 음영 2D 다중 포즈 시스템으로 전환했다. 기존 Blender·GLB 후보는 삭제하지 않고 `SUPERSEDED_BY_2D_STRATEGY` 감사 이력으로 보존한다.

| Gate | 상태 | 근거 |
|---:|---|---|
| 0 | `VERIFIED` | Stage 7 필수 원본 10/10과 SSOT 감사 완료 |
| 1 | `VERIFIED` | canonical view와 1인 승인 기록 완료 |
| 2 | `VERIFIED` | 음영 2D 시트 자동 QA PASS, 제품 책임자 수동 승인 1/1 |
| 3 | `VERIFIED` | 투명 PNG/WebP 16/16 자동 QA PASS, 제품 책임자 수동 승인 1/1 |
| 4 | `VERIFIED` | 상태·reduced-motion 8/8, Edge 런타임 7/7, 제품 책임자 수동 승인 1/1 |
| 5 | `BLOCKED` | 상태 15/15·이벤트 15/15·말풍선 13/13과 브라우저 QA PASS, 제품 책임자 승인 0/1 |
| 6~8 | `NOT_STARTED` | Gate 5 승인 후 제품 통합부터 순차 실행 필요 |

## Gate 2 후보

- 착착이 8포즈 시트: 1536×1024 PNG
- 공식이 8포즈 시트: 1536×1024 PNG
- 상태: `IDLE_LISTEN`, `WELCOME`, `GUIDE`, `THINK`, `PRAISE_PROGRESS`, `SEARCH`, `CELEBRATE`, `RETRY`
- 자동 QA: `PASS`
- 시각 검토: `APPROVED`
- 검토 URL: `http://127.0.0.1:4174/docs/stage8/evidence/2d-pet/v1.0/review/`

## Gate 3 후보

- 투명 PNG: 16개, 각 512×512
- 무손실 WebP: 16개, 각 512×512
- 피벗: 하단 중앙 `(0.5, 1.0)`
- 자동 QA: `PASS`, 원본 셀 픽셀 일치 16/16
- 시각 검토: `APPROVED`
- 검토 URL: `http://127.0.0.1:4174/docs/stage8/evidence/2d-pet/v1.0/gate3-review/`

## 남은 통제 작업

1. Gate 5 검토 화면에서 아동 문구·힌트 비노출·오답 흐름·우선순위·반복 빈도·숨김 모드를 제품 책임자가 확인한다.
2. Gate 5 제품 책임자 수동 승인 후에만 Gate 6 진입을 연다.
3. Gate 6~8은 실제 제품 코드·QA 환경·배포 대상이 확인된 뒤 순차 실행한다.

현재 증거는 Gate 2·3·4의 구현·자동 QA·제품 책임자 승인과 Gate 5 AI Behavior 후보·자동 QA 완료를 증명한다. Gate 5 수동 승인, Gate 6 제품 통합, Gate 7 QA, Gate 8 배포 완료는 아직 증명하지 않는다.

랜딩페이지 프로토타입에는 승인된 투명 포즈 자산을 사용해 착착이·공식이를 첫 화면, 학습 대화 아바타, 성장 리포트에 배치했다. 이 배치는 사용자 화면 검증용이며 선행 Gate를 건너뛴 Gate 6 완료로 계산하지 않는다. 상세 잔여 범위는 `REMAINING_WORK_REPORT_v1.0.md`에 기록했다.

Gate 3 승인 입력은 `GATE3_2D_PET_MANUAL_REVIEW_v1.0.json`과 `audit_gate3_2d_pet_poses.py`로 검증했다. 현재 결과는 자동 QA `PASS`, 수동 승인 1/1, Gate 3 `VERIFIED`이며 Gate 4 진입이 허용됐다.

## Gate 4 승인 결과

- 상태 전환: 8/8
- 포즈 사이 전환: 이전·다음 이중 레이어 320ms 교차 모션
- 모션 축소 정적 대체: 8/8
- 허용 속성: `transform`, `opacity`
- 런타임 API: `window.mathChakChakPets.setState(state, source)`
- 자동 QA: `PASS`
- Edge 런타임 QA: `PASS` — 순차·역순·빠른 입력, CLS, 360·768·1440px, 포인터, reduced-motion
- 시각 검토: `APPROVED` — John KIM, 2026-08-05T22:40:15+09:00
- 검토 URL: `http://127.0.0.1:4174/docs/stage8/evidence/2d-pet/v1.0/gate4-review/`

## Gate 5 후보 결과

- 정본 연결: 상태 15/15, 이벤트 15/15, 말풍선 13/13, 중재 규칙 10개
- 시각 상태: Gate 4 승인 상태 8개에만 매핑
- 행동 통제: 오류 우선 선점, 입력 보호, 단일 대기열, 반복 억제, 쿨다운, 주연·보조 역할
- 개인정보: 이벤트 ID·상태·처리 결과만 최대 50개 기록, 입력값 미기록
- 브라우저 QA: `PASS` — 이벤트 매트릭스·우선순위·대기열·입력 보호·숨김·뷰포트·reduced-motion
- 수동 검토: `PENDING` — 제품 책임자 0/1
- 검토 URL: `http://127.0.0.1:4174/docs/stage8/evidence/2d-pet/v1.0/gate5-review/`
