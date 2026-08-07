# 수학착착 Phase 25 — 학습 품질 KPI·개인정보 최소화 분석 실행 메타프롬프트 v1.0

ROLE: 학습과학·제품분석·PostgreSQL·개인정보 보호를 연결하는 시니어 분석 개발자

GOAL: 공식 학습의 완료·적용·지속 회상을 측정하되 원답과 직접 식별자를 새로 저장하지 않는 의사결정용 품질 지표를 구현한다.

USERS: 학습자, 제품 책임자, 학습 설계자, 개인정보·운영 담당자

CONTEXT: 공식 세션·적용 숙달·회상 시도·힌트·캐릭터 협업 증거가 PostgreSQL에 이미 존재한다. 현재 검증 데이터는 로컬 합성이며 운영 기준선은 없다.

SCOPE: Primary KPI 3개, Driver 2개, 데이터 충분성, 임시 목표, 학생 소유권 API, 이벤트 속성 허용목록, 개인정보 역조건, 단위·PostgreSQL 통합 검사

OUT OF SCOPE: 광고 추적, 순위화, 원답 복제, 새 추적 쿠키, 승인 없는 코호트 비교, 운영 목표 확정, 외부 분석 서비스 전송

CONSTRAINTS: 기존 학습 원천을 읽기 전용 집계한다. 분모 0은 null이다. 학생·사용자 ID와 원답·문제 본문·토큰·이메일·IP를 분석 응답 및 이벤트 속성에 넣지 않는다.

TOOLS: Node.js, PostgreSQL 16, API 통합 테스트, 개인정보 정적 감사, 기존 제품화 감사기, Git diff/status

WORKFLOW: 원천 조사 → 후보 지표 → Primary/Driver/Guardrail 선택 → 계산 계약 → 소유권 API → 개인정보 허용목록 → 단위·통합 → 전체 회귀 → 보고

SUCCESS CRITERIA: KPI 3+2 정의, 단위 62개 이상, 개인정보 집계 API 1/1, PostgreSQL 전체 통합 16/16, 직접 식별자·원답 노출 0, 전체 Phase 0~25 PASS

FAILURE CRITERIA: 분모 0을 0%로 표시, 다른 학생 조회 허용, 원답·문제 본문·식별자 반환, 합성 데이터로 운영 목표 확정, 기존 학습 회귀

OUTPUTS: KPI 설계서, 집계 모듈·Repository·API, 이벤트 허용목록, 단위·통합 테스트, 자동 감사기, QA JSON, Phase 보고서

VERIFICATION: `npm.cmd run test:productization:learning-quality`, `node --test --test-concurrency=1 tests/integration/*.test.mjs`, `npm.cmd run test:productization`, `git diff --check`

MEMORY UPDATE: 지표 정의·분모·임시 목표·원천·표본 충분성·개인정보 제외 항목·검증 결과만 남긴다.

STOP CONDITION: 로컬 집계·권한·개인정보·전체 회귀가 통과하면 종료한다. 운영 목표와 코호트 분석은 실데이터·동의·최소 집단 기준 승인까지 차단한다.
