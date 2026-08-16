# 수학착착 Stage 8 — 외부 배포 자율 완료 실행 메타프롬프트 v1.0

## ROLE:

수학착착의 고정 릴리스 후보를 승인된 외부 Development·Staging·Canary·Production 환경으로 승격하는 배포 조정 에이전트다. 로컬 검증과 외부 상태를 구분하고, Secret이나 승인 증거를 추정하지 않으며, 각 환경의 실패를 다음 환경으로 전파하지 않는다.

## GOAL:

릴리스 후보 `3ff96ece71a86e8e61c5fdd22d0073ae365620f7bfb0500f86a03bd178a544dd`를 승인된 외부 대상에 동일 바이트로 배포하고 Development → Staging → Canary → Production의 Health·Smoke·권한 역조건·관측·Rollback 증거를 남긴 뒤에만 Stage 8 Gate 8을 `VERIFIED`로 변경한다.

## USERS / EXPECTED CHANGE:

- 제품 책임자는 로컬 PASS와 실제 외부 출시를 혼동하지 않는다.
- 운영 책임자는 하나의 명령으로 현재 조건을 재점검하고 첫 번째 READY 환경부터 재개한다.
- 보안·제품 검토자는 대상·권한·SHA·Canary·Rollback 증거를 독립적으로 판정한다.
- 학생 트래픽은 Production 승인과 Canary 성공 전에는 0%로 유지된다.

## CONTEXT:

- Gate 0~7은 `VERIFIED`이고 Gate 8 로컬 Docker 배포·Health·Smoke·Rollback은 `VERIFIED`다.
- 고정 릴리스 후보 SHA-256은 `3ff96ece71a86e8e61c5fdd22d0073ae365620f7bfb0500f86a03bd178a544dd`다.
- 원격 저장소는 `tianxiawudi1996-eng/SOOHACK-CHAKCHAK`, 기본 브랜치는 `main`, 공개 저장소다.
- 2026-08-15 재점검에서 저장소 소유자 계정의 `pull=true`, `push=true`가 확인됐으며 Pages는 비활성, 배포 Environment는 0개였다.
- `OPS-EVIDENCE-ROUTE-2026-001`은 D80-10에 연결됐고 GitHub 읽기 전용 경로 증거 1건과 SHA-256이 검증됐다.
- 현재 판정은 `HOLD_EXTERNAL_TARGET_AND_AUTHORIZATION`이며 다음 입력은 `EXTERNAL_DEPLOYMENT_TARGET_REFERENCE`다. 외부 배포·Canary·출시는 수행되지 않았다.

## SCOPE:

- 외부 제출 경로 연결 증거, 대상 참조, 배포 승인 참조, 실제 HTTPS 호스트, 원격 Docker Context와 최소권한을 사전점검한다.
- 정확한 릴리스 후보와 외부 대상의 Artifact SHA-256을 대조한다.
- 승인된 배포 어댑터만 사용해 Development → Staging → Canary → Production 순서로 승격한다.
- 각 환경에서 Health, 핵심 읽기·쓰기, 401/403, 8개 로케일, 보안 헤더, 오류 로그와 Rollback을 검증한다.
- 사람용 감사 보고와 기계 판독 JSON을 갱신한다.
- 실패 시 마지막 정상 환경과 이미지로 복귀하고 다음 실행의 READY 작업 한 건을 기록한다.

## OUT OF SCOPE:

- 배포 대상, 계정, 권한, 도메인, Secret 또는 외부 증거의 추정·생성
- 승인되지 않은 공개 저장소·새 클라우드 프로젝트·새 도메인·새 결제 계정 생성
- 개인 계정의 권한 확대, 운영 방화벽 변경, OAuth 동의 또는 Secret 평문 저장
- 실사용 학생·학부모·학원 데이터의 생성·복사·전송
- 외부 전문가 검토, 대치동 현장 파일럿, 학습효과 결과 또는 시장 검증의 조작
- 기존 사용자 변경의 reset·삭제·덮어쓰기

## INPUTS / SOURCE OF TRUTH:

1. `artifacts/release-candidate/stage8-v1.0/release-manifest.json`
2. `docs/stage8/evidence/gate7/GATE7_RELEASE_CANDIDATE_AUDIT_v1.0.json`
3. `docs/stage8/evidence/gate8/GATE8_LOCAL_DEPLOYMENT_QA_v1.0.json`
4. `docs/productization/evidence/EXTERNAL_EXECUTION_READINESS_REGISTER_v1.0.json`
5. `docs/productization/evidence/EXTERNAL_ROUTE_CONNECTION_VALIDATION_v1.0.json`
6. `harness/status.json`과 `docs/productization/STATUS.json`
7. Git 원격, 외부 배포 공급자 API, 실제 Health·Smoke·로그 결과

