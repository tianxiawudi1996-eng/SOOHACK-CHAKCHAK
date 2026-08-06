# 수학착착 API·PostgreSQL 로컬 스테이징 Runbook

## 기동과 서명 비밀값

비밀값은 저장소에 저장하지 않고 실행 시점에 생성하거나 secret manager에서 주입한다.

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$env:MATHCHAKCHAK_STAGE_SESSION_SECRET = [Convert]::ToBase64String($bytes)
docker compose -f infra/deployment/compose.api-staging.yaml up -d --build
```

- API: `http://127.0.0.1:4181/healthz`
- readiness: `http://127.0.0.1:4181/readyz`
- metrics: `http://127.0.0.1:4181/metrics`
- PostgreSQL: Docker network 내부 전용, 호스트 포트 없음

## 검증

```powershell
$env:TEST_SESSION_HMAC_SECRET = $env:MATHCHAKCHAK_STAGE_SESSION_SECRET
npm.cmd run test:integration:api
npm.cmd run test:operations:runtime
Remove-Item Env:TEST_SESSION_HMAC_SECRET
```

서명 세션, 원시 identity 헤더 거부, DB 핵심 여정, readiness, metrics가 통과해야 한다. 셸 작업이 끝나면 `MATHCHAKCHAK_STAGE_SESSION_SECRET` 환경변수도 제거한다.

## API 재시작·지속성 확인

```powershell
docker restart mathchakchak-api-staging-api-1
```

재시작 후 readiness와 서명 인증 통합테스트가 다시 통과해야 한다.

## 종료·rollback

```powershell
docker compose -f infra/deployment/compose.api-staging.yaml down
```

Compose 해석 시 세션 환경변수가 필요하다. DB는 `tmpfs`를 사용하므로 종료 시 합성 데이터가 제거된다. 운영 데이터와 영구 볼륨은 사용하지 않는다.

## 통제

- 로컬 trust DB 인증은 이 격리 구성에서만 허용한다.
- 외부 승격 시 TLS, 관리형 비밀값, 실제 인증 게이트웨이가 필요하다.
- DB 포트를 호스트 또는 외부 네트워크에 게시하지 않는다.
- 토큰·비밀값·답안 원문을 로그에 기록하지 않는다.
