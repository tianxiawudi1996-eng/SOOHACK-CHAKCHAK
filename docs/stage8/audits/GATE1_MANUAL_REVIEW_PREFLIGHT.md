# Gate 1 Manual Review Preflight

## Outcome

`READY_FOR_HUMAN_REVIEW`. 자동 QA와 승인 대장 사전 검사는 통과했고, 해시 고정 검토 패킷을 준비했다. 이것은 승인이 아니므로 Gate 1은 계속 `BLOCKED`, Gate 2는 `NOT_STARTED`다.

## Goal framing

- 사용자: Character Art Lead, 3D Technical Art Lead, UX Brand System Lead, QA Lead, Product Owner
- 변화: 각 책임자가 동일한 후보 해시와 역할별 기준으로 두 캐릭터를 검토할 수 있다.

## Completion specification

- 자동 QA `PASS`: 충족
- SHA-256 목록 검증: 40/40 충족
- 불변 검토 입력: 39개 고정
- 승인 대장 기준본: 1개 해시 기록, 10행 모두 `PENDING`
- 역할별 검토 패킷: 10/10
- 실제 승인: 0/10 — 미충족
- Gate 1 `VERIFIED`: 미충족

## Harness and controls

- 패키지 ID: `gate1-manual-review-916636d0-9c8061af`
- 후보 해시 변경 시 해당 캐릭터 승인 5개 전부 무효
- AI가 reviewer, decision, reviewed_at을 생성하는 행위 금지
- `APPROVE_WITH_PATCH`는 해결·재검증 전까지 승인으로 집계 금지
- 하나의 `REJECT` 또는 해시 드리프트가 있으면 Gate 1 승격 금지

## Loop and stop condition

검토 → 결정 기록 → 해시·필수필드·patch 상태 재검증을 반복한다. 10/10 유효 승인, reject 0, unresolved patch 0, hash drift 0일 때만 종료하고 Gate 1 승격 감사를 별도로 실행한다.

## Current blocker

실제 이름이 있는 다섯 역할이 두 캐릭터에 대해 내리는 책임 있는 결정 10개가 필요하다. 현재 자동화로 생성된 승인값은 없으며 Gate 2 진입은 허용되지 않는다.
