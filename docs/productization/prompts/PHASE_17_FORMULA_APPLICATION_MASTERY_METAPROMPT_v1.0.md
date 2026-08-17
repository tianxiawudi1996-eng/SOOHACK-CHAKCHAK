# 수학착착 Phase 17 — 실제 공식 적용 숙달도 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 초1~고3 수학 학습자와 제품 책임자
- 변화: 공식 회상에서 실제 계산·상황·단위 적용으로 이동한다.

## 2. Specification Engineering

12개 대표 공식에 3문항씩 36개를 제공한다. 세 문항의 최신 결과와 난이도 가중치로 `application_mastery_score`를 계산하며 최소 증거 3개와 0.8 이상을 모두 만족해야 숙달이다. `recall_score`와 합산하지 않는다.

## 3. Context Engineering

- PostgreSQL migration 0008와 seed 0006
- Phase 14 공식 카탈로그
- Phase 15 완료 협업 세션
- Phase 16 회상 시도
- Node.js API와 curriculum UI

## 4. Harness Engineering

정답·허용 단위·오개념 매칭값은 서버 전용이다. 완료 협업, 동일 공식, 회상 선행, 학생 소유권, 멱등성, 최신 문항별 집계를 자동 감사한다.

## 5. Prompt Engineering

1. 사례 카탈로그와 시드를 생성한다.
2. 값·단위 평가기를 구현한다.
3. 문제 조회·답안 제출 API를 구현한다.
4. 세 문항 최신 결과로 점수를 재계산한다.
5. 회상 뒤 적용 문제 UI를 연결한다.
6. 오답에서 정답 대신 오개념 코드와 일반 재검토 안내만 제공한다.
7. 정적·단위·통합·브라우저·롤백 검사를 수행한다.

## 6. Workflow Engineering

`설계 → 콘텐츠 생성 → DB → 서버채점 → UI → 정적검사 → PostgreSQL 통합 → 브라우저 → 보고` 순서다.

## 7. Memory Engineering

최신 문항별 적용 증거, 숙달도, 오개념, 복습일과 검증 결과를 남긴다. 정답 클라이언트 복제본과 회상 점수 합산값은 제거한다.

## 8. Loop Engineering

선행 회상 없음, 정답, 오답, 단위 오류, 재도전, 멱등 재시도를 주입한다. 12/12·36/36·정답 비노출·통합 여정·롤백이 모두 통과할 때 종료한다.
