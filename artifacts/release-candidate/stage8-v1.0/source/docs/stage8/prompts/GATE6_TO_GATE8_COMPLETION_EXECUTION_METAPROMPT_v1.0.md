# 수학착착 Stage 8 — Gate 6~8 잔여 작업 완결 실행 메타프롬프트 v1.0

## 1. 목적·목표

ROLE: 수학착착 제품 통합·QA·릴리스 책임 에이전트.

GOAL: Gate 5에서 승인된 착착이·공식이 자산과 AI 행동 계약을 실제 제품에 보존한 채, Gate 6의 반응형·정적 품질·불변 RC 증거와 Gate 7의 출시 차단 QA를 완료하고, Gate 8은 승인된 환경 범위에서만 배포·Health·Smoke·Rollback 증거를 남긴다.

완료 후 사용자는 로컬 Release Candidate의 정확한 소스·Artifact 해시, 360·768·1024·1200px 화면 증거, lint·typecheck 결과, 기능·접근성·성능·보안 회귀 결과와 배포 가능/차단 판정을 한 곳에서 확인할 수 있어야 한다.

## 2. 범위

SCOPE:

- `client/`, `developer/`, `agent/`의 실제 제품 코드와 정적 품질 검사
- `artifacts/staging/v0.1.0/`의 재현 빌드와 내용 주소 기반 RC 고정
- 360·768·1024·1200px 실제 Chromium 화면·오버플로·자산·콘솔·핵심 이동 검사
- Gate 6~8 감사기, JSON 증거, Markdown 보고서와 `harness/status.json`
- 기존 제품화 Phase 5~8, 성능 Phase 23, 보안 Phase 24의 증거 재검증
- 승인된 로컬 격리 환경의 Health·Smoke·Rollback 리허설

OUT OF SCOPE:

- 승인 없는 외부 운영 배포, 도메인·방화벽·OAuth·Secret·결제 변경
- 실제 학생·학부모·학원·전문가 데이터 또는 시장 성과 주장
- 사용자의 기존 작업을 임의로 삭제·reset·commit·push
- 승인 캐릭터 자산 생성·교체·정체성 변경

## 3. 처리 방식

WORKFLOW:

1. `harness/status.json`, Gate 6~8 정본 프롬프트, 제품화 `STATUS.json`, 현재 Git 상태를 조사한다.
2. 한 Loop에는 `반응형 증거`, `lint/typecheck`, `RC 고정`, `Gate 7 QA`, `Gate 8 로컬 배포 증거` 중 한 건만 둔다.
3. 반응형 검사는 실제 Chromium에서 360·768·1024·1200px를 각각 열어 캡처·DOM 측정·콘솔 오류·핵심 링크를 기록한다.
4. 프로젝트에 없는 lint/typecheck는 네트워크 의존성을 추가하지 않는 결정적 검사기로 구현하고 실제 소스 전체에 실행한다.
5. 스테이징을 재빌드하고 소스 스냅샷 매니페스트와 Artifact 매니페스트를 SHA-256으로 결합해 격리 RC를 고정한다.
6. Gate 6 종료 조건이 모두 PASS일 때만 Gate 6를 `VERIFIED`로 승격한다.
7. Gate 7은 기능→단위→통합→접근성→성능→보안→민감정보 역조건 순서로 실행하고 P0 결함 0건일 때만 `VERIFIED`로 승격한다.
8. Gate 8은 승인된 로컬 격리 환경에서만 배포·Health·Smoke·Rollback을 실행한다. 외부 대상·권한이 없으면 외부 배포는 `BLOCKED`로 기록한다.
9. 각 상태 변경 후 Gate 전이 역조건과 `git diff --check`를 재검증한다.

## 4. 입력과 기준

INPUTS / SOURCE OF TRUTH:

1. `AGENTS.md`와 현재 사용자의 명시적 요구
2. `docs/stage8/prompts/GATE6_PRODUCT_INTEGRATION.md`, `GATE7_QA.md`, `GATE8_DEPLOYMENT.md`
3. `harness/status.json`과 `docs/productization/STATUS.json`
4. `docs/stage8/evidence/gate6/GATE6_PRODUCT_INTEGRATION_EVIDENCE_MAP_v1.0.json`
5. 실제 코드·실행 결과·브라우저·테스트·Artifact 해시

충돌하면 상위 정본과 실제 관찰 가능한 결과를 우선한다. 존재하지 않는 도구·배포 대상·승인·Secret을 추정하지 않고 `MISSING` 또는 `BLOCKED_EXTERNAL`로 기록한다.

## 5. 권한

AUTHORITY / PERMISSIONS:

- 읽기: 저장소 전체와 로컬 실행 상태
- 로컬 쓰기: 저장소 내 코드·테스트·문서·감사 증거·`artifacts/staging/`
- 로컬 실행: PowerShell, Node.js, Python, Chromium, npm 검사, 로컬 HTTP/Docker 격리 환경
- 외부 쓰기·배포·삭제·commit·push: 정확한 대상과 별도 사용자 승인이 없으면 수행하지 않는다.
- Secret·토큰·복구 코드·개인 연락처: 읽거나 코드·로그·캡처·Artifact에 기록하지 않는다.

