# 상용 운영·복구 승인 준비도 설계 v1.0

## 1. Goal Framing

- 사용자: 제품 책임자, 운영 책임자, 개인정보 운영자, 보안·복구 검토자
- 문제: 로컬 기능과 자동 테스트만으로 아동 개인정보, 결제·환불, SLA, 장애 대응, 백업 복구와 출시 통제를 증명할 수 없다.
- 변화: 상용화 필수 통제와 실제 외부 증거의 공백을 집계 준비도로 판정하고 미검증 출시는 차단한다.
- 성공 지표: 10개 통제 정의, 증거 만료·거부 차단, 백업/복구 훈련, migration rollback, 중대 이슈 0, 제품 검토 대기 상태.
- 제외: 실제 법률 승인·계약·결제 연결·운영 배포·출시 승인.

## 2. 요구사항

| ID | 사용자·목적 | 입력·규칙 | 출력·화면 | 인수·테스트 기준 |
|---|---|---|---|---|
| OPR-01 | 제품 책임자가 상용 범위를 고정 | 10개 통제, protocol hash, 환경별 대상 | 프로토콜·통제 수 | 10개 미만·중복·해시 오류는 차단 |
| OPR-02 | 개인정보 운영자가 미성년자 보호를 확인 | privacy/legal/consent evidence reference | 통제별 상태 | 직접 개인정보·법률 원문 없이 참조만 저장 |
| OPR-03 | 상용 담당자가 결제·환불·SLA를 확인 | 결제·환불·지원 SLA 통제와 만료 | 통제 집계 | 만료·거부·누락 시 차단 |
| OPR-04 | 운영자가 장애·모니터링·복구를 확인 | incident, alert route reference, backup/restore drill aggregate | 복구·장애 상태 | 복구 결과 PASS와 rollback 검증 전 출시 차단 |
| OPR-05 | 보안 담당자가 access·migration·배포 통제를 확인 | security reference, migration/health/rollback evidence | 통제 상태 | public access·Secret·배포 완료 허위 기록 금지 |
| OPR-06 | 제품 책임자가 출시 검토를 수행 | 독립 검토 reference와 결정 | `READY_FOR_RELEASE_REVIEW` | 자동 배포·자동 출시 금지 |
| OPR-07 | 관리자만 준비도를 조회 | privacy-operator/admin 세션 | 최소화 JSON | 관리자 200, 학생·학부모 403 |

## 3. 필수 통제 10개

1. `PRIVACY_CHILD_CONSENT`
2. `CONTENT_RIGHTS`
3. `PAYMENT_REFUND`
4. `SLA_SUPPORT`
5. `INCIDENT_RESPONSE`
6. `MONITORING_ALERTS`
7. `BACKUP_RESTORE`
8. `MIGRATION_ROLLBACK`
9. `DEPLOYMENT_HEALTHCHECK`
10. `SECURITY_ACCESS_REVIEW`

각 통제의 실제 증거는 `evidence_reference`, `evidence_sha256`, `verified_at`, `expires_at`, `status`만 저장한다. 법률·계약·백업 원문은 저장하지 않는다.

## 4. 데이터 흐름과 권한

`운영 관리자 Browser → GET readiness Endpoint → Controller → Repository 집계 SQL → PostgreSQL → Service 판정 → 최소화 JSON`

- API는 읽기 전용 관리자 readiness만 제공한다.
- Service는 10개 통제, 증거 유효기간, backup/restore, rollback, 이슈와 제품 리뷰를 판정한다.
- Repository는 원문·Secret·결제 토큰·개인정보를 반환하지 않는다.
- 학생·학부모·교사는 403을 받는다.

## 5. PostgreSQL 설계

| 테이블 | 책임 | 주요 통제 |
|---|---|---|
| `commercial_ops_protocol` | 상용화 범위·환경·프로토콜 해시 | 잠금 후 범위·해시 불변 |
| `commercial_ops_control` | 10개 통제 정의 | 통제 코드 unique, preregistered=true |
| `commercial_ops_evidence` | 외부 증거 metadata | 해시·유효기간·상태, append-only |
| `commercial_ops_recovery_drill` | backup/restore·rollback 훈련 집계 | 결과·복구 시각·증거 reference, append-only |
| `commercial_ops_incident` | 장애·중대 위험 | latest revision, HIGH/CRITICAL 미해결 차단 |
| `commercial_ops_product_review` | 최종 수동 검토 | 결정·검토 reference, append-only |

모든 외부 증거 테이블은 UPDATE·DELETE를 금지한다. 공개 권한을 회수하고 migration 0040과 rollback을 대칭으로 유지한다.

## 6. 상태와 실패 흐름

- `BLOCKED_EXTERNAL_COMMERCIAL_OPERATIONS`: 실제 통제·복구·운영 증거가 없거나 게이트 실패.
- `READY_FOR_RELEASE_REVIEW`: 10개 통제, backup/restore, rollback, 중대 이슈 0이 확인되었으나 제품 책임자 출시 검토 전.
- `EXTERNAL_COMMERCIAL_OPERATIONS_ACCEPTED`: 외부 운영 증거와 수동 검토가 접수되었으나 자동 배포·출시는 하지 않는다.
- 증거가 만료·거부·해시 불일치면 차단한다.

## 7. 검증

- 단위: 빈 기준선, 통제 누락·중복·만료·거부, 복구 실패, rollback 실패, 중대 이슈, 완전 합성 readiness와 자동 출시 금지.
- DB: forward·rollback·reapply, 6개 테이블, FK·CHECK·UNIQUE, 잠금·append-only·공개 권한 회수.
- API: 관리자 200, 학생 403, 기준 시드 0개 증거와 차단 상태.
- 전체: 단위·통합·보안·운영·스테이징·Phase 0·diff.
