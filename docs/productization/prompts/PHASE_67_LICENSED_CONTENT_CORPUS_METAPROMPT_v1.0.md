# 수학착착 Phase 67 — 합법 전문 콘텐츠 코퍼스 실행 메타프롬프트 v1.0

```text
ROLE:
수학 콘텐츠 책임자, PostgreSQL 데이터 설계자, 저작권·품질 통제 엔지니어

GOAL:
30,000개 전문 수학 문항을 합법적 사용권, 완전한 태그, 이중 수학 검수, 권리 검수와 함께 축적할 수 있는 fail-closed 코퍼스 기반을 구축한다.

USERS:
수학 콘텐츠 편집자, 수학 검수자, 저작권 담당자, 교사, 제품 운영자

CONTEXT:
Phase 66의 네 전문 트랙에 공급할 문항이 필요하지만 현재 저장소에는 30,000개 실제 라이선스 문항과 외부 검수 증거가 없다.

SCOPE:
코퍼스 계약, PostgreSQL migration/rollback, 라이선스·batch·revision·review·finding 모델, 게시 trigger, 준비도 도메인, 관리자 조회 API, 단위·통합·DB 검사

OUT OF SCOPE:
저작권 미확인 문항 수집, 웹 스크래핑, 검토자 실명 추정, 합성 문항을 실제 목표로 계산, 실제 학습효과·대치동 적합성 주장

CONSTRAINTS:
PostgreSQL 16, 매개변수 SQL, FK 인덱스, 부분·복합 인덱스, keyset pagination, 검토자 2명 고유성, 계약 원문·연락처 미저장, 자동 게시 금지

TOOLS:
apply_patch, Node test runner, PostgreSQL Docker, migration rollback/reapply, API integration tests, security scan, git diff

WORKFLOW:
계약 정의 → DB migration → 게시 게이트 → 준비도 집계 → 관리자 API → 단위·통합·롤백 테스트 → Phase 보고

SUCCESS CRITERIA:
테이블 6/6, rollback 6/6, 게시 게이트 5/5, 외래키 인덱스 100%, 빈 코퍼스 fail-closed, 학생 API 접근 403, 실제 문항 수 0을 정직하게 보고

FAILURE CRITERIA:
무허가 문항 게시, 단일 검토자 통과, 계약 만료 무시, 오류가 열린 문항 게시, 합성 데이터를 30,000개로 계산, 원문 계약·개인정보 저장

OUTPUTS:
계약 JSON, DB migration/rollback, 도메인·API, 테스트, QA 증거, Phase 보고서

VERIFICATION:
구문·단위 → PostgreSQL forward → 게시 역조건 → rollback → reapply → API 통합 → 보안·diff

MEMORY UPDATE:
STATUS.json Phase 67에 로컬 기반 완료와 실제 라이선스 문항 0/30000 차단을 기록한다.

STOP CONDITION:
로컬 코퍼스 기반이 검증되면 종료한다. 실제 권리·콘텐츠·검수 증거 없이는 D80-02 완료나 시장 80점을 선언하지 않는다.
```
