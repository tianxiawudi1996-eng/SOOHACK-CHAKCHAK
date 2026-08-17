# 수학착착 개인정보 실행 준비도 계약 v1.0

## 목적

불변 dry-run 패키지가 있어도 실제 개인정보 작업을 바로 실행하지 못하게 한다. 실행 직전 필요한 여섯 외부 운영 조건과 로컬 선행 조건을 분리해 기록하고, 외부 증거·권한이 없는 현재 환경은 항상 차단 상태로 유지한다.

## 로컬 선행 조건

- 검토 대상이 최신 패키지 리비전이다.
- 패키지가 만료되지 않았다.
- 활성 법적 보존이 없다.
- `NO_MUTATION_BASELINE` 복구 체크포인트가 있다.
- 개인정보·보안 이중 승인이 유지된다.
- 저장된 매니페스트를 다시 계산한 SHA-256이 일치한다.

하나라도 실패하면 상태는 `BLOCKED_LOCAL_PREREQUISITE`다.

## 외부 필수 조건

1. `MANAGED_IDENTITY`: 관리형 신원과 강한 인증
2. `JIT_AUTHORIZATION`: 제한 시간·범위의 단기 권한
3. `BACKUP_RESTORE_EVIDENCE`: 실제 백업 및 복구 시험 증거
4. `CHANGE_WINDOW`: 승인된 작업 시간과 책임자
5. `KILL_SWITCH_RELEASE_AUTHORITY`: 중단 스위치 해제 권한과 이중 통제
6. `AUDIT_EXPORT_ROUTE`: 변경 불가 감사 로그의 승인된 저장 경로

현재 API에는 외부 증거를 입력하거나 승인하는 경로가 없다. 모든 외부 조건은 `MISSING_EXTERNAL`이며 로컬 조건이 모두 통과해도 상태는 `BLOCKED_EXTERNAL`이다.

## 데이터와 권한

- SECURITY_APPROVER만 준비도 검토 리비전을 생성한다.
- OPERATOR·PRIVACY_APPROVER·SECURITY_APPROVER는 내부 검토를 조회할 수 있다.
- 학생은 403을 받는다.
- 검토와 조건 행은 PostgreSQL 트리거로 UPDATE·DELETE가 차단된다.
- 재검토는 이전 행을 바꾸지 않고 후속 리비전을 추가한다.

## 실행 경계

중단 스위치는 항상 `true`, 실행 승인은 항상 `false`다. 외부 증거 입력, 중단 스위치 해제, 실행 승인, 파괴적 실행, `COMPLETED` 전이 엔드포인트는 제공하지 않는다.
