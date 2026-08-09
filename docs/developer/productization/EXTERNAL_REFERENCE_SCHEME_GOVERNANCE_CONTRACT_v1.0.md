# 외부 참조 scheme 거버넌스 계약 v1.0

## 목적

외부 증적 참조 scheme을 allowlist에 등록하기 전에 필요한 제안, 직무분리, 대상 제한, 만료·철회·재승인 조건을 정의한다. 이 계약은 실제 scheme 등록 권한을 제공하지 않는다.

## 제안과 대상 범위

제안은 `proposal_id`, scheme, authority, bucket/container, path prefix, region, tenant, owner, 업무 근거, 요청 만료일의 10개 필드를 요구한다. 대상 제한은 scheme·authority·bucket/container·path prefix·region·tenant 6개이며 wildcard authority와 무제한 경로를 금지한다.

## 직무분리

제안자, 개인정보 승인자, 보안 승인자는 서로 달라야 한다. 승인 역할은 `PRIVACY_APPROVER`와 `SECURITY_APPROVER`이며 UI 표시가 아닌 Service·DB 정책에서 다시 검증해야 한다.

## 생명주기

정의 상태는 `NOT_PROPOSED`, `PRIVACY_REVIEW`, `SECURITY_REVIEW`, `APPROVED_INACTIVE`, `ACTIVE`, `REVOKED`, `EXPIRED`다. 현재는 `NOT_PROPOSED`만 저장하며 실제 전이 API는 없다.

scheme·authority·path·자격 회전·소유권·정책 만료 변경은 재승인을 요구한다. 최대 유효기간은 외부 정책이 없으므로 NULL이며 만료와 철회는 필수다.

## 안전 경계

실제 제안, 승인·반려, allowlist 쓰기·활성화, 외부 조회, 증적 제출, 생명주기 전이, 철회·재승인 쓰기, 자동 승격과 연결·실행을 제공하지 않는다. PostgreSQL 계약·정책은 append-only다.
