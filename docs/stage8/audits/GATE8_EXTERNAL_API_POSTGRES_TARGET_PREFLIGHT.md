# Gate 8 외부 API·PostgreSQL 대상 프리플라이트

## 결과

- 판정: `HOLD`
- 후보: `Cloudflare Containers + Neon PostgreSQL` (개발 권고)
- 로컬 API 컨테이너: 확인
- PostgreSQL migration: `40/40`
- 대상 입력: `0/4`
- 현재 Cloudflare 인증: `BLOCKED_EXTERNAL`
- 외부 생성·배포·Secret 접근: 수행하지 않음

기존 Node.js HTTP 서버와 `pg` 기반 저장소를 유지할 수 있어 Cloudflare Containers를 최소 변경 후보로 선택했다. Containers는 Workers Paid 플랜에서 제공되며, PostgreSQL은 별도 관리형 대상이 필요하다. Hyperdrive는 데이터베이스 제공자가 아니라 기존 PostgreSQL 연결 계층이므로 이번 대상 확정과 구분한다.

## 다음 입력

아래 값은 형식 예시이며 실제 외부 증거로 등록되지 않았다.

```text
target_reference=MCC-CF-CONTAINERS-DEV-2026-001
provider_code=CLOUDFLARE_CONTAINERS_NEON_POSTGRESQL
environment_code=DEVELOPMENT
connection_reference=MCC-NEON-PG-DEV-2026-001
```

원문 URL, 연결 문자열, 비밀번호와 API 토큰은 입력하지 않는다. 네 참조 검증 후 Cloudflare 인증 갱신과 Workers Paid·Containers 권한을 읽기 전용으로 재확인한다.
