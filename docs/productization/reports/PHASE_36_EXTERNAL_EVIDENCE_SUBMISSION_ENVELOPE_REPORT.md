# 수학착착 Phase 36 외부 증적 제출 envelope 정책 보고서

## 결과

Phase 35의 6개 대기열 슬롯에 제출 전 envelope 스키마, 참조 scheme 승인 절차, 멱등 submission ID와 안정적 거부 사유 계약을 연결했다. 허용 scheme은 0개이며 실제 증적 제출·외부 조회·승인·활성화는 수행하지 않는다.

자동 검증 상태는 `AUTO_VERIFIED_LOCAL_SUBMISSION_ENVELOPE_POLICY_BLOCKED_EXTERNAL`이다. 이는 외부 접수 채널 승인이나 연결·실행 허가가 아니다.

## 검증 결과

- envelope 계약·규칙 테이블 2/2
- 통제 규칙 6/6, 필수 필드 10/10, 승인 단계 4/4, 거부 사유 10/10
- 허용 reference scheme 0개, 제출 수락 6/6 `NOT_ACCEPTING`
- UUID v4 submission ID와 슬롯별 멱등 범위 6/6
- 실제 submission ID·참조·해시·발급자·제출 시각 6/6 NULL
- 단위 테스트 109/109 PASS
- Phase 36 통합 1/1 PASS
- 전체 PostgreSQL 통합 27/27 PASS
- 계약·규칙 UPDATE/DELETE 2/2 차단
- migration forward·rollback·reapply PASS
- SECURITY_APPROVER 생성 PASS, OPERATOR 생성 403, 학생 조회 403
- 과거 대기열·수락·어댑터·검증·인계·준비도·만료·후속 패키지·법적 보존·해시 불일치 차단 계약 PASS
- 제출·allowlist 승인·활성화 경로 404, 기존 COMPLETED 전이 409
- 원문·자격·비밀 저장, 자동 승격, 연결·실행 승인 false, 원본 변경 0건

## 실패와 수정

구현과 자동 검증 중 제품 코드 결함은 발견되지 않았다. 외부 scheme 승인과 멱등 보존기간 부재는 의도된 차단 상태로 유지했다.

## 사실·가정·미결정

- 사실: 외부 증적 envelope를 수신하거나 참조를 조회하는 API가 없다.
- 사실: allowlist가 비어 있어 ingress 정책은 모든 제출을 거부한다.
- 가정: 승인될 외부 저장소는 불변 참조·SHA-256·발급자·유효기간 메타데이터를 제공한다.
- 미결정: 실제 허용 scheme, scheme 소유자, 제출 인증, 멱등 보존기간, timestamp 허용 오차와 검토 TTL이다.

## 다음 Phase

Phase 37은 외부 승인 전에 필요한 scheme 제안 패킷, 승인자 직무분리, 도메인·버킷·경로 제한, 철회·만료·재승인 정책 계약을 설계한다. 실제 allowlist 등록과 증적 접수는 별도 외부 승인 전까지 금지한다.
