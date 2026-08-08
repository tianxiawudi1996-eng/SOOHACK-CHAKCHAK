# 외부 구성 증적 메타데이터 대기열 계약 v1.0

## 목적과 경계

Phase 34의 6개 외부 요구사항에 대해 증적 원문이 아닌 불변 참조와 SHA-256 메타데이터를 향후 접수할 슬롯을 정의한다. 현재는 제출 채널과 참조 정책이 없으므로 슬롯 생성만 가능하며 실제 접수·조회·검토는 불가능하다.

## 대기열 단계

`ENVELOPE_SCHEMA → REFERENCE_POLICY → SHA256_INTEGRITY → ISSUER_PROVENANCE → DUPLICATE_GUARD → QUARANTINE_QUEUE → DUAL_REVIEW_QUEUE`

모든 단계는 fail-closed다. 참조 scheme, 검토 TTL과 외부 채널이 승인되기 전에는 첫 제출 단계로 진입할 수 없다.

## 슬롯 계약

- Phase 34 요구사항별 슬롯 6개, 허용 증적 종류 총 12개
- 불변 참조·SHA-256·발급자 출처·중복 방지 필수
- 실제 artifact reference·hash·submission ID·queue ID·제출 시각은 NULL
- 개인정보·보안 이중 검토 역할 유지
- 검증 상태 `NOT_SUBMITTED`, 참조·TTL 정책 `MISSING_EXTERNAL`
- 원문·자격·비밀 저장 및 자동 승격 금지

## API와 권한

- `POST /api/v1/privacy-operations/connection-acceptance-packets/{id}/configuration-evidence-queue-contracts`: SECURITY_APPROVER 전용 계약 생성
- `GET /api/v1/privacy-operations/configuration-evidence-queue-contracts/{id}`: 운영 역할 읽기

`submissions`, `enqueue`, `decisions`, `fetch`, `activate` 경로는 제공하지 않는다. 학생 조회도 금지한다.

## 무결성

최신 Phase 34 패킷과 SHA-256을 검증한다. 과거 수락 패킷·어댑터·검증 계약·인계·준비도, 후속 패키지, 만료, 활성 법적 보존을 거부한다. 계약과 슬롯은 UPDATE/DELETE할 수 없다.

## 외부 미결정

허용 참조 scheme, 불변 저장소, 제출 인증, 발급자 출처 정책, 중복 판정 범위, 검토 TTL, 격리·검토 대기열, 검토자 배정과 장애 대응 경로가 외부 승인 대상이다.
