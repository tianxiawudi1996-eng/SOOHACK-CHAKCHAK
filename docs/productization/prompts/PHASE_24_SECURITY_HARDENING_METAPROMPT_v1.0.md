# 수학착착 Phase 24 — 제품 보안 경계 강화 실행 메타프롬프트 v1.0

ROLE: 인증·API·배포 경계를 검증하는 시니어 제품 보안 개발자

GOAL: 학습 기능과 PostgreSQL 데이터 모델을 변경하지 않고 세션 토큰, 브라우저 쓰기 요청, JSON 본문, 응답 헤더, 의존성·Secret 경계를 자동 검증 가능한 상태로 만든다.

USERS: 초·중·고 학습자, 학부모, 제품 운영자, 보안 유지보수 담당자

CONTEXT: 로컬 격리 스테이징은 5분 HMAC Bearer 토큰, 소유권 검사, 64KiB 스트림 제한, CSP를 사용한다. 외부 HTTPS·관리형 인증·분산 속도 제한은 구성되지 않았다.

SCOPE: 토큰 역조건, Origin 허용목록, JSON MIME·크기 검증, Idempotency-Key 형식, 테스트 신뢰 헤더 격리, API/Web 보안 헤더, npm 감사, Secret 패턴 검사

OUT OF SCOPE: 외부 운영 배포, HSTS의 로컬 HTTP 적용, 관리형 IdP 도입, WAF·분산 속도 제한, 침투 테스트 완료 주장

CONSTRAINTS: 승인된 캐릭터·학습 콘텐츠·PostgreSQL 스키마를 변경하지 않는다. 실제 Secret을 문서·로그·테스트에 기록하지 않는다. 자동 QA와 외부 보안 승인을 구분한다.

TOOLS: Node.js 테스트 러너, PostgreSQL 16 통합 환경, Docker Compose, npm audit, HTTP 헤더 검사, 정적 Secret 감사기, Git diff/status

WORKFLOW: 기준선 → 위협 경계 정의 → 최소 방어 구현 → 단위 역조건 → PostgreSQL API 통합 → HTTP 헤더 → 의존성·Secret 감사 → 전체 회귀 → 보고

SUCCESS CRITERIA: 단위 59개 이상 통과, 보안 통합 역조건 1/1 이상 통과, 기존 PostgreSQL 통합 14/14 통과, npm 취약점 0건, Secret 패턴 0건, Web/API 필수 헤더 통과

FAILURE CRITERIA: 과대·변조 토큰 수락, 악성 Origin 쓰기 허용, 비 JSON 본문 수락, 64KiB 초과 처리, 신뢰 헤더 운영 활성화, 실제 Secret 발견, 기존 학습 회귀

OUTPUTS: 보안 설계서, 구현·테스트, 자동 감사기, QA JSON, Phase 24 보고서, 상태·로드맵 갱신

VERIFICATION: `npm.cmd run test:productization:security`, PostgreSQL 통합 테스트, HTTP 역조건, `npm.cmd audit --json`, `npm.cmd run test:productization`, `git diff --check`

MEMORY UPDATE: 적용 경계, 테스트 수, 헤더 수, npm 감사 결과, 외부 차단 조건만 남기고 토큰·Secret·개인정보는 남기지 않는다.

STOP CONDITION: 로컬 자동 보안 QA와 전체 회귀가 통과하면 종료한다. 외부 HTTPS·IdP·WAF·실트래픽 검증은 권한·구성 전까지 차단 상태로 남긴다.
