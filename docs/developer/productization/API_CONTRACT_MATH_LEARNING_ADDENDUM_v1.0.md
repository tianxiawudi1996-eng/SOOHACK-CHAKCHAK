# 수학 공식 학습 API 계약 보강 v1.0

기존 `/api/v1` 공통 인증·idempotency·오류 봉투 규칙을 그대로 적용한다.

| Method | Path | 기능 | 통제 |
|---|---|---|---|
| GET | `/concepts/{conceptId}/lesson?locale={locale}` | 현지화 공식·유도·예제·5단계 메타데이터 조회 | 인증·소유 학생, 정답 비노출 |
| POST | `/learning-sessions/{sessionId}/formula-lessons` | 해당 취약 주제 공식 학습 시작 | 소유권·활성 세션·idempotency |
| GET | `/formula-lessons/{formulaSessionId}` | 현재 단계·숙달도·오개념 요약 조회 | 소유권, 정답 비노출 |
| POST | `/formula-lessons/{formulaSessionId}/responses` | 현재 단계 응답 제출 | 단계 순서·서버 채점·idempotency |
| POST | `/formula-lessons/{formulaSessionId}/complete` | 공식 학습 완료 | 단계 5/5·숙달도 0.8 이상 |

응답 제출 예:

```json
{
  "response_value": {"value": "5/6"},
  "hint_level": 0,
  "duration_ms": 1200
}
```

오답 응답에는 `outcome`, `misconception_code`, 현재 단계의 다음 힌트만 포함한다. `expected_response`, `scoring_rule`, 다른 단계의 정답은 포함하지 않는다.
