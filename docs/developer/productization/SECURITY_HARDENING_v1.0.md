# Phase 24 제품 보안 경계 설계 v1.0

## 목표와 사용자 변화

학습자 요청이 변조·과대·교차 출처 입력으로부터 일관되게 보호되며, 운영자는 보안 경계를 자동 검사로 재현할 수 있다. 학습 로직과 PostgreSQL 스키마는 변경하지 않는다.

## 요구사항

| ID | 입력·처리 | 관찰 가능한 인수 기준 |
|---|---|---|
| P24-SEC-001 | HMAC Bearer 토큰 | 4KiB 초과, 변조, 만료, `exp <= iat`, 잘못된 issuer/audience/role을 401로 거절한다. |
| P24-SEC-002 | JSON 쓰기 본문 | 본문이 있으면 JSON 계열 MIME만 허용하고 64KiB 초과는 413, 다른 MIME은 415로 처리한다. |
| P24-SEC-003 | 브라우저 쓰기 요청 | `Origin`이 존재하면 명시적 허용목록만 통과하고 `null`·미허용 출처는 403으로 처리한다. 비브라우저의 Origin 없는 요청은 Bearer 인증을 계속 요구한다. |
| P24-SEC-004 | 요청 식별·신뢰 경계 | Idempotency-Key는 8~128자 안전 문자만 허용하고 신뢰 헤더는 `RUNTIME_ENV=test`에서만 활성화한다. |
| P24-SEC-005 | HTTP 응답 | Web/API에 CSP, nosniff, frame 차단, referrer, permissions, COOP, CORP, cross-domain-policy를 제공한다. |
| P24-SEC-006 | 공급망·Secret | npm 알려진 취약점과 고위험 Secret 패턴이 각각 0건이어야 한다. |

## 데이터 흐름과 권한

`Browser → Nginx 보안 헤더/동일 출처 → API Origin·MIME·크기 검사 → Bearer 검증 → Service/Repository 소유권 → PostgreSQL` 순서다. Origin 검사는 인증을 대체하지 않으며 Controller에 SQL을 추가하지 않는다.

## 상태·오류 계약

- 인증 없음·토큰 오류: `401 UNAUTHENTICATED`
- 소유권 위반: `403 FORBIDDEN`
- 미허용 Origin: `403 ORIGIN_FORBIDDEN`
- 64KiB 초과: `413 PAYLOAD_TOO_LARGE`
- JSON 이외 본문: `415 UNSUPPORTED_MEDIA_TYPE`
- 부적합 Idempotency-Key: `400 IDEMPOTENCY_KEY_REQUIRED`

모든 오류 응답은 상세 내부 오류나 토큰을 노출하지 않고 요청 ID와 메시지 키만 반환한다.

## 환경 경계

로컬 스테이징은 HTTP이므로 HSTS를 의도적으로 발행하지 않는다. 외부 승격은 HTTPS가 확인된 호스트에서만 HSTS를 적용한다. 관리형 IdP, 중앙 Secret Manager, WAF, 분산 속도 제한, 외부 침투 테스트는 별도 승인·구성이 필요하다.
