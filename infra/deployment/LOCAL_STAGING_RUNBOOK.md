# 수학착착 로컬 격리 스테이징 실행·롤백 절차

## 범위

이 절차는 외부 배포 대상이 없는 동안 release artifact를 격리된 로컬 HTTP 환경에서 검증하기 위한 것이다. 운영 배포나 외부 스테이징 승인을 대신하지 않는다.

## 배포

```powershell
docker build -f infra/deployment/Dockerfile.staging -t mathchakchak-staging:0.1.0 .
docker run --name mathchakchak-staging-v010 -d -p 127.0.0.1:4180:80 mathchakchak-staging:0.1.0
```

검증 URL: `http://127.0.0.1:4180/?locale=ko`

## Health check

```powershell
docker inspect --format "{{.State.Health.Status}}" mathchakchak-staging-v010
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4180/index.html
```

응답에는 CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP 헤더가 있어야 한다.

## 최초 배포 rollback

이 release 이전에 배포된 수학착착 컨테이너가 없으므로 최초 rollback 목표는 컨테이너 없음·포트 미노출이다.

```powershell
docker rm -f mathchakchak-staging-v010
```

포트 4180이 응답하지 않는지 확인한다. 검증을 계속하려면 동일한 image digest로 다시 기동한다.

## 통제

- 정확한 컨테이너 이름과 포트가 맞는지 먼저 확인한다.
- 운영 데이터·운영 비밀값·외부 네트워크를 사용하지 않는다.
- 다른 컨테이너를 중지하거나 수정하지 않는다.
- 제거 대상은 정확히 `mathchakchak-staging-v010`으로 제한한다.
