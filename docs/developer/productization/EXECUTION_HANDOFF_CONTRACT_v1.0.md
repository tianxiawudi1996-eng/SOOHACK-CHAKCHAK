# 수학착착 외부 운영 증거 인계 계약 v1.0

## 목적

Phase 30의 여섯 외부 차단 조건을 실제 운영 담당자에게 전달할 수 있는 구조화된 패킷으로 만든다. 이 패킷은 증거 자체나 실행 승인이 아니며, 담당자 이름·연락처·토큰을 저장하지 않는다.

## 조건별 인계 매트릭스

| 조건 | 책임 역할 | 필수 증거 | 제출 경로 정책 |
|---|---|---|---|
| MANAGED_IDENTITY | IDENTITY_PLATFORM_OWNER | 구성 확인서, 인증 정책 export | IDENTITY_GOVERNANCE_CHANGE_CHANNEL |
| JIT_AUTHORIZATION | PRIVILEGED_ACCESS_OWNER | JIT 정책 export, 시간 제한 접근 감사 표본 | PRIVILEGED_ACCESS_CHANGE_CHANNEL |
| BACKUP_RESTORE_EVIDENCE | BACKUP_RECOVERY_OWNER | 백업 작업 증거, 복구 훈련 결과 | DISASTER_RECOVERY_EVIDENCE_CHANNEL |
| CHANGE_WINDOW | CHANGE_MANAGER | 승인된 변경 기록, 롤백·모니터링 계획 | CHANGE_ADVISORY_CHANNEL |
| KILL_SWITCH_RELEASE_AUTHORITY | INCIDENT_CONTROL_OWNER | 이중 통제 권한 정책, 비상 중단 훈련 | PRIVACY_SECURITY_DUAL_CONTROL_CHANNEL |
| AUDIT_EXPORT_ROUTE | AUDIT_ARCHIVE_OWNER | 불변 감사 목적지 확인서, 보존·접근 정책 | AUDIT_ARCHIVE_ONBOARDING_CHANNEL |

모든 조건은 개인정보 승인자와 보안 승인자의 이중 검토를 요구한다. 현재 제출 경로는 실제 연결되지 않았으므로 `MISSING_EXTERNAL`, 요구사항은 `EXTERNAL_SUBMISSION_REQUIRED`다.

## 데이터·권한 계약

- SECURITY_APPROVER만 인계 패킷 리비전을 생성한다.
- OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 패킷을 조회할 수 있다.
- 학생은 403을 받는다.
- 패킷과 요구사항은 PostgreSQL 트리거로 UPDATE·DELETE를 거부한다.
- 재발행은 선행 패킷을 바꾸지 않고 새 리비전을 추가한다.
- 패킷 응답은 생성자 내부 ID를 노출하지 않는다.
- 패킷 생성 시 준비도 최신 리비전, 패키지 만료·후속 리비전, 활성 법적 보존을 다시 검사한다.

## 안전 경계

외부 증거 쓰기·검증 API, 실제 제출 경로, Kill Switch 해제, 실행 승인, 파괴적 실행기는 제공하지 않는다. 패킷 상태는 `AWAITING_EXTERNAL_SUBMISSION`, Kill Switch는 true, 실행 승인은 false로 고정한다.
