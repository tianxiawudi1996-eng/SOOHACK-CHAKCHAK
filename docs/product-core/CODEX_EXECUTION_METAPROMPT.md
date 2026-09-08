# Codex Product Core 실행 메타프롬프트

## GOAL

`D:\project\SOOHACK CHACKCHACK`에서 수학착착의 실제 학습제품 개발을 우선한다. 신규 Phase 76+를 만들지 말고 `docs/product-core/00_EXECUTION_PLAN.md`의 M1→M10 순서를 따른다.

## 절대 규칙

1. RESET-001 원본은 `C:\Users\ddedi\Documents\Math Memory Tutor\reference\alg-eq-001\`의 실제 바이트만 사용한다.
2. RESET-001을 기억, 기존 분수 Lesson, 생성 HTML로 재구성하지 않는다.
3. 작업 전후 `git status`, branch, HEAD를 기록한다.
4. 승인 파일과 사용자 변경을 임의 삭제하거나 reset하지 않는다.
5. M1이 VERIFIED되기 전 M2의 제품 코드 변경을 시작하지 않는다.
6. 새 Productization Phase 번호를 만들지 않는다.
7. 모든 증분은 테스트→문서→커밋→푸시 순으로 종료한다.

## M1 — RESET-001 정본 편입

1. `scripts/product-core/import_reset001.ps1`을 실행한다.
2. source/target 파일 집합과 SHA-256 100% 일치를 검증한다.
3. localhost 서버로 `reference/alg-eq-001/index.html`을 제공한다.
4. 1440px, 768px, 390px에서 화면을 검수한다.
5. console fatal error와 required asset 404가 0인지 확인한다.
6. 시작, 정답, 오답, 힌트, 재시도, 완료 흐름을 실제 클릭으로 검수한다.
7. `docs/product-core/evidence/RESET001_VISUAL_QA.md`를 작성한다.
8. `docs/product-core/STATUS.json`의 M1을 `VERIFIED`, M2를 `IN_PROGRESS`로 갱신한다.
9. 커밋·푸시한다.

## M2 — ALG-EQ-001 완성품화

RESET-001과 현재 `client/math-learning`을 비교한다. RESET-001의 좋은 학습 UX를 보존하면서 제품 Runtime/API/DB에 정식 편입한다.

필수:
- 이해→연결→반복→회상→적용 5단계
- 등식과 미지수 개념
- 한 단계 방정식
- 오답 원인 분류
- 단계형 힌트 3레벨
- 재시도
- 자기설명 또는 검산
- 착착이=생각 연결, 공식이=규칙 검증
- deterministic 정답 판정
- 390/768/1440 반응형
- 키보드/포커스/aria-live/reduced-motion

Telemetry hook은 M4 Pilot을 위해 이 단계에서 심을 수 있으나 M5 완료로 판정하지 않는다.

## M3 — Lesson 10개

`docs/product-core/LESSON_BATCH_001_010.md` 기준으로 002~004, 005~007, 008~010 세 묶음으로 구현한다. 각 묶음마다 자동 테스트·수동 QA·커밋을 분리한다.

각 Lesson은 최소 3개 오개념, 3단계 힌트, 반복/회상/적용 문항을 가진다. 같은 UI와 문구를 이름만 바꿔 복제하지 않는다.

## M4 이후

M4는 실제 사용자 증거 없이는 완료 처리하지 않는다. M5는 M4 로그를 분석하고, M6는 그 결과로 Mastery/오개념 Engine을 보정한다. M7은 100문항 Gate A를 통과한 후 500, 그 후 2,000으로 확대한다.

## 완료 보고 형식

- 변경 파일
- 테스트 명령과 결과
- 수동 QA 결과
- Product Core STATUS 변화
- 커밋 SHA
- Push/PR
- 다음 Milestone
- BLOCKED 항목은 정확한 외부 입력과 이유