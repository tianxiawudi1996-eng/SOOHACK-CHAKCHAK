# 수학착착 Phase 24 제품 보안 강화 보고서

## 목표와 범위

기존 수학 학습·캐릭터·PostgreSQL 데이터 모델을 변경하지 않고 세션, 요청 본문, 브라우저 출처, 응답 헤더, 공급망과 Secret 경계를 강화했다. 외부 운영 배포나 침투 테스트를 수행했다고 주장하지 않는다.

## 구현 결과

- HMAC Bearer 토큰을 최대 4KiB로 제한하고 `exp > iat`, issuer, audience, role, 최대 15분 수명을 검증한다.
- 브라우저의 POST·PUT·PATCH·DELETE 요청은 Origin이 존재할 때 명시적 허용목록만 통과한다.
- 본문이 있는 요청은 JSON 또는 `+json` MIME만 허용하며 64KiB를 초과하면 처리 전에 거절한다.
- Idempotency-Key를 8~128자의 안전 문자로 제한한다.
- 테스트 신뢰 헤더는 `RUNTIME_ENV=test` 이외 환경에서 시작 자체를 거절한다.
- Web/API 모두 CSP·nosniff·frame 차단·referrer·permissions·COOP·CORP·cross-domain-policy를 제공한다.
- 로컬 HTTP에는 HSTS를 발행하지 않으며 외부 HTTPS 승격 조건으로 남긴다.

## 검증 결과

- 단위 테스트: 59/59 PASS
- 신규 보안 통합 역조건: 1/1 PASS
- PostgreSQL 전체 통합 회귀: 15/15 PASS
- Web 보안 헤더: 8/8 PASS
- API 보안 헤더: 8/8 PASS
- npm 알려진 취약점: 0건
- 정적 Secret 패턴: 0건
- Web/API/Database 컨테이너: healthy
- 전체 Phase 0~24 제품화 회귀: PASS

## 실패·수정 기록

기준선에서는 CORP와 cross-domain-policy가 Web에 없었고 API에는 permissions·COOP·CORP·cross-domain-policy가 없었다. 공통 API 헤더와 Nginx 헤더를 추가했다. 기존에는 Origin과 JSON MIME을 검증하지 않았으므로 요청 처리 시작 전에 각각 403과 415로 차단하도록 보강했다. 최종 npm 감사의 첫 재확인은 샌드박스 네트워크 차단으로 실패했으나 외부 네트워크 권한으로 같은 명령을 재실행해 취약점 0건을 확인했다.

## 남은 차단 조건

외부 HTTPS/HSTS, 관리형 IdP, 중앙 Secret Manager, WAF·분산 속도 제한, 승인된 침투 테스트는 외부 대상과 권한이 제공되기 전까지 `BLOCKED_EXTERNAL_CONFIGURATION`이다.

## 다음 Phase

전체 회귀 통과 후 Phase 24를 `AUTO_VERIFIED_LOCAL_SECURITY`로 종료한다. 다음 Phase 25는 학습 관측성·품질 지표와 개인정보 최소화된 제품 분석 체계를 구축한다.
