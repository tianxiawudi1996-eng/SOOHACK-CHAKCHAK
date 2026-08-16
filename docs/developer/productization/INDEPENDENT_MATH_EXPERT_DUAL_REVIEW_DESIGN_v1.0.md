# 독립 수학 전문가 이중 검토 설계 v1.0

## 목적과 진실 경계

D80-07은 공식·해설·정답·난도를 독립된 수학 전문가 2인이 검토하고 이견 조정 이력을 남기도록 요구한다. 기존 콘텐츠 게시 게이트의 두 검토자 수 조건을 자격·독립성·동일 해시·세부 기준·조정 이력까지 확장한다. 현재 실제 검증 전문가, 자격 증거, 검토 대상, 결정과 조정 이력은 모두 0건이다.

## 역할과 직무분리

- `CONTENT_GOVERNANCE_OWNER`: 프로토콜과 검토 패키지를 준비하지만 검토 결정을 내리지 않는다.
- `MATH_EXPERT_REVIEWER`: 외부 자격 검증 후 배정된 콘텐츠를 독립적으로 검토한다.
- `INDEPENDENT_ADJUDICATOR`: 두 검토 결과가 다를 때 조정하며 두 원 검토자와 identity reference가 달라야 한다.
- `PRODUCT_OWNER`: 증거 완전성을 확인하지만 수학 검토 결과를 자동 생성하거나 변경하지 않는다.

이름·이메일·전화번호·자격증 원문은 앱 DB에 저장하지 않는다. 내부 identity reference와 외부 자격 증거 reference만 저장한다.

## 검토 단위와 기준

하나의 검토 대상은 공식·해설·정답·난도를 묶은 불변 콘텐츠 패키지 SHA-256이다. 두 전문가는 동일한 대상 해시를 기준으로 다음 4개 항목을 각각 판정한다.

1. `FORMULA_ACCURACY`: 공식의 수학적 정확성과 적용 조건
2. `EXPLANATION_VALIDITY`: 해설 단계의 논리성·교육과정 적합성
3. `ANSWER_CORRECTNESS`: 정답·단위·허용 표현의 정확성
4. `DIFFICULTY_ALIGNMENT`: 학년·트랙·난도 배치의 적합성

항목 판정은 `APPROVE`, `PATCH_REQUIRED`, `REJECT`다. 전체 판정은 가장 엄격한 항목을 따르며 검토자는 다른 검토자의 판정을 결정 제출 전 볼 수 없다.

## 상태와 승인 조건

- 대상 상태: `DRAFT → IN_REVIEW → DUAL_APPROVED | DISAGREEMENT | PATCH_REQUIRED | REJECTED`
- 검토자 상태: `PENDING_VERIFICATION → VERIFIED → SUSPENDED | EXPIRED`
- 배정 이해상충: `NO_CONFLICT` 또는 사전 승인된 `DISCLOSED_ACCEPTED`
- 이중 승인: 검증된 서로 다른 전문가 2명, 동일 대상·리비전·SHA-256, 4개 기준 모두 `APPROVE`
- 이견: 두 전체 판정 또는 세부 기준이 하나라도 다르면 `DISAGREEMENT`
- 조정: 두 원 검토자와 다른 독립 조정자의 identity reference, 근거 reference, 대상 SHA-256이 필요하다.

검토 결정과 조정 기록은 append-only다. 수정이 필요하면 새 대상 리비전과 새 해시로 다시 검토한다.

## API·데이터 흐름

```text
Admin Browser → readiness endpoint → Controller → Repository
→ PostgreSQL protocol/reviewer/target/assignment/decision/resolution aggregates
→ fail-closed readiness domain → minimized JSON response
```

Phase 72에서는 관리자 준비도 조회만 제공한다. 실제 전문가 등록·배정·결정·조정 쓰기 API는 외부 신원·자격 검증 및 운영 승인이 연결되기 전에는 제공하지 않는다.

## 완료 조건

로컬 완료는 계약, DB 통제, 준비도 API와 자동 테스트 통과를 뜻한다. D80-07 완료에는 검증된 실제 전문가 최소 2명, 실제 대상별 동일 해시 이중 검토, 모든 이견의 독립 조정과 감사 증거가 필요하다. 자동 QA는 이를 대체하지 않는다.
