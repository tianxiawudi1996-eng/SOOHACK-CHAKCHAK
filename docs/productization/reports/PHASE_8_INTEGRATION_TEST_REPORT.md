# Phase 8 통합테스트 완료 보고

## 판정

- Phase 8: `VERIFIED`
- 검증 범위: `LOCAL_ISOLATED_FULL_STACK`
- 프런트엔드: PASS
- 제품 API: PASS
- PostgreSQL 16 연결: PASS
- 핵심 사용자 여정: PASS
- Phase 9 진입: `ALLOWED`

## 실제 런타임

- 웹: `http://127.0.0.1:4180/?locale=ko`
- API: `http://127.0.0.1:4181`
- API 컨테이너: `healthy`
- PostgreSQL 컨테이너: `healthy`
- DB 외부 포트: 미노출
- 데이터: 합성 테스트 학생·문제만 사용

## 통과한 핵심 여정

`health → locale 8개 조회 → 진단 생성 → 진단 응답 2개 → 진단 완료·학습 경로 생성 → 학습 세션 생성·조회 → 답안 3개 → 세션 완료 → 진행 리포트 조회`

검증 결과:

- 서버 측 정답 판정 PASS
- 진단 정확도 1/2 확인
- 학습 정확도 2/3 확인
- 어려운 주제 집계 확인
- Idempotency-Key 동일 요청 재생 PASS
- 동일 키의 변조 요청 409 거부 PASS
- 필수 키 누락 400 거부 PASS
- 타 학생 접근 403 거부 PASS
- 잘못된 locale 400 거부 PASS
- API 재시작 후 진행 데이터 유지 PASS
- API 로그 민감 응답값 검사 PASS

## 발견·수정한 결함

1. `P8-SEC-001`: 정적 Nginx 보안 응답 헤더 6개 적용
2. `P8-NET-002`: DB 비노출을 유지하면서 API만 `127.0.0.1:4181`에 게시하도록 네트워크 수정

## 외부 승격 경계

현재 인증 헤더는 로컬 통합검사용 신뢰 게이트웨이 계약이다. 외부 환경에서는 인증된 게이트웨이만 이 헤더를 주입해야 하며, 클라이언트가 API에 직접 주입할 수 있어서는 안 된다. 로컬 DB의 trust 인증도 외부 환경에서 금지하며 TLS와 secret-manager 참조가 필요하다.

## 다음 단계

Phase 9에서 운영 runbook, 관측성·알림, 백업·복구, 외부 인증 경계, 배포 승격·rollback, 유지보수 주기를 구현하고 검증한다.
