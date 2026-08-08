# 수학착착 API Runtime v1.0

## 런타임

- Node.js 24 HTTP server
- PostgreSQL 16 via `pg`
- JSON UTF-8 `/api/v1`
- 응답 봉투와 `Content-Language`는 `API_CONTRACT_v1.0.md`를 따른다.

## 구현된 Phase 8 경로

- `GET /healthz`
- `GET /readyz`
- `GET /metrics`
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
- 학생 소유권은 서명 세션의 사용자 ID와 학생 프로필 관계를 DB에서 확인한다.
- 로그에는 답안·문제·토큰·비밀번호를 남기지 않는다.
- API 응답은 `no-store`와 방어 보안 헤더를 사용한다.
- 운영 메트릭은 요청 수, 5xx 수, 지연시간 histogram, uptime만 포함한다.

## 인증 인계

API는 `mcs1` HMAC-SHA256 단기 세션 토큰의 issuer, audience, role, 발급·만료시각, 사용자·학생 UUID를 검증한다. 서명 비밀값은 최소 32바이트이며 저장소에 저장하지 않는다. 로컬 스테이징에서도 원시 `x-user-id`, `x-student-id`, `x-role` 헤더는 거부한다. 외부 배포에서는 실제 identity provider 또는 인증 게이트웨이가 이 단기 토큰을 발급하고 비밀값을 관리형 secret manager에서 공급해야 한다.

## Phase 33 외부 증거 수신 어댑터 계약

- `POST /api/v1/privacy-operations/evidence-validation-contracts/{id}/intake-adapter-contracts`
- `GET /api/v1/privacy-operations/intake-adapter-contracts/{id}`

생성 경로는 `SECURITY_APPROVER` 전용이며 최신 Phase 32 계약, 패키지 만료·후속 리비전·법적 보존·SHA-256을 검증한다. 결과는 6개 포트의 외부 미구성 계약만 append-only로 기록한다. 네트워크 연결, 증거 제출, 격리 해제, retry, 실행 승인 경로는 구현하지 않는다.

## Phase 34 외부 연결 사전 수락 패킷

- `POST /api/v1/privacy-operations/intake-adapter-contracts/{id}/connection-acceptance-packets`
- `GET /api/v1/privacy-operations/connection-acceptance-packets/{id}`

생성 경로는 `SECURITY_APPROVER` 전용이다. 최신 Phase 33 어댑터 계약과 패키지 유효성·법적 보존·SHA-256을 확인하고 인증서·신뢰 저장소·키 회전·접속 허가·복구·운영 수락 요구사항만 기록한다. 구성 제출, 승인, 외부 테스트, 연결 경로는 구현하지 않는다.

## Phase 35 외부 구성 증적 메타데이터 대기열 계약

- `POST /api/v1/privacy-operations/connection-acceptance-packets/{id}/configuration-evidence-queue-contracts`
- `GET /api/v1/privacy-operations/configuration-evidence-queue-contracts/{id}`

생성 경로는 `SECURITY_APPROVER` 전용이다. 최신 Phase 34 패킷과 패키지·법적 보존·SHA-256을 검증하고 불변 참조·해시 메타데이터 슬롯만 만든다. 증적 제출, 외부 참조 fetch, enqueue, 검토 결정, 자동 승격과 활성화 경로는 구현하지 않는다.
