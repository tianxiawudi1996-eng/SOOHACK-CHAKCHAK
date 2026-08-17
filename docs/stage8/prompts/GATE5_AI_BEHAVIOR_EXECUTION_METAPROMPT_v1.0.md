# 수학착착 Stage 8 — Gate 5 AI Behavior 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 초등 수학 학습자, 보호자, 학습 UX·제품 책임자
- 달라져야 하는 것: 제품 이벤트가 착착이·공식이의 승인 포즈와 안전한 말풍선으로 일관되게 변환되고, 캐릭터가 학습을 방해하지 않아야 한다.

## 2. Specification Engineering

완료 상태는 Stage 7 `Expression_Motion_Bubble_Library_v1.0.xlsx`의 15개 상태·15개 이벤트·13개 말풍선·10개 중재 규칙이 결정적 런타임으로 구현된 상태다. 15개 행동 상태는 Gate 4에서 승인된 8개 시각 상태에만 매핑한다.

성공 기준:

- Stage 7 상태 15/15, 이벤트 15/15, 말풍선 13/13
- 이벤트 ID·Trigger·캐릭터·우선순위·쿨다운 고유성
- Error/Safety 우선, 입력 중 Listen/Wait 외 자동 행동 차단
- 동일 Bubble ID 연속 2회 금지
- 한 번에 주요 발화자 1명, 완료 이벤트만 공동 발화
- 힌트·재도전 문구의 정답 선노출·비난 표현 0건
- 개인정보 값 없는 제한 길이 메모리 로그
- 캐릭터 숨김 상태에서도 DOM 텍스트와 CTA 유지
- 자동 QA PASS 후 제품 책임자 수동 승인 대기

실패 기준:

- Gate 4 미승인 또는 승인 자산 이외 상태 사용
- 우선순위 역전, 쿨다운·입력 보호 실패, 무한 큐
- 동일 말풍선 반복, 동시에 주요 발화자 2명
- 정답 전체·기술 코드·개인정보 노출
- 캐릭터가 입력·수식·CTA를 가림

## 3. Context Engineering

- 정본: `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`
- 선행 증거: `docs/stage8/evidence/2d-pet/v1.0/2D_PET_MOTION_MANIFEST_v1.0.json`
- 구현: `assets/stage8/ai-behavior-v1.0.js`, `assets/stage8/ai-behavior-v1.0.css`
- 제품 표면: `mock.html`
- 검토: `docs/stage8/evidence/2d-pet/v1.0/gate5-review/index.html`
- 감사: `scripts/harness/audit_gate5_ai_behavior.py`

## 4. Harness Engineering

AI는 정본의 카피와 이벤트 의미를 임의로 바꾸지 않는다. 런타임은 로컬 결정 규칙만 사용하고 외부 모델·네트워크·개인정보 저장을 요구하지 않는다. 감사기는 선행 Gate 해시, 구현 해시, 매핑 완전성, 안전 카피, 입력 보호, 우선순위, 쿨다운, 반복 억제, DOM 접근성을 검사한다. 수동 승인을 추정하지 않는다.

## 5. Prompt Engineering

1. Stage 7 상태·이벤트·말풍선·전환 규칙을 추출한다.
2. 15개 행동 상태를 Gate 4 승인 포즈 8개에 매핑한다.
3. 우선순위 선점, 단일 대기열, 최소 유지시간을 구현한다.
4. 입력 보호, 조건, 쿨다운과 동일 말풍선 반복 억제를 구현한다.
5. 주요 발화자·지원 캐릭터와 DOM 말풍선·CTA를 연결한다.
6. 개인정보가 없는 최대 50개 메모리 로그와 페이지 이탈 큐 초기화를 구현한다.
7. 랜딩페이지와 Gate 5 검토 화면에 이벤트 시뮬레이터를 연결한다.
8. 자동 QA 통과 후 제품 책임자 수동 검토 대기 상태를 유지한다.

## 6. Workflow Engineering

`Stage 7 정본 추출 → 행동 매트릭스 → 중재기 → 포즈·말풍선 연결 → 안전·접근성 → 자동 QA → 브라우저 검토 → 제품 책임자 승인`

## 7. Memory Engineering

남길 것은 Event ID, Trigger, 적용·억제 결과, 행동 상태, 시각 상태, Bubble ID와 제한된 시각뿐이다. 이름·답안·검색어·입력값·기술 오류 본문은 기록하지 않는다. 로그는 메모리에서 최대 50개만 유지하고 페이지 이탈 시 대기열을 비운다.

## 8. Loop Engineering

15개 이벤트를 개별 실행하고 우선순위 충돌, 입력 중 이벤트, 반복 호출, 쿨다운, 오류 선점, 캐릭터 숨김을 반복 검증한다. 자동 매트릭스와 브라우저 회귀 QA가 모두 PASS하고 수동 검토가 승인되면 Gate 5를 종료한다.
