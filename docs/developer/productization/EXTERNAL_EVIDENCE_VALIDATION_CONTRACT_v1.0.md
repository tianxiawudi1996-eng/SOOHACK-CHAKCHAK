# 수학착착 외부 증거 검증 계약 v1.0

## 목적

외부 운영 증거가 연결될 경우 적용할 상태 전이·이중 검토·만료·철회·민감정보 최소화 규칙을 사전에 고정한다. 현재 구현은 검증 정책만 제공하며 증거 제출이나 검증 완료 기능이 아니다.

## 상태기계

상태는 `NOT_SUBMITTED`, `SUBMITTED`, `UNDER_REVIEW`, `DUAL_APPROVED`, `VERIFIED`, `REJECTED`, `EXPIRED`, `REVOKED`의 8종이다. 13개의 명시된 전이만 허용하며 `REJECTED`·`EXPIRED`·`REVOKED`에서는 다른 상태로 복귀할 수 없다.

- 검증 전 개인정보 승인자와 보안 승인자의 서로 다른 검토자가 모두 승인해야 한다.
- 자기 검토는 금지한다.
- 검증 이후에도 만료 또는 철회될 수 있다.
- 실제 최대 유효기간은 조직 정책 미결정이므로 `MISSING_EXTERNAL`과 NULL로 유지한다.
- 모든 실행 직전 철회 상태를 다시 확인해야 한다.

## 데이터 최소화

허용 메타데이터는 증거 유형, 발급자 내부 참조, 발급 시각, 만료 시각, SHA-256, 승인된 외부 저장소 참조만이다. 증거 원문, 자격증명, Secret, 토큰, 개인 연락처, 생체정보, 학생 식별자는 저장을 금지한다.

## 권한·불변성

- SECURITY_APPROVER만 정책 리비전을 생성한다.
- OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER만 조회한다.
- 학생은 403을 받는다.
- 최신 인계 패킷, 패킷 SHA-256, 패키지 만료·후속 패키지·법적 보존을 생성 시 다시 검사한다.
- 정책과 규칙의 UPDATE·DELETE는 PostgreSQL 트리거가 거부한다.

## 안전 경계

증거 제출, 상태 전이, 승인 결정, 외부 저장소 읽기, Kill Switch 해제, 실행 승인, 개인정보 실행 엔드포인트는 제공하지 않는다. 모든 규칙은 `AWAITING_EXTERNAL_CHANNEL`, 제출 채널과 만료 정책은 `MISSING_EXTERNAL`, 실행 승인은 false다.
