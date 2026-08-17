# 수학착착 이벤트 계약 v1.0

## 1. 학습 행동 이벤트

Stage 7 정본 이벤트를 유지한다.

`page.enter.home`, `learning.start`, `concept.open`, `input.started`, `idle.4s`, `hint.request`, `answer.correct`, `answer.wrong.first`, `answer.wrong.repeated`, `search.loading.5s`, `search.empty`, `diagnosis.complete`, `learning.complete`, `network.error`, `idle.3m`

Gate 5 승인 전에는 제품 feature flag를 켜지 않는다.

## 2. 제품 관측 이벤트

| 이벤트 | 허용 필드 | 금지 필드 |
|---|---|---|
| `locale.resolved` | locale, source, fallback_used | IP, 정밀 위치 |
| `diagnosis.started` | locale, grade_band, topic_id | 이름, 답안 원문 |
| `diagnosis.completed` | duration_ms, outcome, route_id | 자유 입력 원문 |
| `learning.step.completed` | step, attempt_count, hint_level | 답안 원문 |
| `review.attempted` | due_bucket, outcome | 문제 원문 |
| `report.viewed` | viewer_role, period | 학생 이름 |
| `ui.error_shown` | error_code, retryable, surface | 기술 스택·예외 원문 |

## 3. 공통 봉투

```json
{
  "schema_version": "1.0",
  "event_name": "learning.step.completed",
  "occurred_at": "2026-08-06T00:00:00Z",
  "anonymous_session_id": "anon_...",
  "release": "local",
  "locale": "ko",
  "properties": {"step": "RECALL", "outcome": "SUCCESS"}
}
```

이벤트 스키마에 없는 필드는 폐기하며, 전송 전 PII denylist를 적용한다.
