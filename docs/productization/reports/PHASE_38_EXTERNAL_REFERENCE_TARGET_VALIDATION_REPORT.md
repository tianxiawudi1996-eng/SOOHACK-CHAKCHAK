# 수학착착 Phase 38 외부 참조 대상 정규화·SSRF 방어 계약 보고서

## 결과

Phase 37의 미제안 scheme 거버넌스에 대상 정규화, 거부 규칙, 소유권·DNS 증명, SSRF 차단 정책을 연결했다. 실제 대상·DNS 조회·소유권 검증·allowlist 등록·외부 접속은 수행하지 않았다.

자동 검증 상태는 `AUTO_VERIFIED_LOCAL_TARGET_VALIDATION_POLICY_BLOCKED_EXTERNAL`이다. 외부 저장소를 접속하거나 증적을 제출했다는 의미가 아니다.

## 검증 결과

- 대상 검증 계약·규칙 테이블 2/2
- 통제 규칙 6/6, 정규화 단계 8/8, 거부 규칙 14/14
- 소유권 증명 유형 6/6, 금지 주소 클래스 8/8
- 실제 대상 0개, 소유권 증명 0개, DNS snapshot 0개
- wildcard·userinfo·IP literal·경로 탈출·인코딩 우회 금지 6/6
- Unicode confusable 검사와 IDNA ASCII 정규화 필수 6/6
- redirect 0회, DNS 재바인딩 guard 필수, 사설망 금지 6/6
- 단위 테스트 117/117 PASS
- Phase 38 통합 1/1 PASS
- 전체 PostgreSQL 통합 29/29 PASS
- 계약·규칙 UPDATE/DELETE 2/2 차단
- migration forward·rollback·reapply PASS
- SECURITY_APPROVER 생성 PASS, OPERATOR 생성 403, 학생 조회 403
- target·ownership proof·DNS validate·activate 경로 404, 기존 COMPLETED 전이 409
- DNS·redirect·allowlist·fetch·연결·실행 권한 false, 원본 변경 0건

## 실패와 수정

첫 Docker Compose 재생성 명령은 필수 로컬 세션 환경변수 `MATHCHAKCHAK_STAGE_SESSION_SECRET`이 없는 상태여서 서비스 변경 전에 중단됐다. 저장소나 데이터 변경은 발생하지 않았다. 운영 비밀을 생성하거나 기록하지 않고 Phase 38 격리 검증 전용 합성값을 해당 셸 프로세스에만 주입해 재실행했으며, 컨테이너 빌드·DB 초기화·전체 검사가 통과했다. 구현 코드 결함은 발견되지 않았다.

## 사실·가정·미결정

- 사실: 실제 target, ownership evidence, DNS snapshot은 저장되지 않는다.
- 사실: DNS 조회와 redirect follow API가 없다.
- 가정: 실제 운영자는 승인 가능한 scheme·port와 authority 소유권 증명을 제공해야 한다.
- 미결정: 허용 scheme·port, DNS resolver·egress 경계, 소유권 증명 발급자, 검증 TTL과 재검증 SLA다.

## 다음 Phase

Phase 39는 실제 외부 제안값을 받지 않은 상태에서 소유권 증명 제출 형식, issuer trust, TTL·재검증·철회 이벤트, DNS snapshot 무결성의 수동 인계 계약을 설계한다. 증명 접수와 네트워크 검증은 별도 승인 전까지 금지한다.