CONSTRAINTS:

- 승인된 착착이·공식이 자산 32개와 고정 해시를 변경하거나 새 캐릭터로 대체하지 않는다.
- Git 작업 트리가 깨끗하지 않아도 사용자 변경을 되돌리지 않으며, RC는 선택된 소스와 빌드 결과를 별도 디렉터리에 복사한 내용 주소 기반 스냅샷으로 고정한다.
- JavaScript 프로젝트의 typecheck는 TypeScript 사용을 허위로 주장하지 않고, 실제 모듈 구문과 JSON·런타임 계약의 타입·필수 필드를 검사한 결과로 명시한다.
- 자동 QA, 에이전트 시각 검토, 제품 책임자 승인, 외부 배포 승인을 서로 대체하거나 합산하지 않는다.
- 로컬 PowerShell 실행 권한은 운영 계정·Secret·도메인·비용·외부 전송·commit·push 권한으로 확대 해석하지 않는다.

## 6. 성공·실패 기준

SUCCESS CRITERIA:

- Gate 6 반응형 Chromium 검사 4/4, 수평 오버플로 0, 콘솔 오류 0, 승인 캐릭터 2/2
- lint와 typecheck가 실제 소스 범위에서 종료 코드 0
- 소스 스냅샷·스테이징 Artifact 파일 해시 100% 일치와 결합 RC SHA-256 생성
- Gate 6 `VERIFIED`, Gate 7 진입 허용
- Gate 7 출시 차단 QA 전체 PASS, P0 결함 0, Gate 7 `VERIFIED`
- Gate 8 로컬 배포·Health·Smoke·Rollback 증거 PASS
- 외부 배포를 하지 않은 경우 수행 여부 false와 정확한 외부 차단 사유 유지

FAILURE CRITERIA:

- 승인 자산 해시 변동, 핵심 사용자 흐름 실패, 4개 뷰포트 중 하나라도 잘림·오버플로·콘솔 오류 발생
- lint/typecheck·단위·통합·접근성·성능·보안·Smoke 중 하나라도 실패
- RC 매니페스트와 실제 파일의 해시 불일치
- Secret·개인정보·복구 코드 노출
- 배포 대상·권한이 없는데 외부 배포 또는 Stage 8 전체 완료로 기록

STOP CONDITION:

- 같은 원인 실패가 3회 반복되면 자동 재시도를 중단하고 재현 명령·실제/기대 결과·원인·최소 수정·남은 승인을 보고한다.
- 외부 운영 변경, 비용, 자격증명, commit/push가 필요하면 로컬 증거를 보존하고 해당 단계만 `BLOCKED_EXTERNAL`로 멈춘다.

## 7. 검증과 증거

VERIFICATION / EVIDENCE:

- `node scripts/harness/audit_gate6_responsive_runtime.mjs`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build:staging`
- `node scripts/harness/build_gate6_release_candidate.mjs`
- `node scripts/harness/audit_gate6_product_integration.mjs`
- `npm.cmd run test:unit`
- 프로젝트의 제품화·통합·접근성·성능·보안 검사
- `node scripts/harness/audit_gate7_release_candidate.mjs`
- 승인된 로컬 환경의 HTTP Health·Smoke·Rollback 검사
- `python scripts/harness/validate_harness.py`
- `node scripts/productization/validate_status_alignment.mjs`
- `git diff --check`

각 명령의 실제 종료 코드, 실행 시각, 입력 RC SHA-256과 결과를 JSON·Markdown에 기록한다.

## 8. 산출물과 형식

OUTPUTS / FORMAT:

- 실행 계약: `docs/stage8/prompts/GATE6_TO_GATE8_COMPLETION_EXECUTION_METAPROMPT_v1.0.md`
- 반응형 캡처·JSON: `docs/stage8/evidence/gate6/responsive/`
- 정적 품질 JSON: `docs/stage8/evidence/gate6/GATE6_STATIC_QUALITY_v1.0.json`
- RC 매니페스트: `artifacts/release-candidate/stage8-v1.0/`
- Gate 6~8 감사 JSON·Markdown: `docs/stage8/evidence/gate6/`, `gate7/`, `gate8/`, `docs/stage8/audits/`
- 기계 상태: `harness/status.json`, `docs/productization/STATUS.json`
- 사람용 최종 보고: 변경·검증·미완료 외부 게이트·다음 행동 순서

MEMORY UPDATE:

- 승인 자산 해시, RC SHA-256, 실제 명령·결과, Gate 상태, 미완료 외부 배포 게이트만 저장소 상태 문서에 남긴다.
- 실험 중간 파일, Secret, 개인정보, 복구 코드는 남기지 않는다.
