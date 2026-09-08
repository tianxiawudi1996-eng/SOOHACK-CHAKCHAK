# Mastery·오개념·문제은행 확장 계획

## M6 Mastery Engine

초기 모델은 설명 가능해야 한다. AI가 임의로 숙달도를 결정하지 않는다.

입력:
- 정오답
- 시도 횟수
- 힌트 레벨
- 응답 시간
- 오개념 코드
- 회상 성공 여부
- 적용/전이 성공 여부

출력:
- concept_mastery
- misconception_strength
- review_due
- next_activity_reason

초기 점수는 휴리스틱으로 시작하되 모든 변경 이유를 로그로 남긴다. 실제 Pilot 데이터가 쌓인 뒤 보정한다.

## M7 문제은행 규모

### Gate A — 100문항
- ALG-EQ 핵심 10 Lesson
- Lesson당 약 10문항
- 모든 문항 수동 수학 검수
- 정답/해설/난이도/오개념/힌트 태그 100%

### Gate B — 500문항
100문항 Pilot에서 오개념·난이도 분포가 검증된 뒤 변형/전이 문항을 추가한다.

### Gate C — 2,000문항
500문항에서 중복률, 난이도 calibration, 힌트 효율을 통과한 후 교육과정 확장과 함께 늘린다.

## 문항 필수 필드

- item_id
- lesson_id
- concept_id
- grade_band
- prompt
- canonical_answer
- solution_steps
- difficulty
- misconception_targets
- hint_1
- hint_2
- hint_3
- transfer_level
- provenance
- review_status

## 금지

- 2,000문항을 한 번에 AI 생성 후 무검수 등록
- 정답만 있고 오답 분석이 없는 문항
- 난이도 태그 근거 없는 임의 분류
- 라이선스가 불명확한 외부 문제 복제