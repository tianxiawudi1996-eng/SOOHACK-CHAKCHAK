# 수학착착 Product Core 실행 계획

## 목적

Phase 번호를 늘리는 작업보다 실제 학생 학습 경험과 학습 콘텐츠를 우선한다. 이 문서는 2026-09-09부터 적용되는 제품 개발 우선순위 기준선이다.

## 개발 정책

- `Phase 76+` 신규 확장은 당분간 동결한다.
- 기존 Phase 0~75 산출물은 삭제하지 않고 기반 자산으로 보존한다.
- 신규 개발은 `Product Core Milestone`으로 관리한다.
- 제품 기능, 학습 콘텐츠, 실제 사용 증거가 없는 정책·Harness 확장은 우선순위를 낮춘다.
- deterministic 수학 판정과 생성형 AI 설명을 분리한다.
- 실제 학생 데이터가 없는 학습효과 주장은 금지한다.

## 고정 실행 순서

| Milestone | 작업 | 종료 조건 |
|---|---|---|
| M1 | RESET-001 정본 Repository 편입 | 원본 바이트 복사, SHA-256 비교, localhost 렌더 QA, Git 커밋 |
| M2 | ALG-EQ-001 완성품화 | 이해→연결→반복→회상→적용 전 구간, 정답/오답/힌트/재시도/완료 QA |
| M3 | 동급 품질 Lesson 10개 | ALG-EQ-001~010, 각 Lesson 수동 QA 및 자동 회귀 테스트 |
| M4 | 실제 아이 사용성 테스트 | 최소 내부 사용자 5명, 관찰 기록, P0/P1 수정 |
| M5 | 오답·힌트·재시도 로그 | 최소 개인정보 이벤트 스키마, 세션별 오류·힌트·재시도 추적 |
| M6 | Mastery/오개념 Engine 개선 | 오개념 분류, 숙달도 갱신, 다음 활동 선택 기준 검증 |
| M7 | 문제은행 100→500→2,000 | 정답·해설·난이도·오개념·태그 QA Gate 통과 |
| M8 | 교육과정 확장 | 검증된 Core 패턴으로 학년/단원 확대 |
| M9 | AI Tutor 고도화 | 실제 로그 기반 힌트·설명 품질 개선 및 안전 Eval |
| M10 | 운영·배포 확대 | 외부 대상/권한/모니터링/롤백 증거 확보 후 진행 |

## 현재 시작점

- GitHub main: `a0ed655f11f081b94352ae083d7ad5a3b1618af1`
- 기존 Phase: 0~75 보존
- Stage 8: Gate 0~7 VERIFIED, Gate 8 외부 배포 BLOCKED
- RESET-001 로컬 원본: `C:\Users\ddedi\Documents\Math Memory Tutor\reference\alg-eq-001\`
- 정본 대상: `D:\project\SOOHACK CHACKCHACK\reference\alg-eq-001\`

## 실행 규칙

1. M1 종료 전 RESET-001을 기억이나 기존 GitHub 코드로 재생성하지 않는다.
2. M2는 RESET-001 실제 파일을 기준으로 차이를 분석한 후 수행한다.
3. M3의 Lesson은 같은 화면만 복제하지 않고 학습 목표·오개념·문항·힌트가 독립적이어야 한다.
4. M4부터 사용자 관찰과 제품 로그가 다음 개발 우선순위를 결정한다.
5. M7 전까지 2,000문항을 일괄 생성하지 않는다. 100문항 품질 Gate를 먼저 통과한다.
6. M9에서 AI는 정답 판정 권한을 갖지 않는다.
7. M10 전까지 Production 완료를 선언하지 않는다.

## 브랜치 규칙

- 현재 브랜치: `codex/product-core-priority-reset001`
- RESET 편입: 동일 브랜치에서 최소 증분 커밋
- Lesson 구현: `codex/product-core-alg-eq-001`
- 이후 Lesson batch: `codex/product-core-alg-eq-batch-001-010`

## 기계 상태

`docs/product-core/STATUS.json`을 Product Core 트랙의 상태 정본으로 사용한다.

이 계획은 기존 Phase 0~75의 과거 기록을 삭제하거나 무효화하지 않는다. 앞으로의 신규 개발 우선순위만 통제한다.