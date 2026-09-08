# 내부 Pilot 및 학습 Telemetry v0.1

## 목적

제품 기능 수를 늘리기 전에 실제 학생이 어디에서 막히는지 측정한다.

## Pilot 1차

- 대상: 내부 사용성 테스트 최소 5명
- 범위: ALG-EQ-001 우선
- 목표: 학습효과 입증이 아니라 사용성·오개념·힌트 품질 탐색
- 권장 세션: 1인 2회
- 개인 식별정보는 로그에 저장하지 않는다.

## 필수 이벤트

- `lesson_started`
- `stage_entered`
- `answer_submitted`
- `answer_wrong`
- `hint_requested`
- `retry_submitted`
- `answer_correct`
- `self_explanation_submitted`
- `lesson_completed`
- `lesson_abandoned`

## 최소 필드

- event_id
- anonymous_session_id
- lesson_id
- stage
- item_id
- attempt_index
- outcome
- misconception_code
- hint_level
- elapsed_ms
- occurred_at

금지: 이름, 학교, 전화번호, 이메일, 원문 자유서술 답변의 무조건 저장.

## ALG-EQ 초기 오개념 코드

- `EQUALITY_AS_ANSWER_MARK`
- `ONE_SIDE_ONLY_OPERATION`
- `INVERSE_OPERATION_CONFUSION`
- `SIGN_OR_DIRECTION_ERROR`
- `ARITHMETIC_ERROR`
- `SOLUTION_CHECK_SKIPPED`
- `UNKNOWN_NOT_ISOLATED`
- `WORD_PROBLEM_MODEL_ERROR`

## 핵심 지표

- 단계별 첫 시도 정답률
- 평균 재시도 횟수
- 힌트 요청률
- Hint 1→2→3 상승률
- 포기 위치
- 완료 시간
- 동일 오개념 반복률
- 다음 세션 회상 성공률

이 지표가 M6 Mastery/오개념 Engine의 입력이 된다.