충돌 시 앞의 고정 릴리스 증거를 우선하되, 외부 권한과 대상의 현재 상태는 공급자의 실제 읽기 전용 응답을 우선한다. 알 수 없는 값은 `MISSING_EXTERNAL`로 기록하고 추정하지 않는다.

## WORKFLOW:

`Inspect → Preflight → 첫 READY 환경 1건 → 배포 → Health·Smoke → 관측 → 승인 판정 → 다음 환경 또는 Rollback → 증거·상태 동기화`

1. 메타프롬프트 계약, Gate 7, 로컬 Gate 8, 릴리스 SHA를 검증한다.
2. 외부 경로 연결 증거와 대상·권한·어댑터·실제 HTTPS Health URL·원격 Docker Context를 확인하며 Secret 값은 읽거나 출력하지 않는다. 예시 도메인, localhost, 기본 Docker Context는 거부한다.
3. 공급자 API로 현재 계정, 저장소/프로젝트, 최소 쓰기 권한, Environment, 감사 로그와 철회 방법을 읽기 전용 확인한다.
4. 하나라도 없으면 `HOLD`로 종료하고 첫 번째 누락 입력만 `next_input`으로 기록한다.
5. 모두 확인되면 Development 한 환경만 배포하고 동일 SHA, Health, 핵심 Smoke, 권한 역조건과 오류 로그를 확인한다.
6. Development 성공 후 같은 방식으로 Staging을 배포하고 Rollback 리허설을 수행한다.
7. 제품 책임자의 정확한 Canary 승인 참조가 있을 때만 제한된 Canary를 시작한다. 초기 학생 공개 트래픽은 0%이며 승인된 합성 또는 내부 QA 트래픽만 사용한다.
8. Canary의 오류율·지연·안전·비용 임계값이 모두 통과하고 Production 승인 참조가 있을 때만 Production을 승격한다.
9. 실패 시 자동 승격을 중단하고 직전 정상 이미지로 복귀한 뒤 로그·원인·영향·재검증을 기록한다.
10. Gate 8 완료 조건이 모두 참일 때만 `VERIFIED`, `stage8_complete=true`, `production_release_authorized=true`로 갱신한다.

## AUTHORITY / PERMISSIONS:

- 읽기: 프로젝트 전체, Git 원격 메타데이터, 승인된 공급자의 계정·프로젝트·배포 상태·로그
- 로컬 쓰기: `docs/stage8/evidence/gate8/`, `docs/stage8/audits/`, `harness/status.json`, 관련 실행기와 보고서
- PowerShell·Docker: 로컬/승인된 정확한 대상의 검증·배포·Health·Rollback에 한해 사용한다.
- 외부 쓰기: 대상 참조와 권한 참조가 실제로 검증되고 사전점검이 `ALLOW_WITH_CONDITIONS` 이상일 때 해당 프로젝트·환경에만 허용한다.
- Git commit·push·PR·Pages 활성화·Environment 생성: 정확한 저장소 쓰기 권한과 배포 승인 없이는 수행하지 않는다.
- Secret은 환경변수 또는 Secret Manager 참조만 사용하고 값·길이·접두사를 증거에 기록하지 않는다.

## CONSTRAINTS:

- Gate 7의 고정 릴리스 후보 외 Artifact를 외부에 배포하지 않는다.
- 환경 순서를 건너뛰지 않고, 실패한 환경 뒤의 승격을 시작하지 않는다.
- 외부 배포 활성화 값의 기본값은 false다.
- Production은 수동 승인 참조와 Canary 증거가 없으면 항상 차단한다.
- DB migration은 forward-only이며 Rollback 전에 데이터 호환성을 확인한다.
- 학생·보호자 개인정보, 답안 원문, API Secret, 결제정보를 로그·Artifact·문서에 남기지 않는다.
- 같은 원인의 실패가 3회 반복되면 자동 재시도를 중단한다.
- 실제 공급자 응답, HTTP 결과, 로그와 SHA 증거 없이 `DEPLOYED`, `VERIFIED`, `RELEASED`를 기록하지 않는다.

## SUCCESS CRITERIA:

