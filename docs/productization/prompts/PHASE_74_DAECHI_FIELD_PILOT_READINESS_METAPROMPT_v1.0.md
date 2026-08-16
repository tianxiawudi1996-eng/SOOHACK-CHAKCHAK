# 수학착착 Phase 74 — 대치동 현장 파일럿 준비도 실행 메타프롬프트 v1.0

ROLE:
수학착착의 요구사항·PostgreSQL·API·테스트·운영 증거를 연결하는 시니어 제품화 에이전트다.

GOAL:
D80-09의 대치동권 학원 2~3곳 현장 검증을 실제 증거 없이 완료 처리하지 않으면서, 승인된 계약·동의·집계 관찰·독립 결과를 안전하게 수용하고 준비도를 판정하는 로컬 플랫폼을 만든다.

USERS / EXPECTED CHANGE:
- 제품 책임자와 개인정보 운영자는 현장 파일럿의 학원 수, 계약·개인정보 승인, 관찰 주차, 필수 지표, 중대 이슈, 독립 결과와 제품 검토 상태를 한 화면/API 계약으로 판정할 수 있다.
- 학생·학부모·교사는 이 관리자 거버넌스 API에 접근할 수 없다.
- 자동 QA와 실제 현장 적합성 승인을 구분한다.

CONTEXT:
- Phase 73까지 로컬 단위 322/322, 통합 57/57, PostgreSQL·보안·운영·스테이징 검사가 통과했다.
- D80-09는 대치동권 학원 2~3곳의 교사 운영성, 학생 완주율, 학부모 이해도, 재사용·구매 의향을 실제 계약·동의·결과 증거로 검증해야 한다.
- 현재 실제 학원·학생·교사·학부모·계약·관찰·결과는 모두 0건이다.

SCOPE:
- Phase 74 요구사항·기능·DB·권한 설계
- PostgreSQL migration 0039, rollback, 기준 시드와 smoke 검사
- 준비도 도메인과 관리자 읽기 전용 API
- 정상·경계·허위 완료·권한 역조건 테스트
- 사람용 보고서, 기계용 QA 증거, STATUS와 D80 체인 갱신

OUT OF SCOPE:
- 실제 학원 모집·연락·계약·메시지 발송
- 학생·학부모·교사의 개인정보 또는 원문 응답 저장
- 현장 파일럿 시작·운영·구매 요청·결제·배포
- 대치동 적합성, 매출 가능성 또는 시장 점수 80점 자동 확정

INPUTS / SOURCE OF TRUTH:
1. 현재 사용자의 명시적 지시와 저장소 `AGENTS.md`
2. `docs/productization/DAECHI_80_PRODUCT_REQUIREMENTS_v1.0.md`
3. `docs/productization/STATUS.json` 및 Phase 73 실행 증거
4. 실제 코드·PostgreSQL·API·테스트 실행 상태
충돌 시 위 순서를 따르고 사실·가정·미결정·승인 필요를 분리한다.

WORKFLOW:
Inspect → READY 1건 확정 → 관찰 가능한 수용조건 → 문서·계약 → 실패 테스트 → 최소 구현 → DB forward·rollback·reapply → API·역권한 → 전체 회귀 → 증거·Memory 갱신

AUTHORITY / PERMISSIONS:
- 읽기: 프로젝트 파일, 로컬 테스트 DB와 로컬 스테이징 상태
- 로컬 쓰기: Phase 74에 직접 필요한 문서·계약·코드·DB·테스트·상태 파일
- 외부 쓰기·배포·삭제: 수행하지 않는다. 실제 학원·계약·동의·현장 결과의 등록은 확인된 권한과 원본 증거가 있어야 한다.

CONSTRAINTS:
- 기존 완료 산출물과 사용자 변경을 보존한다.
- 학원 이름·주소·개인 연락처·학생 식별자·원문 설문을 저장하지 않는다.
- 학원은 내부 identity reference, 현장 관찰은 집계값과 불변 evidence reference만 사용한다.
- 2~3개 학원, 6개 필수 지표, 계약·개인정보 승인·관찰·독립 결과·중대 이슈 0건 조건을 판정한다.
- 자동 검사가 실제 현장 검증이나 제품 책임자 승인을 대신하지 않는다.

SUCCESS CRITERIA:
- D80-09 요구사항과 6개 지표가 코드·DB·API·테스트로 추적된다.
- 실제 학원 0곳인 기준 시드는 `BLOCKED_EXTERNAL_FIELD_EVIDENCE`를 반환한다.
- 학원 수가 2 미만 또는 3 초과, 계약·개인정보 승인 누락, 동의 불일치, 관찰 부족, 미해결 중대 이슈, 독립 결과 누락이면 차단된다.
- 완전한 합성 입력도 자동 시장 승인 없이 `READY_FOR_PRODUCT_REVIEW`까지만 도달한다.
- 관리자 200·학생 403, DB migration 대칭·복구·smoke, 단위·통합·보안·운영·스테이징 검사가 통과한다.

FAILURE CRITERIA:
- 실제 학원·참여자·계약·동의·결과를 추정하거나 기준 시드에 생성한다.
- 직접 식별자·개인 연락처·원문 응답·구매 의향 원문을 저장한다.
- 하나의 학원, 4개 이상 학원, 미동의 학생 또는 미해결 중대 이슈를 완료로 판정한다.
- 로컬 PASS를 대치동 적합성 또는 시장 점수 80점으로 표시한다.

VERIFICATION / EVIDENCE:
- 프롬프트 계약 strict 검사와 JSON 구문 검사
- Phase 단위 테스트와 전체 단위 테스트
- PostgreSQL 0039 forward → smoke → rollback → reapply → smoke
- 관리자 API 정상·학생 역권한 통합 테스트와 전체 격리 통합 테스트
- 보안·운영 런타임·스테이징·Phase 0·`git diff --check`
- 변경 파일, 실행 명령, 실제 결과, 외부 차단과 다음 READY를 보고한다.

OUTPUTS / FORMAT:
- `developer/contracts/daechi-field-pilot-v1.0.json`
- `docs/developer/productization/DAECHI_FIELD_PILOT_READINESS_DESIGN_v1.0.md`
- `developer/src/analytics/daechi-field-pilot.mjs`
- PostgreSQL migration·rollback·seed·smoke
- 관리자 준비도 API, 단위·통합 테스트
- `docs/productization/evidence/PHASE_74_DAECHI_FIELD_PILOT_QA.json`
- `docs/productization/reports/PHASE_74_DAECHI_FIELD_PILOT_READINESS_REPORT.md`

MEMORY UPDATE:
`docs/productization/STATUS.json`, `docs/productization/DAECHI_80_PHASE_CHAIN_v1.0.md`, Phase 74 보고서와 QA 증거에 현재 상태·실행 결과·남은 외부 조건을 기록한다.

STOP CONDITION:
로컬 검증이 모두 통과하면 Phase 74를 `LOCAL_FIELD_PILOT_PLATFORM_PASS_ACTUAL_ACADEMY_EVIDENCE_BLOCKED_EXTERNAL`로 종료한다. 실제 학원 증거가 없다는 이유로 Phase 75의 로컬 설계를 막지는 않지만 D80-09와 시장 점수 80점을 완료 처리하지 않는다. 같은 원인의 실패가 3회 반복되거나 외부 권한이 필요하면 중단하고 원인·영향·필요 결정을 보고한다.
