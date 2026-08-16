# 대치동 현장 파일럿 준비도 설계 v1.0

## 1. Goal Framing

- 사용자: 제품 책임자, 개인정보 운영자, 독립 현장 결과 검토자
- 문제: 로컬 기능 시연과 자동 테스트만으로 대치동권 학원의 운영성·완주·학부모 이해·재사용·구매 의향을 입증할 수 없다.
- 변화: 실제 현장 증거의 완전성과 차단 사유를 집계 데이터로 판정하고 허위 시장 적합성 선언을 막는다.
- 성공 지표: 학원 2~3곳, 계약·개인정보 승인 100%, 참여 동의 일치, 계획 주차 관찰, 6개 필수 지표, 미해결 중대 이슈 0건, 독립 결과 1건 이상.
- 제외: 학원 모집, 개인 연락, 실제 계약·동의 작성, 배포, 결제, 시장 점수 확정.

## 2. 요구사항

| ID | 사용자·목적 | 입력·규칙 | 출력·화면 | 인수·테스트 기준 |
|---|---|---|---|---|
| D80-09-F01 | 제품 책임자가 파일럿 범위를 고정 | 학원 최소 2·최대 3, 계획 주차 1~12, 프로토콜 SHA-256 | 프로토콜 상태·차단 사유 | 범위 밖 학원 수·주차는 차단 |
| D80-09-F02 | 개인정보 운영자가 계약·동의를 확인 | 학원별 agreement/privacy evidence reference, 참여 학생 집계와 동의 집계 일치 | 학원별 준비 집계 | 원본 이름·연락처·학생 ID 없이 누락을 차단 |
| D80-09-F03 | 현장 운영자가 주차별 지표를 제출 | 6개 사전 등록 지표, 집계 numerator/denominator/value, evidence reference | 관찰 주차·지표 완전성 | 원문 설문·답안 없이 계획 주차와 지표 수를 검증 |
| D80-09-F04 | 제품 책임자가 중대 위험을 차단 | 개인정보·안전·수학 정확도·운영 중단 이슈, 심각도와 상태 | 미해결 중대 이슈 수 | HIGH/CRITICAL 미해결 1건 이상이면 차단 |
| D80-09-F05 | 독립 검토자가 결과를 검증 | 집계 데이터셋·보고서 SHA-256, 독립 reviewer reference, 학원·참여자 집계 | 결과 검증 상태 | 독립 검증 전 현장 완료 금지 |
| D80-09-F06 | 제품 책임자가 최종 검토 | 승인·패치·반려 결정과 evidence reference | `READY_FOR_PRODUCT_REVIEW` 또는 차단 | 자동 시장 승인·80점 확정 금지 |
| D80-09-F07 | 관리자가 준비도를 조회 | 관리자 세션 | 개인정보 최소화 JSON | 관리자 200, 학생 403 |

## 3. 필수 지표

1. `TEACHER_CORE_WORKFLOW_COMPLETION_RATE`
2. `STUDENT_LEARNING_PLAN_COMPLETION_RATE`
3. `PARENT_REPORT_COMPREHENSION_RATE`
4. `REUSE_INTENT_RATE`
5. `PURCHASE_INTENT_RATE`
6. `CRITICAL_INCIDENT_COUNT`

지표값 자체의 목표선은 실제 파일럿 프로토콜 등록 시 제품 책임자와 독립 검토자가 고정한다. 로컬 코드가 임의의 시장 합격선을 만들지 않는다.

## 4. 데이터 흐름과 권한

`관리자 Browser → GET readiness Endpoint → Controller → Repository 집계 SQL → PostgreSQL → readiness Service → 개인정보 최소화 JSON`

- Endpoint/Controller: 인증된 요청 매핑과 응답만 담당한다.
- Service: 2~3개 학원, 계약·동의·주차·지표·중대 이슈·독립 결과 게이트를 판정한다.
- Repository: 매개변수 없는 관리자 집계 조회만 수행하며 원문·직접 식별자를 반환하지 않는다.
- Database: 프로토콜·지표·학원 reference·집계 관찰·이슈·독립 결과·제품 검토의 무결성을 보장한다.
- API 권한: 기존 개인정보 운영자 역할만 허용한다. UI 메뉴 숨김으로 권한을 대체하지 않는다.

## 5. PostgreSQL 설계

| 테이블 | 책임 | 주요 통제 |
|---|---|---|
| `daechi_field_pilot_protocol` | 범위·주차·프로토콜 해시 | 2~3곳, 1~12주, 잠금 뒤 핵심 필드 불변 |
| `daechi_field_pilot_metric` | 6개 사전 등록 지표 | protocol+metric unique, preregistered=true |
| `daechi_field_pilot_academy` | 학원 내부 reference와 계약 상태 | 이름·주소·연락처 금지, protocol 내 identity unique |
| `daechi_field_pilot_observation` | 학원·주차·지표 집계값 | 학원·지표 동일 protocol FK, 원문 금지 |
| `daechi_field_pilot_issue` | 현장 위험·조치 이력 | HIGH/CRITICAL 미해결 집계 가능 |
| `daechi_field_pilot_result` | 독립 집계 결과 | dataset/report hash, independently verified |
| `daechi_field_pilot_product_review` | 제품 책임자 결정 | append-only, 자동 승인 금지 |

결과·제품 검토·관찰 이력은 UPDATE·DELETE를 금지한다. 공개 권한을 회수하고 migration 0039와 rollback을 대칭으로 유지한다.

## 6. 상태와 실패 흐름

- `BLOCKED_EXTERNAL_FIELD_EVIDENCE`: 실제 증거가 없거나 하나 이상의 게이트가 실패한다.
- `READY_FOR_PRODUCT_REVIEW`: 프로토콜·2~3개 학원·계약·동의·관찰·지표·중대 이슈 0·독립 결과가 완전하나 제품 책임자 결정은 없다.
- `EXTERNAL_FIELD_EVIDENCE_ACCEPTED`: 제품 책임자 승인 증거가 접수되었다. 이 상태도 자동으로 대치동 적합성 또는 시장 점수 80점을 선언하지 않는다.
- 입력 수가 상위 집계보다 크면 상위 집계로 제한하고, 학원 수가 범위를 벗어나면 차단한다.

## 7. 검증

- 단위: 빈 증거, 1곳·4곳, 계약/동의 누락, 관찰 부족, 중대 이슈, 완전 증거, 승인 후에도 시장 주장 금지.
- DB: forward·rollback·reapply, 7개 테이블, FK·CHECK·UNIQUE, 잠금·append-only·비실제 시드.
- API: 관리자 200, 학생 403, 실제 학원 0개와 차단 상태.
- 전체: 단위·통합·보안·운영·스테이징·Phase 0·diff.
