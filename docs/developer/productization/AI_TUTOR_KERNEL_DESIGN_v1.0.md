# AI 튜터 커널 설계 v1.0

## 책임 경계

`Browser → Formula response API → deterministic scorer → PostgreSQL → Tutor feedback API → Tutor kernel → Browser`

- 결정론적 scorer가 유일한 정답·오답 판정 주체다.
- 착착이는 학습자의 시도를 인정하고 다음 사고 연결을 질문한다.
- 공식이는 현재 단계의 수학 규칙을 검증하도록 안내한다.
- 모델은 점수, 학습 단계 전이, 숙달도, 복습 일정을 변경할 수 없다.

## 최소 입력

허용: locale, stage, outcome, misconception_code, hint_level, 공식 제목·표기, 현재 질문, 현재 힌트.

금지: user ID, student ID, 이름, 원문 response_value, expected_response, scoring_rule, 세션 토큰, 보호자 정보.

## 출력·안전 계약

출력은 `chakchaki`, `gongsickyi`, `next_action`, `strategy` 네 필드의 strict JSON schema다. `next_action`은 서버 outcome과 일치해야 하며 숫자 정답을 직접 쓰는 표현은 폐기한다. 검증 실패, 1.5초 초과, API 장애, 키 미설정은 8개 로케일의 `RULE_FALLBACK`으로 전환한다.

## 저장 계약

`formula_learning_response`에 설명 JSON, mode, 모델 참조, 지연 시간, 안전 상태, 생성 시각만 저장한다. API 키는 환경변수로만 주입하고 외부 요청은 `store:false`로 구성한다. 동일 응답의 튜터 요청은 멱등 대장에서 재생한다.

## 현재 운영 경계

로컬 기본값은 `TUTOR_AI_ENABLED=false`다. 생성 제공자 어댑터는 구현됐지만 승인된 외부 키·네트워크에서 실제 호출을 검증하기 전에는 외부 AI 운영 연결로 표시하지 않는다.
