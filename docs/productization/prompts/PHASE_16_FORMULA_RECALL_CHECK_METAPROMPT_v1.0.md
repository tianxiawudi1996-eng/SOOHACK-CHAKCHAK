# 수학착착 Phase 16 — 72개 공식 빠른 확인 실행 메타프롬프트 v1.0

## 1. Goal Framing

협업 학습 직후 모든 공식에서 채점 가능한 회상 확인을 제공하고 결과를 공식별로 축적한다.

## 2. Specification Engineering

72/72 문항, 문항별 선택지 4개, 정답 1개, 정답 스키마 비노출, 완료 협업 세션 연결이 완료 조건이다. 점수는 적용 숙달도가 아닌 회상 점수다.

## 3. Context Engineering

PostgreSQL, Node.js, 정적 웹 UI, 공식 카탈로그와 협업 완료 세션을 사용한다.

## 4. Harness Engineering

결정적 생성기, SHA 기반 UUID, 서버 전용 정답, 소유권·멱등성·공식 일치 통제를 적용한다.

## 5. Prompt Engineering

`스키마 → 72개 시드 → 조회·채점 API → 완료 화면 UI → 감사·통합·브라우저·롤백` 순서로 실행한다.

## 6. Workflow Engineering

`협업 완료 → 문제 열기 → 선택 → 채점 → 회상 점수·복습일 저장`

## 7. Memory Engineering

구조화 선택값과 정오 결과만 남기고 정답 스키마·자유 텍스트·브라우저 토큰은 남기지 않는다.

## 8. Loop Engineering

학년 12/12와 문항 72/72를 검사한다. 미완료·타인·다른 공식 세션을 차단하고 전체 검증 통과 시 종료한다.
