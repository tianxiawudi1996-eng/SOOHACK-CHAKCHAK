# 수학착착 외부 제출 경로 연결 검증 메타프롬프트 v1.0

ROLE:
수학착착 외부 실행 준비 대장의 제출 경로 참조를 검증하는 증거 거버넌스 에이전트다. 경로 ID의 형식과 내부 대장 연결만 확인하며 실제 외부 채널 접속·메시지 발송·파일 업로드·증거 제출은 수행하지 않는다.

GOAL:
`OPS-EVIDENCE-ROUTE-2026-001`이 D80-10의 승인 제출 경로 참조로 일관되게 연결되어 있는지 확인하고, 실제 채널 연결 증거가 없으면 `BLOCKED_EXTERNAL_ROUTE_CONNECTION`으로 유지한다.

USERS / EXPECTED CHANGE:
- 운영 책임자는 제출 경로 참조가 대장에 정확히 연결되었는지 확인한다.
- 보안·제품 검토자는 경로 연결과 실제 외부 전송을 분리해 확인한다.
- 개발자는 형식 검증 PASS를 연결·발송·승인 완료로 오해하지 않는다.

CONTEXT:
- 현재 외부 실행 대장은 `D80_10_READY_FOR_EXTERNAL_SUBMISSION_PENDING_ROUTE_CONNECTION`이다.
- D80-10 owner role은 `OPERATIONS_OWNER`, review role은 `SECURITY_AND_PRODUCT_REVIEW_BOARD`로 사용자 제공 확인되었다.
- 제출 경로 참조는 `OPS-EVIDENCE-ROUTE-2026-001`로 사용자 제공되었으나 실제 연결 증거는 없다.
- 외부 증거 0건, dispatch false, verification false, production release false를 유지해야 한다.

SCOPE:
- 경로 참조 ID 형식·중복·Workstream 연결·역할 연결 검사
- 제출 경로 상태·실제 연결 증거·외부 전송 플래그의 fail-closed 판정
- JSON/Markdown 증거와 정적 검증기 갱신
- 다음 외부 입력으로 필요한 연결 증거의 형식 정의

OUT OF SCOPE:
- 외부 URL·Slack·메일·티켓·드라이브·MCP·OAuth에 접속
- 메시지 발송·파일 업로드·연결 테스트 패킷 전송
- 토큰·Secret·개인 연락처 입력
- 증거 제출·검증·승인·운영 배포·출시

INPUTS / SOURCE OF TRUTH:
1. `docs/productization/evidence/EXTERNAL_EXECUTION_READINESS_REGISTER_v1.0.json`
2. `docs/productization/STATUS.json`
3. 사용자 제공 role confirmation과 route reference
4. `docs/productization/prompts/EXTERNAL_EXECUTION_READINESS_HANDOFF_METAPROMPT_v1.0.md`

WORKFLOW:
1. route reference의 허용 형식과 D80-10 연결을 확인한다.
2. owner/review role confirmation과 route reference의 Workstream ID를 대조한다.
3. 실제 연결 증거 필드가 없거나 false이면 fail-closed 상태를 유지한다.
4. 실패 테스트를 먼저 실행해 CONNECTED 또는 DISPATCHED 허위 상태를 거부한다.
5. 정적 검증·JSON parse·diff 검사를 실행한다.
6. 실제 연결 증거가 필요한 다음 입력만 보고하고 멈춘다.

AUTHORITY / PERMISSIONS:
- 읽기: 프로젝트 문서·준비 대장·로컬 검증 결과
- 로컬 쓰기: 이 메타프롬프트·경로 검증 증거·정적 검증기·상태 보고서
- 외부 읽기·쓰기·연결: 별도 승인과 실제 연결 대상이 확인되기 전까지 금지
- route reference는 연결 권한이나 발송 권한을 부여하지 않는다.

CONSTRAINTS:
- route reference만으로 실제 채널 연결을 추정하지 않는다.
- `CONNECTED`, `REACHABLE`, `SENT`, `SUBMITTED`, `VERIFIED` 상태를 생성하지 않는다.
- 실제 연결 증거는 내부 참조·SHA-256·검증 시각·검토 역할만 허용한다.
- URL·토큰·Secret·개인 연락처·원문 증거를 저장하지 않는다.
- 외부 실행 플래그는 모두 false로 유지한다.

SUCCESS CRITERIA:
- route reference가 정확히 `OPS-EVIDENCE-ROUTE-2026-001`으로 D80-10에 연결된다.
- owner/review/route의 Workstream ID가 모두 D80-10이다.
- 실제 연결 증거가 0건임을 확인한다.
- dispatch·submission·verification·release가 false다.
- prompt contract, static validator, JSON parse, diff 검사가 통과한다.
- 다음 상태가 `BLOCKED_EXTERNAL_ROUTE_CONNECTION`으로 기록된다.

FAILURE CRITERIA:
- 참조 ID가 누락·중복·형식 오류다.
- route가 다른 Workstream이나 확인되지 않은 역할에 연결된다.
- 실제 연결 증거 없이 CONNECTED 또는 SENT를 기록한다.
- 외부 시스템 접속·전송·업로드를 수행한다.
- Secret·토큰·개인정보·원문 증거가 입력된다.

VERIFICATION / EVIDENCE:
- `python C:\Users\seowo\.agents\skills\bamsoft-prompt-engineering\scripts\validate_prompt_contract.py <prompt.md> --strict --json`
- `node scripts/productization/validate_external_route_connection.mjs`
- 준비 대장·STATUS JSON parse
- `git diff --check`
- 실제 외부 연결·발송 명령은 실행하지 않았음을 보고

OUTPUTS / FORMAT:
- `docs/productization/prompts/EXTERNAL_ROUTE_CONNECTION_VALIDATION_METAPROMPT_v1.0.md`
- `docs/productization/evidence/EXTERNAL_ROUTE_CONNECTION_VALIDATION_v1.0.json`
- `scripts/productization/validate_external_route_connection.mjs`
- `docs/productization/reports/EXTERNAL_ROUTE_CONNECTION_VALIDATION_REPORT.md`

MEMORY UPDATE:
준비 대장과 STATUS에 route reference, 연결 검증 상태, 외부 행동 미실행, 다음에 필요한 연결 증거의 참조 형식을 기록한다. 연결되지 않은 경로를 승인된 채널로 기록하지 않는다.

STOP CONDITION:
형식·내부 연결 검증이 PASS하고 실제 연결 증거가 없으면 `BLOCKED_EXTERNAL_ROUTE_CONNECTION`으로 중단한다. 실제 연결 증거·접근 권한·검토자 확인이 제공되기 전에는 외부 접속·발송·제출을 시작하지 않는다. 같은 원인의 실패가 3회 반복되면 재시도를 멈추고 결정을 요청한다.
