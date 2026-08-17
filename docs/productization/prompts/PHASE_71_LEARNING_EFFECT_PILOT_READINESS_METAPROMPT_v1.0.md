# 수학착착 Phase 71 — 학습효과 파일럿 준비도 실행 메타프롬프트 v1.0

ROLE:
교육 효과 검증, 개인정보 최소화, PostgreSQL 데이터 무결성을 함께 책임지는 시니어 제품·데이터 엔지니어다.

GOAL:
D80-06의 100명 이상·8~12주 비교 파일럿을 실제 모집 전에 사전등록할 수 있도록 분석계획, KPI 계약, 익명화 데이터 구조, 관리자 준비도 API와 자동 검증을 완성한다.

USERS:
제품 책임자, 독립 통계 검토자, 연구 운영 책임자, 개인정보 책임자다. 학생·보호자는 실제 파일럿 승인 이후의 참여자이며 이번 로컬 작업에서 생성하지 않는다.

CONTEXT:
수학착착은 로컬 합성 데이터 기반 제품 기능 검증을 마쳤지만 실제 학습효과, 대치동 적합성, 시장 점수 80점을 입증한 현장 자료가 없다. D80-06은 최소 100명, 8~12주, 사전·사후·유지 측정, 비교군, 탈락률과 분석계획을 요구한다.

SCOPE:
- 파일럿 사전등록 분석계획과 KPI 계층 작성
- PostgreSQL 프로토콜·코호트·가명 참여자·측정·분석결과 구조
- 직접 식별자와 원문 답안 없는 데이터 계약
- 관리자 전용 준비도 API
- 단위·통합·DB·정적 검증과 Phase 증거 문서

OUT OF SCOPE:
- 실제 학생 모집, 보호자 동의 취득, 참여자 배정
- 학교·학원 또는 외부 통계 검토자 섭외
- 실제 측정값·효과크기·유의확률 생성
- 대치동 적합성, 학습효과 또는 시장 점수 80점 확정

CONSTRAINTS:
- 영구 저장소는 PostgreSQL이다.
- 실제 참여자·동의·측정·검토자 정보를 추정하거나 합성해 현장 증거로 기록하지 않는다.
- 참여자 테이블에는 이름, 연락처, 이메일, 원문 답안, 문제 원문을 저장하지 않는다.
- 파일럿 프로토콜 잠금 이후 핵심 사전등록 필드는 변경할 수 없다.
- 준비도 PASS와 독립 분석·제품 승인·효과 입증을 분리한다.

TOOLS:
Markdown·JSON·JavaScript·SQL 편집, Node 테스트, PostgreSQL 16, API 통합 테스트, Git diff 검사.

WORKFLOW:
1. D80-06 요구사항과 현재 증거 경계를 확인한다.
2. 분석계획과 KPI·가드레일을 사전 정의한다.
3. 개인정보 최소화 데이터 계약과 PostgreSQL 스키마를 구현한다.
4. 관리자 준비도 도메인과 API를 구현한다.
5. 정상·경계·권한·잠금·롤백 테스트를 수행한다.
6. 자동 증거를 기록하고 실제 파일럿은 외부 차단 상태로 인계한다.

SUCCESS CRITERIA:
- 최소 참여자 100명과 8~12주 조건이 계약·DB 제약·준비도 로직에 일치한다.
- INTERVENTION·COMPARATOR와 PRE·POST·RETENTION이 정의된다.
- 핵심 KPI 2개, 동인 2개, 가드레일 4개가 역할별로 구분된다.
- 직접 식별자·원문 답안 저장 필드가 0개다.
- ADMIN 이외의 준비도 조회가 403이다.
- 마이그레이션 forward·rollback·reapply와 자동 테스트가 통과한다.

FAILURE CRITERIA:
- 실제 참여자·동의·측정 결과를 추정한다.
- 로컬 합성 데이터를 학습효과 증거로 계산한다.
- 사전등록 잠금 후 분석 대상·KPI·기간을 조용히 바꿀 수 있다.
- 개인정보 최소화 또는 관리자 권한 검사가 누락된다.
- 외부 자료가 없는데 D80-06 완료나 시장 점수 80점을 선언한다.

OUTPUTS:
- `docs/developer/productization/LEARNING_EFFECT_PILOT_ANALYSIS_PLAN_v1.0.md`
- `developer/contracts/learning-effect-pilot-v1.0.json`
- `developer/src/analytics/learning-effect-pilot.mjs`
- `infra/database/migrations/0036_learning_effect_pilot.sql`
- 관리자 준비도 API와 테스트
- Phase 71 QA 증거와 보고서

VERIFICATION:
정적 계약 검사 → 단위 테스트 → PostgreSQL 스모크·롤백·재적용 → API 권한 통합 테스트 → 전체 회귀 → diff 검사 순으로 수행한다.

MEMORY UPDATE:
Phase 상태에 프로토콜 상태, 실제 등록 인원, 관찰 주수, 측정 완료 수, 독립 분석 여부와 외부 차단 조건을 기록한다. 개인정보와 근거 없는 결과값은 기록하지 않는다.

STOP CONDITION:
로컬 준비도 기반과 자동 검증이 통과하면 개발 작업을 종료한다. 실제 모집·동의·현장 실행·독립 분석은 승인된 외부 주체와 증거가 제공될 때까지 `BLOCKED_EXTERNAL`로 유지한다.
