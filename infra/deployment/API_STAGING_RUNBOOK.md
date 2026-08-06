# 수학착착 API·PostgreSQL 로컬 스테이징 Runbook

## 기동

```powershell
docker compose -f infra/deployment/compose.api-staging.yaml up -d --build
```

- API: `http://127.0.0.1:4181/healthz`
- PostgreSQL: Docker network 내부 전용, 호스트 포트 없음

## 검증

```powershell
docker compose -f infra/deployment/compose.api-staging.yaml ps
npm.cmd run test:integration:api
```

두 서비스가 `healthy`이고 핵심 여정 테스트가 통과해야 한다.

## API 재시작·지속성 확인

```powershell
docker compose -f infra/deployment/compose.api-staging.yaml restart api
```

재시작 후 `GET /api/v1/students/{id}/progress`가 기존 합성 학습 결과를 반환해야 한다.

## 종료·rollback

```powershell
docker compose -f infra/deployment/compose.api-staging.yaml down
```

DB는 `tmpfs`를 사용하므로 종료 시 합성 데이터가 제거된다. 운영 데이터와 영구 볼륨은 사용하지 않는다.

## 통제

- 로컬 trust DB 인증은 이 격리 구성에서만 허용한다.
- 외부 승격 시 TLS, 관리형 비밀값, 실제 인증 게이트웨이가 필요하다.
- DB 포트를 호스트 또는 외부 네트워크에 게시하지 않는다.
