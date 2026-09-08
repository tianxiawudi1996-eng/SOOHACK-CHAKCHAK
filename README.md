# 수학착착 · MathChakChak

**수학이 착착, 공식이 척척.**

수학착착은 초등학교 1학년부터 고등학교 3학년까지의 학습자가 수학 개념과 공식을 이해하고 적용하도록 돕는 성장형 1:1 AI 수학 튜터입니다.

## 제품 특징

- 교육과정 기반 학습: 초1~고3 학년별 개념·공식·문제 유형 구성
- 착착이와 공식이의 협업: 착착이는 학습 흐름과 정서적 피드백을, 공식이는 공식·근거·풀이 검증을 담당
- 적응형 학습: 진단 결과, 오답 원인, 회상 주기와 적용 수준에 따른 다음 학습 추천
- 대치동 수준 전문화: 심화 문제, 풀이 인식, 교사·학부모 운영, 학습 효과 파일럿과 전문가 검토 게이트
- 다국어 지원: `ko`, `zh-CN`, `ja`, `en`, `es`, `fr`, `it`, `ru`
- 승인된 2D 펫 자산과 접근성·모션 축소 정책 적용

## 저장소 구조

- `client/`: 학생·학부모용 웹 클라이언트
- `developer/`: API, 학습 도메인과 서버 코드
- `agent/`: AI 튜터 행동 계약, 프롬프트와 안전 규칙
- `infra/`: PostgreSQL, Docker와 배포 기반
- `tests/`: 기능별 단위·통합 테스트
- `docs/productization/`: 제품화 Phase 상태·보고·증거
- `docs/stage8/`: Stage 8 Gate 감사·검토·증거
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

전체 제품화 테스트는 다음 명령으로 실행합니다.

```powershell
npm.cmd test
```

## 현재 개발 우선순위

2026-09-09부터 신규 `Phase 76+` 확장은 동결하고 실제 학습 제품의 Product Core를 우선합니다.

1. RESET-001 정본 편입
2. ALG-EQ-001 완성
3. 동급 품질 Lesson 10개
4. 내부 학생 사용성 테스트
5. 오답·힌트·재시도 Telemetry
6. Mastery/오개념 Engine
7. 문제은행 100→500→2,000
8. 교육과정 확장
9. AI Tutor 고도화
10. 운영·배포 확대

실행 정본: `docs/product-core/00_EXECUTION_PLAN.md`, 기계 상태: `docs/product-core/STATUS.json`
## 현재 릴리스 상태

- 제품화 로드맵: Phase 0~75 로컬 검증 증거 보유
- Stage 8 Gate 0~7: `VERIFIED`
- Gate 7 릴리스 후보: 단위 테스트 336/336, 통합 테스트 61/61, P0 결함 0
- Gate 8: 외부 배포 대상·권한·Health·Smoke·Rollback 증거가 모두 확보될 때까지 운영 릴리스 차단

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
- 외부 배포는 검증된 커밋과 승인된 대상에만 수행합니다.
