# Gate 8 외부 API·PostgreSQL 대상 사전검토

## 판정

- 상태: `BLOCKED_EXTERNAL`
- 선택 구조: `Cloudflare Workers Free + Hyperdrive Free + 관리형 PostgreSQL 개발 무료 티어`
- 권고 provider code: `CLOUDFLARE_WORKERS_HYPERDRIVE_NEON_POSTGRESQL`
- 유료 전환 필요: 현재 개발 단계에서는 없음
- 실제 배포: 수행하지 않음

Cloudflare Workers의 Node.js HTTP 호환을 이용해 기존 API 서버를 재사용하는 어댑터를
구현했다. Containers Paid 가정은 제거했다. Hyperdrive는 PostgreSQL 제공자가 아니라
외부 PostgreSQL 연결 계층이므로 데이터베이스 대상과 마이그레이션은 별도 증거가
필요하다.

## 자동 검증

- Cloudflare Free 런타임·라우팅 단위 테스트: PASS
- 기존 외부 `API_ORIGIN` 브리지 회귀 테스트: PASS
- Wrangler Free Worker bundle dry-run: PASS
- 정적 자산: `96`개 읽기 성공
- 번들 업로드 예상치: `778.71 KiB`, gzip `126.75 KiB`
- Secret·연결 문자열 저장: 없음

## 필요한 내부 참조

```text
target_reference=MCC-CF-WORKER-FREE-DEV-2026-001
provider_code=CLOUDFLARE_WORKERS_HYPERDRIVE_NEON_POSTGRESQL
environment_code=DEVELOPMENT
connection_reference=MCC-NEON-PG-DEV-2026-001
```

원문 URL, 데이터베이스 비밀번호, API 토큰, Worker Secret은 이 대장에 입력하지 않는다.

## 남은 차단

1. `EXTERNAL_DEPLOYMENT_TARGET_REFERENCE`
2. `CLOUDFLARE_HYPERDRIVE_CONFIGURATION_NOT_VERIFIED`
3. `MANAGED_POSTGRESQL_TARGET_NOT_CONNECTED`
4. `CLOUDFLARE_WORKERS_FREE_CPU_BUDGET_NOT_MEASURED`

네 참조와 새 Cloudflare 인증 증거가 준비된 뒤에만 실제 리소스 생성 단계로 이동한다.
무료 Workers의 요청당 CPU 제한 안에서 핵심 API가 동작하는지도 외부 개발 환경에서
실측해야 하며, 초과 시 기능 축소 또는 유료 전환을 별도 승인한다.

Cloudflare OAuth 인증과 빈 Hyperdrive 목록 조회는 통과했다. 사용자 범위에 남은 오래된
`CLOUDFLARE_API_TOKEN` 환경변수는 OAuth보다 우선되어 오류 9109를 만들므로, 현재 실행은
그 환경변수를 자식 프로세스에서 제거한 뒤 수행했다. 토큰 값은 읽거나 저장하지 않았다.
