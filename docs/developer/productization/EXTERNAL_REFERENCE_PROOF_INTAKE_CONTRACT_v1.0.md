# 외부 참조 증명 intake 정책 계약 v1.0

Phase 40은 외부 증명을 실제로 수신하기 전, 검증 순서와 실패 차단 조건만 정의한다. 증명 제출·원문 저장·검증 실행·검토 결정·quarantine 해제·allowlist 활성화 API는 제공하지 않는다.

## 상태기계

`NOT_ACCEPTING → RECEIVED_QUARANTINED → DUPLICATE_CHECKED → REPLAY_CHECKED → SIGNATURE_CHECKED → ISSUER_CHECKED → DUAL_REVIEW → ACCEPTED_INACTIVE` 순서를 따른다. 각 검사 단계는 `REJECTED`로만 실패 종료할 수 있고, `ACCEPTED_INACTIVE`는 연결이나 실행 권한을 부여하지 않는다.

## 통제

- intake 상태 9개, 허용 전이 14개, 거절 코드 12개
- replay 통제 6개, 검토 결정 enum 3개
- 모든 수신물은 quarantine 선행, 중복·nonce replay·서명·issuer 검증 필수
- 서로 다른 검토자 2인의 결정 필수
- 원문·자격 증명·비밀 자료 저장 금지
- 외부 채널, 보존 기간, replay window, 검토 SLA가 승인될 때까지 관련 값은 NULL
- 계약과 규칙은 append-only이며 UPDATE·DELETE를 거부

## 권한과 차단

`SECURITY_APPROVER`만 계약 revision을 생성한다. `OPERATOR`, `PRIVACY_APPROVER`, `SECURITY_APPROVER`는 조회할 수 있다. 학생은 접근할 수 없다. kill switch는 활성 상태이며 intake·검증·네트워크·실행 권한은 false다.
