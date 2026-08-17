# 수학착착 실제 수학 공식 학습 기능 설계 v1.0

## 1. Goal Framing

- 사용자: 초등 수학 학습자, 학습 상태를 확인하는 보호자, 교육 콘텐츠 운영자
- 변화: 학생이 공식을 바로 암기하는 대신 의미를 이해하고, 유도 과정을 따라가며, 새 문제에 스스로 적용한 증거를 남긴다.

## 2. Specification Engineering

완료 상태는 한 개념이 `UNDERSTAND → CONNECT → REPEAT → RECALL → APPLY` 순서로 실행되고, 각 단계의 정답 근거와 힌트 사용량이 PostgreSQL에 저장되며, 다섯 단계 모두 통과하고 숙달도 0.8 이상일 때만 완료되는 상태다.

첫 구현 콘텐츠는 분모가 다른 분수의 덧셈이다.

- 이해: 분모는 조각의 크기이므로 먼저 같게 해야 함을 선택한다.
- 연결: `1/2`과 `1/3`을 6등분 시각 모델과 연결한다.
- 반복: `3/6 + 2/6 = 5/6`을 직접 계산한다.
- 회상: `(a×d + b×c)/(b×d)`의 분자·분모 규칙을 빈칸으로 회상한다.
- 적용: 새 문제 `1/2 + 1/5 = 7/10`을 해결한다.
- 오개념: `1/2 + 1/3 = 2/5`처럼 분모까지 더하면 `ADD_DENOMINATORS`로 판정한다.

성공 기준:

- 공식 학습 단계 5/5와 순서 강제
- 8개 지원 언어의 공식 설명 제공
- 정답·오답·힌트·오개념·숙달도 저장
- 공식 문자열 `eval` 금지, 서버의 유리수 연산으로 채점
- 읽기 API에서 `expected_response`와 채점 규칙 비노출
- PostgreSQL 마이그레이션·롤백·통합 여정 PASS

실패 기준:

- 문제 풀이만 있고 공식의 의미·유도·회상 단계가 없음
- 일부 단계 건너뛰기 또는 클라이언트가 완료 상태를 결정함
- 부동소수점 오차로 동치 분수를 오답 처리함
- 힌트 사용을 무시하고 숙달도를 과대평가함

## 3. Context Engineering

- 런타임: Node.js ESM, 정적 클라이언트, REST JSON API
- 데이터베이스: PostgreSQL 16, `mathchakchak` 스키마
- 연산기: `developer/src/math/rational.mjs`
- 학습·판정 엔진: `developer/src/learning/formula-learning.mjs`
- 저장소·API: `developer/src/api/repository.mjs`, `developer/src/api/server.mjs`
- DB 확장: `infra/database/migrations/0002_formula_learning.sql`
- 콘텐츠 시드: `infra/database/seeds/0002_fraction_formula_lesson.sql`
- 계약: `infra/database/math-learning-contract.json`

## 4. Harness Engineering

AI와 개발자는 공식 문자열을 실행하지 않고 허용된 상호작용 유형만 처리한다. 서버가 소유권, 현재 단계, 정답, 오개념, 숙달도와 완료 조건을 검증한다. 쓰기 요청은 서명 세션과 `Idempotency-Key`가 필요하다. 자동 QA는 단위 테스트, 정적 계약 감사, PostgreSQL 통합 테스트로 분리한다.

## 5. Prompt Engineering

1. 요구사항과 구현의 공백을 기록한다.
2. 개념·공식·현지화·예제·단계·세션·응답 모델을 PostgreSQL에 추가한다.
3. 정확한 유리수 연산과 오개념 탐지를 구현한다.
4. 콘텐츠 조회·세션 시작·단계 응답·완료 API를 구현한다.
5. 분수 덧셈 콘텐츠를 8개 언어로 시드한다.
6. 단위·정적·통합 테스트를 실행한다.

## 6. Workflow Engineering

`진단 취약 주제 → 학습 세션 → 개념·공식 조회 → 이해 → 시각 연결 → 안내 연습 → 공식 회상 → 새 문제 적용 → 숙달 판정 → 복습 예약·성장 기록`

## 7. Memory Engineering

남길 것은 콘텐츠 버전, 단계별 결과, 힌트 수준, 오개념 코드, 숙달도, 완료 시각이다. 학생 답안 원문은 학습 응답 테이블에만 최소 범위로 저장하고 로그·감사 metadata에는 남기지 않는다. 공식 실행 코드, 미사용 중간 콘텐츠, 정답이 포함된 클라이언트 payload는 남기지 않는다.

## 8. Loop Engineering

정답 경로, 오개념 후 교정 경로, 힌트 사용 경로, 단계 건너뛰기, 중복 요청, 다른 학생 접근, 8개 언어 조회를 반복 검증한다. 다섯 단계가 모두 통과하고 숙달 기준을 만족하며 PostgreSQL 통합 테스트가 PASS일 때 종료한다.

## API

- `GET /api/v1/concepts/{conceptId}/lesson?locale=ko`
- `POST /api/v1/learning-sessions/{sessionId}/formula-lessons`
- `GET /api/v1/formula-lessons/{formulaSessionId}`
- `POST /api/v1/formula-lessons/{formulaSessionId}/responses`
- `POST /api/v1/formula-lessons/{formulaSessionId}/complete`

조회 응답은 단계의 문제·상호작용·힌트 개수만 제공하고 `expected_response`와 `scoring_rule`은 서버에만 둔다.
