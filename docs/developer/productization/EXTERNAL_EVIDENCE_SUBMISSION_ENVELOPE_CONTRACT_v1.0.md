# 외부 증적 제출 envelope 계약 v1.0

## 목적

Phase 35 대기열 슬롯에 들어올 메타데이터의 형식과 거부 규칙을 사전에 고정한다. 이 문서는 외부 접수 채널이나 연결 권한을 제공하지 않는다.

## 필수 envelope 필드

`schema_version`, `submission_id`, `queue_contract_id`, `control_key`, `evidence_type`, `artifact_reference`, `artifact_sha256`, `issuer_reference`, `issued_at`, `expires_at`의 10개 필드를 요구한다.

`submission_id`는 UUID v4이며 멱등 범위는 `queue_contract_id + control_key + submission_id`다. 동일 ID의 동일 envelope는 재전송으로, 다른 envelope는 `SUBMISSION_ID_REPLAY_MISMATCH`로 판정해야 한다. 실제 보존기간은 외부 운영 정책 미결정으로 NULL이다.

## 참조 scheme 승인

`SCHEME_PROPOSAL → PRIVACY_REVIEW → SECURITY_REVIEW → ACTIVATION_APPROVAL` 순서다. 현재 allowlist는 비어 있고 상태는 `MISSING_EXTERNAL_APPROVAL`이므로 모든 ingress는 `REJECT_ALL_UNTIL_ALLOWLIST_APPROVED`다.

## 거부 사유

- `ENVELOPE_SCHEMA_INVALID`
- `SUBMISSION_ID_INVALID`
- `SUBMISSION_ID_REPLAY_MISMATCH`
- `CONTROL_KEY_UNKNOWN`
- `EVIDENCE_TYPE_NOT_ALLOWED`
- `REFERENCE_SCHEME_NOT_ALLOWED`
- `IMMUTABLE_REFERENCE_REQUIRED`
- `SHA256_INVALID`
- `ISSUER_PROVENANCE_REQUIRED`
- `TIMESTAMP_POLICY_UNAVAILABLE`

## 권한과 데이터 흐름

`SECURITY_APPROVER`만 최신 Phase 35 계약에서 새 정책 리비전을 생성한다. 운영 역할은 조회만 가능하고 학생은 403을 받는다. Browser/API는 외부 저장소를 조회하지 않으며 PostgreSQL에는 정책과 NULL 제출 필드만 저장한다.

## 안전 경계

실제 제출, allowlist 쓰기·활성화, 외부 참조 fetch, 상태 전이, 검토 결정, 자동 승격, 원문·자격·비밀 저장, 연결·실행·완료 전이를 제공하지 않는다. 두 테이블은 UPDATE·DELETE를 거부한다.
