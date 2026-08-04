# 다음 파트 메타프롬프트 작성 보고

## 작성 결과

- 작성 파일: `docs/stage8/prompts/GATE1_MANUAL_REVIEW_AND_APPROVAL_METAPROMPT_v1.0.md`
- 다음 파트: Gate 1 책임자 수동 검토·승인
- Gate 2 실행 여부: `금지`
- 현재 승인 상태: `0/10`

## 다음 파트를 Gate 2로 정하지 않은 이유

Gate 1 자동 QA는 통과했지만 실제 책임자 승인 10개가 없다. 순차 Gate 규칙에 따라 Gate 2 Base Mesh 작업을 시작하면 현재 Harness와 기존 v5.2.0 메타프롬프트의 진입조건을 위반한다. 따라서 다음 실행 단위는 Gate 1의 외부 승인 차단을 해소하는 작업이다.

## 메타프롬프트에 반영한 핵심 통제

1. AI는 승인자가 될 수 없으며 reviewer·decision·time을 생성하지 않는다.
2. 두 캐릭터 × 다섯 역할의 10개 승인을 별도로 요구한다.
3. 승인 대상 후보의 SHA-256을 고정한다.
4. 승인 후 파일이 바뀌면 해당 캐릭터의 기존 승인 5개를 모두 무효화한다.
5. `APPROVE_WITH_PATCH`는 patch_id·책임자·완료 기준·재검증이 없으면 미승인이다.
6. `REJECT`가 하나라도 있으면 Gate 1을 승격하지 않는다.
7. Excel 승인 대장과 JSON 기록이 다르면 보수적으로 `FAIL` 처리한다.
8. 10/10 승인·자동 QA PASS·해시 드리프트 0일 때만 Gate 2 진입을 허용한다.

## 역할별 검토 범위

| 역할 | 핵심 검토 |
|---|---|
| Character Art Lead | 얼굴·체형·의상·정체성·실루엣 |
| 3D Technical Art Lead | 하나의 3D 구조로 성립하는 방향·부피·소품 연결 |
| UX Brand System Lead | 브랜드 색·고유 요소·32/64/128px 가독성 |
| QA Lead | 16방향 매핑·파일·해시·증거 완전성 |
| Product Owner | 제품 적합성·잔여 위험·다른 역할 결정 수용 |

## 완료 정의

```text
Automated QA: PASS
Manual approvals: 10/10
Rejects: 0
Unresolved patches: 0
Hash drift: 0
Gate 1: VERIFIED
Gate 2 entry_allowed: true
```

이 조건을 충족하지 못하면 상태는 `BLOCKED_EXTERNAL` 또는 `FAIL`이며 Gate 2는 계속 차단한다.

## 다음 실행

실제 승인자 이름과 역할을 확정한 뒤, 두 캐릭터의 고정 증거 패킷을 배포하고 승인 대장 10행을 채우는 작업을 시작한다. 승인자 정보가 제공되기 전에는 자동화가 추가로 수행할 수 있는 승인 작업이 없다.

## 검증 결과

- Python 구문 검사: `PASS`
- Stage 7 감사: exact originals `10/10`, Gate 0 `VERIFIED`
- Gate 1 자동 QA: `PASS`
- Gate 1 실행 상태: `BLOCKED_EXTERNAL` — 승인 0/10이므로 의도된 차단
- Harness validator: `HARNESS_PASS`
- Git diff whitespace 검사: `PASS`
