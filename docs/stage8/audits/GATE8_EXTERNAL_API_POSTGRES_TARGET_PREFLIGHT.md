# Gate 8 외부 API·PostgreSQL 대상 검증 보고서

## 결과

- 상태: `PASS_EXTERNAL_API_POSTGRES_TARGET_VERIFIED`
- 구조: `Cloudflare Workers Free + Hyperdrive + Neon PostgreSQL Free`
- 환경: `DEVELOPMENT`
- 배포 주소: `https://mathchakchak-free-dev.mathchakchak-product.workers.dev`
- 운영 출시: 승인되지 않음

## 실제 검증

- Neon Free 프로젝트와 PostgreSQL 16 개발 브랜치 생성
- 정방향 마이그레이션 `41/41` 적용
- `mathchakchak` 스키마 테이블 `140`개 확인
- 최초 `app_user`·최종 `commercial_ops_product_review` 테이블 확인
- Cloudflare Hyperdrive 구성 목록 재조회 PASS
- Worker dry-run PASS, 실제 배포 PASS, 시작 시간 `25ms`
- `/`, `/curriculum/?locale=ko&grade=E4`, `/readyz`, `/api/v1/locales` 모두 HTTPS `200`
- `/readyz`: API `READY`, DB `READY`, bridge `EMBEDDED_CONNECTED`
- 미인증 보호 API `401`
- 보안 헤더 PASS

## CPU 실측과 남은 위험

실시간 Worker trace 표본 15건은 모두 outcome `ok`였고 `exceededCpu`는 0건이다. 관찰 CPU 범위는 `0~23ms`였으며, 최초 DB 준비 요청 1건이 Workers Free의 명목상 10ms 기준을 넘었다. 이후 관찰된 준비 요청은 5ms였다.

따라서 `CLOUDFLARE_WORKERS_FREE_CPU_BUDGET_NOT_MEASURED`는 해소했지만, `CLOUDFLARE_FREE_COLD_START_CPU_OPTIMIZATION_REQUIRED` 위험은 운영 승격 전에 남긴다.

## 보안 경계

- DB 연결 문자열과 Worker Secret은 공급자 구성에만 사용했다.
- 원문 자격증명은 저장소·문서·로그 증거에 저장하지 않았다.
- AI 공급자는 비활성, 운영 트래픽과 제품 출시는 미승인 상태다.

## 다음 입력

`D80_10_CONTROL_EVIDENCE_REFERENCE`
