# 수학착착 · MathChakChak

**수학이 착착, 공식이 척척.**

수학착착은 초등학교 1학년부터 고등학교 3학년까지 학습자가 수학 개념과 공식을 이해하고 적용하도록 돕는 성장형 1:1 AI 수학 튜터입니다.

## 제품 특징

- 교육과정 기반 학습: 초1~고3 학년별 개념·공식·문제 유형 구성
- 착착이와 공식이의 협업: 착착이는 학습 흐름과 정서적 피드백, 공식이는 공식·근거·단위 검증 담당
- 적응형 학습: 진단 결과, 오답 원인, 회상 주기와 적용 수준에 따른 다음 학습 추천
- 대치동 수준 전문화 기반: 서술형 문제, 답안 인식, 교사·학부모 운영, 학습 효과 파일럿과 전문가 검토 게이트
- 8개 필수 로케일: `ko`, `zh-CN`, `ja`, `en`, `es`, `fr`, `it`, `ru`
- 승인된 2D 펫 자산과 접근성·모션 축소 정책 적용

## 저장소 구조

- `client/`: 학생·학부모용 웹 클라이언트
- `developer/`: API, 학습 도메인과 서버 코드
- `agent/`: AI 튜터 행동 계약, 프롬프트와 안전 규칙
- `infra/`: PostgreSQL, Docker와 배포 기반
- `tests/`: 기능별 단위·통합 테스트
- `docs/productization/`: 제품화 Phase 상태·보고·증거
- `docs/stage8/`: Stage 8 Gate 감사·검증 증거
- `harness/`: 현재 Gate 상태와 증거 기반 검증기

## 로컬 실행과 검증

```powershell
npm.cmd install
npm.cmd run start:api
```

주요 검증 명령:

```powershell
npm.cmd run test:unit
npm.cmd run test:productization
python scripts/harness/validate_harness.py
npm.cmd run gate8:external:preflight
```

전체 제품화 테스트:

```powershell
npm.cmd test
```

## 현재 상태

- 제품화 로드맵: Phase 0~76 로컬 검증 증거 보유
- Phase 76 소셜 로그인 생애주기 로컬 PASS, 외부 공급자 연동 HOLD
- 외부 출시 `BLOCKED_EXTERNAL`
- Stage 8 Gate 0~7: `VERIFIED`
- Gate 5: AI Behavior 자동 QA와 제품 책임자 승인 `VERIFIED`
- Gate 6: 제품 통합·반응형·정적 품질·불변 RC `VERIFIED`
- Gate 7: 출시 차단 QA·단위·통합·접근성 검사 `VERIFIED`
- Gate 8: 로컬 Health·Smoke·Rollback `VERIFIED`
- 불변 소스 커밋 `a9e6421`과 GitHub Actions quality·API/PostgreSQL 통합: `VERIFIED`
- Cloudflare 개발 프런트엔드와 fail-closed API 브리지: `DEPLOYED`
- GitHub `development` 보호 Environment와 `main` 전용 배포 정책: `VERIFIED`
- Node API·외부 PostgreSQL·운영 릴리스: `BLOCKED_EXTERNAL`

외부 개발 프리뷰: `https://dev.mathchakchak-product.workers.dev`

현재 상태의 단일 정본은 다음 파일에서 확인합니다.

1. `docs/productization/STATUS.json`
2. `docs/productization/PHASE_ROADMAP.md`
3. `harness/status.json`
4. `docs/productization/evidence/EXTERNAL_EXECUTION_READINESS_REGISTER_v1.0.json`

## 안전 원칙

- 자동 검사 통과와 제품 책임자 승인을 분리합니다.
- 정답 직접 노출, 비난, 과장된 학습 효과 표현을 금지합니다.
- 비밀번호, 토큰, 복구 코드와 개인 연락처를 저장소에 기록하지 않습니다.
- 증거 없는 배포·승인·완료 상태를 만들지 않습니다.
- 외부 배포는 검증된 커밋, 보호 Environment와 승인된 대상에만 수행합니다.
