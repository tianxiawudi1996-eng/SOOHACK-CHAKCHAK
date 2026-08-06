# 수학착착 적응형 학습 경로 설계 v1.0

## 1. Goal Framing

- 사용자: 분수 학습을 시작하는 초등 학습자와 학습 진척을 확인하는 보호자·교육 운영자
- 달라져야 하는 것: 모든 학습자에게 같은 난이도를 제공하지 않고, 진단 근거에 따라 보충·기본·도전 경로를 자동 선택한다.

## 2. Specification Engineering

진단 응답이 1개 이상일 때 서버가 정확도를 계산해 `REMEDIATE`, `CORE`, `EXTEND` 중 하나를 결정하고 PostgreSQL에 결정 근거와 학습 경로를 함께 저장하면 완성이다.

- `0.0 ≤ 정확도 < 0.5`: `REMEDIATE`, 시작 힌트 2, 목표 난이도 1
- `0.5 ≤ 정확도 < 0.8`: `CORE`, 시작 힌트 1, 목표 난이도 3
- `0.8 ≤ 정확도 ≤ 1.0`: `EXTEND`, 시작 힌트 0, 목표 난이도 5
- 공식 학습 완료 시 주제별 최신 숙달도와 누적 증거 수를 저장한다.
- 원문 답안·문제·인증정보는 적응형 결정 레코드에 복사하지 않는다.

## 3. Context Engineering

- 런타임: Node.js ESM REST API
- 데이터베이스: PostgreSQL 16, `mathchakchak` 스키마
- 경로 엔진: `developer/src/learning/adaptive-routing.mjs`
- API·저장소: `developer/src/api/server.mjs`, `developer/src/api/repository.mjs`
- DB 확장: `infra/database/migrations/0003_adaptive_learning.sql`
- 계약: `infra/database/adaptive-learning-contract.json`

## 4. Harness Engineering

경로 결정은 서버의 순수 함수와 PostgreSQL 제약 안에서만 수행한다. AI 추론이나 외부 모델 호출은 사용하지 않는다. 단위테스트는 임계값과 잘못된 입력을 검사하고, 통합테스트는 진단→결정→경로 생성→조회→숙달도 저장을 실제 PostgreSQL에서 확인한다.

## 5. Prompt Engineering

1. 정확도 임계값과 경로별 힌트·난이도 계약을 작성한다.
2. 적응형 결정과 주제 숙달도 테이블 및 rollback을 만든다.
3. 진단 완료 트랜잭션에서 결정·학습 경로를 원자적으로 저장한다.
4. 학생 소유권이 확인된 최신 추천 조회 API를 만든다.
5. 공식 학습 완료 시 숙달도를 upsert한다.
6. 단위·정적·PostgreSQL 통합 테스트를 통과시킨다.

성공 기준은 세 경로 3/3, 임계값 경계, 중복 완료 재생, 소유권, 원문 답안 비저장, 숙달도 저장이 모두 통과하는 것이다. 일부만 저장되거나 클라이언트가 경로를 결정하면 실패다.

## 6. Workflow Engineering

`진단 응답 → 서버 채점 → 정확도 집계 → 경로 결정 → 결정·학습 경로 원자 저장 → 공식 학습 → 숙달도 갱신 → 다음 추천 조회`

## 7. Memory Engineering

남길 것은 진단 ID, 주제 ID, 정답 수·응답 수, 정확도, 경로, 알고리즘 버전, 최신 숙달도다. 원문 답안, 문제 원문, 토큰, 비밀번호와 임시 계산 상태는 적응형 결정에 남기지 않는다.

## 8. Loop Engineering

0/3, 2/3, 3/3 정답 시나리오와 0.5·0.8 임계값을 반복 검증한다. DB migration·rollback과 API 재생 요청을 검사한다. 세 경로와 숙달도 저장이 실제 PostgreSQL에서 통과하면 Phase 12를 종료한다.