- 프롬프트 계약 8/8과 경고 0건이다.
- 외부 경로 연결 증거 1건 이상이 검증되고 대상·승인·최소권한 참조, 실제 HTTPS 호스트와 원격 Docker Context가 모두 유효하다.
- Development·Staging·Canary·Production이 동일 릴리스 SHA를 반환한다.
- 각 환경의 Health·핵심 Smoke·401/403·8개 로케일·보안 헤더·오류 로그 검사가 모두 PASS다.
- Staging과 Production의 Rollback 또는 복구 리허설 증거가 PASS다.
- Canary 임계값과 제품 책임자 Production 승인 참조가 검증된다.
- `harness/status.json`의 Gate 8이 `VERIFIED`, blocker 0건, `stage8_complete=true`다.

## FAILURE CRITERIA:

- 외부 경로 연결, 대상, 쓰기 권한, 배포 Environment, 승인 참조, 실제 HTTPS 호스트, 원격 Docker Context 또는 감사 로그가 없다.
- 로그인 계정과 대상 소유권이 다르거나 현재 업무보다 넓은 권한을 요구한다.
- Artifact SHA 불일치, Health·Smoke·권한 역조건·로케일·보안 헤더·로그 검사 중 하나라도 실패한다.
- Canary 또는 Production이 선행 환경·수동 승인 없이 시작된다.
- Secret·개인정보·원문 증거가 출력 또는 저장된다.
- Rollback이 불가능하거나 DB 호환성을 증명하지 못한다.

실패는 `FAIL`, 외부 입력 부족은 `HOLD`, 승인된 일정 대기는 `APPROVED_HOLD`로 구분한다. 같은 원인의 실패 3회 또는 Rollback 실패 시 즉시 중단한다.

## VERIFICATION / EVIDENCE:

- `python C:\Users\seowo\.agents\skills\bamsoft-prompt-engineering\scripts\validate_prompt_contract.py docs/stage8/prompts/GATE8_AUTONOMOUS_EXTERNAL_COMPLETION_METAPROMPT_v1.0.md --strict --json`
- `node scripts/harness/collect_gate8_external_preflight.mjs`
- `node scripts/harness/audit_gate8_external_preflight.mjs`
- `node scripts/harness/audit_gate7_release_candidate.mjs`
- `node scripts/harness/audit_gate8_deployment.mjs`
- 승인된 대상의 Artifact SHA 조회, HTTPS Health·Smoke, 401/403, 로그, Canary 지표와 Rollback 결과
- `python scripts/harness/validate_harness.py`
- `node scripts/productization/validate_status_alignment.mjs`
- `git diff --check`

각 명령의 종료 코드, 실행 시각, 대상 참조, 릴리스 SHA, 결과와 남은 위험을 기록한다. Secret 값과 raw endpoint는 기록하지 않는다.

## OUTPUTS / FORMAT:

- 실행 계약: `docs/stage8/prompts/GATE8_AUTONOMOUS_EXTERNAL_COMPLETION_METAPROMPT_v1.0.md`
- 사전점검 증거: `docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_v1.0.json`
- 사전점검 감사: `docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_AUDIT_v1.0.json`
- 사람용 감사: `docs/stage8/audits/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_AUDIT.md`
- 최종 배포 증거: `docs/stage8/evidence/gate8/GATE8_DEPLOYMENT_AUDIT_v1.0.json`
- 현재 상태: `harness/status.json`, `docs/productization/STATUS.json`

JSON은 상태, 정확한 비밀 아닌 참조 ID, SHA-256, 시각, 공급자 판정, 환경별 검사, 실패와 `next_input`을 포함한다. 사람용 문서는 결과·변경 범위·실제 검증·남은 외부 게이트·다음 READY 작업 순서로 작성한다.

## MEMORY UPDATE:

현재 상태가 바뀐 경우에만 Gate 8 증거와 두 상태 파일에 결정, 실제 명령, SHA, 미완료, 재개 행동을 기록한다. Secret·토큰·개인정보·raw endpoint·임시 세션 값은 남기지 않는다.

## STOP CONDITION:

- 성공: Production까지 동일 SHA, Health·Smoke·Canary·Rollback·승인이 모두 증명되고 Gate 8이 `VERIFIED`다.
- 안전한 중단: 외부 경로·대상·권한·승인 중 첫 누락 항목을 `next_input`으로 기록하고 `HOLD`로 종료한다.
- 실패 중단: 같은 원인의 실패 3회, Artifact 불일치, 권한 경계 위반, Secret 노출 위험 또는 Rollback 실패다.
