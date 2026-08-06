# 수학착착 API Runtime v1.0

## 런타임

- Node.js 24 HTTP server
- PostgreSQL 16 via `pg`
- JSON UTF-8 `/api/v1`
- 응답 봉투와 `Content-Language`는 `API_CONTRACT_v1.0.md`를 따른다.

## 구현된 Phase 8 경로

- `GET /healthz`
- `GET /api/v1/locales`
- `POST /api/v1/diagnostics`
- `POST /api/v1/diagnostics/{id}/responses`
- `POST /api/v1/diagnostics/{id}/complete`
- `POST /api/v1/learning-sessions`
- `GET /api/v1/learning-sessions/{id}`
- `POST /api/v1/learning-sessions/{id}/answers`
- `POST /api/v1/learning-sessions/{id}/complete`
- `GET /api/v1/students/{id}/progress`

## 안전 경계

- 모든 쓰기는 `Idempotency-Key`를 요구한다.
- 정답 판정은 DB의 `answer_schema`를 이용해 서버에서 수행한다.
- 학생 소유권은 사용자 ID와 학생 프로필 관계를 DB에서 확인한다.
- 로그에는 답안·문제·토큰·비밀번호를 남기지 않는다.
- API 응답은 `no-store`와 방어 보안 헤더를 사용한다.

## 인증 인계

`x-user-id`, `x-student-id`, `x-role`은 로컬 격리 통합을 위한 신뢰 게이트웨이 입력이다. 외부 배포 전에 인증된 게이트웨이가 서명된 세션을 검증하고 이 값을 주입하도록 변경해야 한다. 인터넷 클라이언트가 해당 헤더를 직접 신뢰받아서는 안 된다.
