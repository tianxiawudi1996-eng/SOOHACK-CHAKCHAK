# 수학착착 Phase 70 — 교사·학부모 운영 콘솔 실행 메타프롬프트 v1.0

ROLE: 교육 제품·PostgreSQL·권한·프론트엔드를 연결하는 시니어 제품화 에이전트

GOAL: Phase 69의 증거 기반 학년·트랙 공식 경로를 교사가 배정·개입하고 보호자가 안전한 집계 리포트로 확인할 수 있게 한다.

USERS: 담당 학생과 연결된 교사, 활성 보호자 연결과 학습 리포트 동의를 가진 보호자

CONTEXT: 12개 학년, 4개 트랙, 48개 계획, 288개 공식 배정과 학생 증거 게이트가 PostgreSQL과 API에 구현되어 있다. 현재 교사 역할과 최종 사용자 운영 화면은 없다.

SCOPE: 교사·학생 연결, 보호자 동의 검증, 과제 생성·상태 전이, 개입 기록, 집계 리포트, 8개 언어 운영 콘솔, 감사 로그

OUT OF SCOPE: 실제 학교·학원 계정 연동, 문자·메신저 발송, 결제, 성적 향상 보장, 보호자의 과제 변경, 원답·문제 원문 노출

CONSTRAINTS: PostgreSQL 영구 저장, 계층별 권한 재검사, 짧은 트랜잭션, 매개변수 SQL, 정답·PII 제외, 외부 현장 운영 추정 금지

TOOLS: JSON·Markdown·HTML·CSS·JavaScript, PostgreSQL 16, Node 테스트, Docker 로컬 스테이징, 브라우저 검증

WORKFLOW: 계약 → DB migration/rollback/seed/smoke → 도메인 단위 테스트 → Repository/API → 운영 UI → 통합·브라우저·전체 회귀 → 증거·보고서

SUCCESS CRITERIA: 교사 연결 1/1, 보호자 연결·동의 1/1, 교사 과제 생성·조회·상태 전이 PASS, 개입 기록 PASS, 보호자 읽기 전용 PASS, 역권한 403 PASS, 원답 노출 0, 모바일 가로 넘침 0

FAILURE CRITERIA: 연결되지 않은 학생 접근, 보호자의 쓰기, 동의 없는 리포트, 답안·문제 원문·직접 식별정보 노출, 중복 과제, 감사 로그 누락

OUTPUTS: migration 0035, seed 0011, API·도메인·UI·테스트, Phase 70 QA와 보고서

VERIFICATION: 구문 → 단위 → DB forward/rollback/reapply/smoke → API → 웹 E2E → 보안·운영·스테이징 → diff

MEMORY UPDATE: STATUS phase 70, D80 체인, 외부 차단과 다음 Phase 기록

STOP CONDITION: 로컬 운영 콘솔 검증 완료 또는 동일 차단 3회. 실제 기관 운영·현장 효과는 승인된 외부 증거 전까지 BLOCKED_EXTERNAL이다.
