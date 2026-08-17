# 외부 참조 소유권 증명·DNS 무결성 인계 계약 v1.0

## 목적

외부 참조 대상의 소유권과 DNS 결과를 검증하기 전에 필요한 메타데이터, 발급자 신뢰, 만료·철회·재검증 요건을 고정한다. 이 계약은 증명을 실제 접수하거나 검증하는 권한을 제공하지 않는다.

## 증명 형식

proof ID·유형·대상 범위·issuer·발급/만료 시각·불변 evidence 참조와 SHA-256·서명 참조와 알고리즘·철회 endpoint 참조·nonce를 요구한다. 현재 모든 실제 값은 NULL이다.

## 발급자 신뢰

issuer identity, 대상 권한 결합, 승인 trust anchor, 활성 signing key, 승인 알고리즘, 인증서 체인, 최신 철회 상태, 별도 검토자 승인을 요구한다. issuer와 reviewer는 달라야 한다.

## TTL·철회·DNS snapshot

증명 만료, issuer key 회전, trust anchor·대상·DNS·region 변경, 철회 이벤트, 검증 정책 개정 시 재검증한다. DNS snapshot은 resolver identity·canonical answer hash·TTL·region을 포함하지만 현재 생성·저장되지 않는다.

## 안전 경계

원문·자격·비밀 저장을 금지한다. 증명 제출·검증, DNS snapshot 생성, 철회 polling, allowlist 쓰기·활성화, 외부 fetch·연결·실행 API는 없다. PostgreSQL 계약과 요건은 append-only다.
