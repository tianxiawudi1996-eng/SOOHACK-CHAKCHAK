# 외부 증거 수신 어댑터 계약 v1.0

## 목적과 경계

이 계약은 Phase 32 검증 정책에 전달되기 전 외부 증거가 통과해야 할 수신 경계를 정의한다. 실제 endpoint, 인증서, 서명 알고리즘, 발급자 목록, replay window, 격리 큐, dead-letter 경로는 외부 운영 승인 전까지 비어 있으며 네트워크는 연결하지 않는다.

## 파이프라인

`ENVELOPE_SCHEMA → SIGNATURE_VERIFICATION → ISSUER_TRUST → REPLAY_GUARD → QUARANTINE → POLICY_HANDOFF`

앞 단계가 성공하지 않으면 다음 단계로 진행할 수 없다. 현재는 필요한 외부 정책이 없으므로 모든 포트가 첫 연결 전에 차단된다.

## 통제별 포트

Phase 30부터 유지한 여섯 통제에 각각 하나의 포트를 둔다. 모든 포트는 다음 값을 강제한다.

- `port_status=MISSING_EXTERNAL`, endpoint/transport identity `NULL`, network connection `false`
- mTLS와 서명 검증 필수, 단 서명 정책·허용 알고리즘은 미결정
- 신뢰 발급자 수 0, 신뢰목록 상태 `MISSING_EXTERNAL`
- submission ID와 content hash를 요구하는 replay guard 필수, window 미결정
- 격리 필수, 자동 해제 금지, 재처리에는 개인정보·보안 이중 승인 필요
- retry와 dead-letter 경로 미결정, raw payload 저장 금지

## API와 권한

- `POST /api/v1/privacy-operations/evidence-validation-contracts/{id}/intake-adapter-contracts`: `SECURITY_APPROVER`만 append-only 계약 리비전 생성
- `GET /api/v1/privacy-operations/intake-adapter-contracts/{id}`: `OPERATOR`, `PRIVACY_APPROVER`, `SECURITY_APPROVER` 읽기

`connect`, `submissions`, `quarantine/release`, `retry` 경로는 제공하지 않는다. 생성은 실행 승인이 아니며 `kill_switch_engaged=true`, `execution_authorized=false`를 유지한다.

## 무결성·실패 처리

최신 Phase 32 계약과 매니페스트 SHA-256을 검증하고, 과거 검증 계약·과거 인계·과거 준비도·후속 패키지·만료·활성 법적 보존을 거부한다. 계약과 포트는 UPDATE/DELETE가 불가능하며 재작성은 선행 계약을 참조하는 새 리비전으로만 가능하다.

## 외부 인계 전 미결정

운영 endpoint, transport identity, 인증서 발급·회전·철회, 서명 알고리즘과 key ID 정책, 신뢰 발급자 목록, replay window, 격리·dead-letter 저장소, retry 한도, 모니터링·장애 대응 권한은 별도 승인 대상이다.
