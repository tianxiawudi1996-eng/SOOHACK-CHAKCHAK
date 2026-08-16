# 수학착착 · MathChakChak

초1~고3 학습자를 위한 성장형 1:1 AI 수학 튜터 프로젝트입니다.

- 브랜드: 수학착착 / MATH CHAKCHAK
- 슬로건: 수학이 착착, 공식이 척척.
- 필수 로케일: `ko`, `zh-CN`, `ja`, `en`, `es`, `fr`, `it`, `ru`

## 단일 현재 상태

- 제품화: Phase 75 로컬 플랫폼 PASS, 외부 출시 `BLOCKED_EXTERNAL`
- Stage 8 Gate 0~7: `VERIFIED`
- Stage 8 Gate 5: 제품 책임자 승인 1/1
- Gate 6: 반응형 4/4·정적 품질·내용 주소 RC `VERIFIED`
- Gate 7: 출시 차단 명령 14/14, 단위 336/336, 통합 61/61, 브라우저 접근성 6/6 `VERIFIED`
- Gate 8: 로컬 배포·Health·Smoke·Rollback `VERIFIED`, live 외부 사전점검 `PASS/HOLD`, 외부 경로·대상·권한 미설정으로 `BLOCKED`
- 외부 실행: 실제 연결 증거 0건, dispatch·verification·release 모두 false

외부 사전점검은 `npm.cmd run gate8:external:preflight`로 재실행한다. GitHub 읽기 전용 경로 연결 증거 1건은 검증됐다. 현재 원격 저장소 권한은 `pull=true`, `push=false`, Pages 비활성, 보호된 배포 Environment 0개이며 첫 다음 입력은 `EXTERNAL_DEPLOYMENT_TARGET_REFERENCE`다.

현재 상태 정본:

1. 제품화 전체: `docs/productization/STATUS.json`
2. Stage 8 Gate: `harness/status.json`
3. Phase 0~75 색인: `docs/productization/PHASE_ROADMAP.md`
4. 외부 실행 대장: `docs/productization/evidence/EXTERNAL_EXECUTION_READINESS_REGISTER_v1.0.json`

## 주요 경로

- 사용자 클라이언트: `client/`
- API·도메인·서버: `developer/`
- AI 튜터 계약: `agent/`
- 제품화 보고·증거: `docs/productization/`
- Stage 8 감사·증거: `docs/stage8/`

## 로컬 실행 표면

- 제품 화면 기본 URL: `http://127.0.0.1:4180/?locale=ko`
- API 준비 상태: `http://127.0.0.1:4181/readyz`

로컬 PASS는 외부 배포·시장 적합성·제품 출시 승인을 의미하지 않는다. 승인 자산과 SHA-256을 보존하고, 증거 없는 완료 선언이나 외부 실행을 금지한다.
