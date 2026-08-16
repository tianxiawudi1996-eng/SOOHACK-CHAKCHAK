# 대치동 수준 전문 학습 트랙 설계 v1.0

## 목적

학생을 과장된 단일 등급으로 분류하지 않고, 기존 PostgreSQL 학습 기록에서 계산한 최소 집계 근거로 다음 학습 트랙과 주간 행동을 설명한다.

## 데이터 흐름

```text
Browser
→ GET /api/v1/students/{studentId}/academy-readiness?target={track}
→ Session authentication and student-scope authorization
→ Repository: progress + learning-quality aggregate query
→ Domain: academy-readiness evidence gate
→ Privacy-minimized response
→ Specialist dashboard
```

Controller에는 SQL이나 승급 규칙을 두지 않는다. Repository는 기존 집계 조회를 조합하고, 도메인 모듈은 순수 함수로 승급 기준을 평가한다.

## 전문 트랙과 최소 게이트

| 트랙 | 최소 답안 | 정확도 | 장기 회상 | 응용 숙달 | 독립 풀이 |
|---|---:|---:|---:|---:|---:|
| CONCEPT_RECOVERY | 0 | 0% | 0% | 0% | 0% |
| SCHOOL_EXAM | 10 | 70% | 55% | 50% | 45% |
| ADVANCED_REASONING | 25 | 80% | 70% | 65% | 60% |
| CONTEST_BRIDGE | 50 | 90% | 80% | 80% | 75% |

정확도만 높은 학생도 회상·응용·독립 풀이가 부족하면 승급하지 않는다. 표본이 부족하면 `INSUFFICIENT_EVIDENCE`로 닫힌 상태를 유지한다.

## 역할 분담

- 착착이: 불안 완화, 오답 원인 질문, 학습 순서 안내, 짧은 회고
- 공식이: 공식의 조건·유도·적용 경계 설명, 반례와 심화 연결
- 시스템: 근거 집계, 트랙 게이트, 주간 계획, 개인정보 최소화
- 교사: 예외 판단, 고난도 해설 승인, 개입 우선순위 확정

## 안전·개인정보 통제

- 응답에는 원문 답안, 자유 서술, 이름, 연락처를 포함하지 않는다.
- 학생 본인 또는 허용된 보호자·교사 범위에서만 조회한다.
- 점수는 입시 가능성이나 대치동 적합성을 보증하지 않는다.
- 신뢰도 부족은 추천 보류와 추가 진단으로 처리한다.
- AI는 정답을 바로 노출하지 않고 단계 힌트를 우선한다.
