# 수학착착 외부 API·PostgreSQL 개발 대상 결정 v1.1

## 결정

- API·정적 화면: `Cloudflare Workers Free`
- PostgreSQL 연결: `Cloudflare Hyperdrive Free`
- 데이터베이스: 외부 관리형 PostgreSQL 개발 무료 티어
- 권고 조합: `Workers Free + Hyperdrive Free + Neon PostgreSQL Free`
- 환경: `DEVELOPMENT`
- 운영·상용 출시 승인: 아직 아님

Cloudflare Containers는 Workers Paid 전용이므로 이번 개발 대상에서 제외한다. 현재
Workers의 `nodejs_compat`와 `cloudflare:node`의 `httpServerHandler`가 기존
`node:http` 서버를 감쌀 수 있으므로, 기존 API 라우팅과 저장소를 별도 구현으로
복제하지 않는다. `pg@^8.16.3`은 Hyperdrive 연결 문자열을 사용한다.

Cloudflare는 이 구성에서 PostgreSQL 데이터베이스 자체를 제공하지 않는다.
Hyperdrive는 외부 PostgreSQL의 연결·풀링 계층이므로 관리형 PostgreSQL 무료 개발
대상은 별도로 생성·확정해야 한다.

## 구현 정본

- 정적·API 라우팅: `infra/cloudflare/worker.mjs`
- 기존 Node API 어댑터: `infra/cloudflare/api-runtime.mjs`
- Free Worker 진입점: `infra/cloudflare/free-worker.mjs`
- Free 설정: `wrangler.free.jsonc`
- 로컬 번들 검사: `npm run cloudflare:free:dry-run`

`SESSION_HMAC_SECRET`은 Worker Secret으로, PostgreSQL 연결 문자열은 Hyperdrive
구성으로만 주입한다. 저장소·문서·로그에는 원문을 남기지 않는다. 바인딩이 하나라도
없으면 API는 `503 CLOUDFLARE_FREE_RUNTIME_NOT_CONFIGURED`로 차단한다.

## 외부 대상 입력 계약

원문 URL이나 Secret 대신 다음 내부 참조만 사용한다.

```text
target_reference=MCC-CF-WORKER-FREE-DEV-2026-001
provider_code=CLOUDFLARE_WORKERS_HYPERDRIVE_NEON_POSTGRESQL
environment_code=DEVELOPMENT
connection_reference=MCC-NEON-PG-DEV-2026-001
```

허용 provider code:

- `CLOUDFLARE_WORKERS_HYPERDRIVE_NEON_POSTGRESQL`
- `CLOUDFLARE_WORKERS_HYPERDRIVE_SUPABASE_POSTGRESQL`
- `CLOUDFLARE_WORKERS_HYPERDRIVE_AWS_RDS_POSTGRESQL`

## 다음 외부 게이트

1. Cloudflare 인증을 새 토큰으로 읽기 전용 재검증
2. 관리형 PostgreSQL 개발 대상 생성·연결
3. migration `0001~0040` 적용과 롤백·재적용 검증
4. Hyperdrive 구성 ID와 연결 내부 참조 기록
5. Worker Secret 주입
6. 검증 SHA를 보호된 GitHub `development` Environment로 배포
7. 공개 `/readyz`, `/api/v1/locales`, 핵심 학습 E2E 실측
8. Workers Free 요청당 CPU 예산과 일일 요청 한도 실측

현재는 코드·단위 테스트·Wrangler dry-run만 완료됐다. 실제 Cloudflare 리소스,
PostgreSQL, Secret, 배포는 생성하지 않았으므로 Gate 8은 `BLOCKED_EXTERNAL`이다.
