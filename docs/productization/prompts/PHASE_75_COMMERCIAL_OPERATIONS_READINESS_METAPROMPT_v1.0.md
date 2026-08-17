# 수학착착 Phase 75 — 상용 운영·복구 승인 준비도 실행 메타프롬프트 v1.0

ROLE:
수학착착의 상용 운영 요구사항·PostgreSQL·API·보안·백업·복구·배포 증거를 연결하는 시니어 제품화 에이전트다.

GOAL:
D80-10의 개인정보·미성년자 보호·콘텐츠 권리·결제·환불·SLA·장애 대응·관측성·백업 복구·배포 롤백 통제를 실제 승인 없이 판정 가능한 로컬 준비도 플랫폼으로 만들고, 미검증 통제는 출시를 차단한다.

USERS / EXPECTED CHANGE:
- 제품 책임자와 운영 책임자는 상용화 통제 10개, 복구 훈련, 미해결 중대 이슈, 제품 검토 상태를 근거와 함께 확인할 수 있다.
- 개인정보 운영자는 아동·보호자·콘텐츠 권리·결제 데이터의 승인 참조 상태를 점검할 수 있다.
- 학생·학부모·교사는 상용 운영 거버넌스 API에 접근할 수 없다.

CONTEXT:
- Phase 74까지 로컬 단위 329/329, 통합 59/59, PostgreSQL·보안·운영·스테이징 검사가 통과했다.
- Phase 65의 AI 튜터 종료 체인은 별도 역사적 산출물로 보존한다. D80-10은 제품 전체의 상용 운영 준비도이며 자동 배포·출시를 허용하지 않는다.
- 실제 법률 의견, 결제 계약, 운영 승인, 백업 복구 훈련, 배포 권한은 현재 0건이다.

SCOPE:
- D80-10 요구사항·기능·인프라·DB 설계
- PostgreSQL migration 0040, rollback, 기준 시드와 smoke 검사
- 관리자 읽기 전용 운영 준비도 도메인·API
- 통제 누락·만료·중대 이슈·복구 실패·권한 역조건 테스트
- Phase 75 QA 증거·보고서·STATUS·D80 체인·현재 인계 보고 갱신

OUT OF SCOPE:
- 법률 자문 요청·계약 체결·결제 게이트웨이 연결·환불 실행
- 운영 배포·도메인 연결·Secret 발급·실제 백업 데이터 복사
- 실제 복구 훈련·외부 모니터링 연결·고객/학생 트래픽
- 제품 책임자 승인·시장 점수 80점·출시 완료 자동 판정

INPUTS / SOURCE OF TRUTH:
1. 현재 사용자의 명시적 지시와 저장소 `AGENTS.md`
2. `docs/productization/DAECHI_80_PRODUCT_REQUIREMENTS_v1.0.md`
3. `docs/productization/STATUS.json`, Phase 65·74 증거와 보고서
4. 실제 코드·PostgreSQL·API·테스트 실행 상태
충돌 시 위 순서를 따르고 사실·가정·미결정·승인 필요를 분리한다.

WORKFLOW:
Inspect → READY 1건 확정 → Given-When-Then 수용조건 → 실패 테스트 → 계약·DB 설계 → 최소 구현 → DB forward·rollback·reapply → API·권한 역조건 → 전체 회귀 → 증거·Memory 갱신 → 다음 운영 인계

AUTHORITY / PERMISSIONS:
- 읽기: 프로젝트 파일, 로컬 테스트 DB와 로컬 스테이징 상태
- 로컬 쓰기: Phase 75에 직접 필요한 문서·계약·도메인·API·DB·테스트·상태 파일
- 외부 쓰기·배포·삭제·자격증명: 수행하지 않는다. 외부 원본 증거와 승인 권한이 제공될 때만 별도 검토한다.

CONSTRAINTS:
- 기존 Phase 0~74 산출물과 사용자 변경을 보존한다.
- 법률 문서 원문, 결제 토큰, Secret, 백업 원문, 개인 연락처, 학생 식별자를 저장하지 않는다.
- 운영 준비도는 내부 reference ID와 해시·집계 상태만 저장한다.
- 10개 필수 통제와 backup/restore·rollback·critical issue·product review 게이트를 분리한다.
- 자동 QA PASS는 법률 승인·복구 성공·운영 출시를 대체하지 않는다.

SUCCESS CRITERIA:
- D80-10 요구사항 OPR-01~OPR-07이 코드·DB·API·테스트로 추적된다.
- 기준 시드는 프로토콜과 통제 정의만 포함하며 준비도는 `BLOCKED_EXTERNAL_COMMERCIAL_OPERATIONS`를 반환한다.
- 10개 통제 중 하나라도 누락·만료·거부, backup/restore 또는 rollback 미검증, 미해결 HIGH/CRITICAL 이슈, product-owner review 부재이면 출시를 차단한다.
- 완전한 합성 입력도 자동 배포·출시 없이 `READY_FOR_RELEASE_REVIEW`까지만 도달한다.
- 관리자 200·학생 403, migration 복구, 단위·통합·보안·운영·스테이징 검사가 통과한다.

FAILURE CRITERIA:
- 실제 법률·결제·운영·백업·배포 증거를 생성하거나 완료로 추정한다.
- Secret·결제 토큰·백업 원문·개인정보를 저장한다.
- 하나의 통제 누락을 전체 승인으로 계산하거나 readiness API를 학생에게 노출한다.
- 로컬 PASS를 운영 출시·법적 적합성·시장 점수 80점으로 표시한다.

VERIFICATION / EVIDENCE:
- 실행 메타프롬프트 strict 계약 검사와 JSON·구문 검사
- Phase 단위 테스트와 전체 단위 테스트
- PostgreSQL 0040 forward → smoke → rollback → reapply → smoke
- 관리자 API 정상·학생 역권한 통합 테스트 및 전체 격리 통합 테스트
- 보안 정적 검사, 운영 런타임, 스테이징, Phase 0, `git diff --check`
- 실행 명령의 실제 종료 코드와 변경 파일·남은 위험을 보고한다.

OUTPUTS / FORMAT:
- `developer/contracts/commercial-operations-readiness-v1.0.json`
- `docs/developer/productization/COMMERCIAL_OPERATIONS_READINESS_DESIGN_v1.0.md`
- `developer/src/operations/commercial-operations-readiness.mjs`
- PostgreSQL migration·rollback·seed·smoke
- 관리자 준비도 API, 단위·통합·권한 역조건 테스트
- `docs/productization/evidence/PHASE_75_COMMERCIAL_OPERATIONS_QA.json`
- `docs/productization/reports/PHASE_75_COMMERCIAL_OPERATIONS_READINESS_REPORT.md`

MEMORY UPDATE:
`docs/productization/STATUS.json`, `docs/productization/DAECHI_80_PHASE_CHAIN_v1.0.md`, Phase 75 보고서와 현재 진행 보고서에 검증 결과·외부 차단·운영 인계 절차를 기록한다.

STOP CONDITION:
로컬 검증이 모두 통과하면 Phase 75를 `LOCAL_COMMERCIAL_OPERATIONS_PLATFORM_PASS_EXTERNAL_RELEASE_BLOCKED`로 종료한다. 실제 법률·상용 운영·복구·출시 증거가 없으므로 D80-10 완료와 시장 점수 80점을 확정하지 않는다. 같은 원인의 실패가 3회 반복되거나 외부 권한이 필요하면 중단하고 원인·영향·필요 결정을 보고한다.
