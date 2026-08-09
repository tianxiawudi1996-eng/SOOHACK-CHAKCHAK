# 외부 참조 대상 정규화·SSRF 방어 계약 v1.0

## 목적

외부 참조 scheme 제안 전에 authority·bucket/container·path·region·tenant를 일관되게 해석하고 SSRF·경로 우회·동형문자 공격을 fail-closed로 거부하기 위한 정책 계약이다. 이 계약은 DNS 조회나 외부 접속 권한을 제공하지 않는다.

## 정규화

엄격한 URI 문법으로 한 번만 파싱하고 scheme 소문자화, IDNA ASCII 변환, authority 소문자화·마침표 제거, 기본 포트 제거, bucket/container 정확 일치, percent decode 1회와 dot-segment 거부, region·tenant 정확 정규화를 요구한다.

## 거부 규칙

미지원 scheme, wildcard, userinfo, IP literal, 비정규 IDNA, Unicode confusable, 과도한 bucket 범위, 경로 탈출, 인코딩 separator·NUL, 무제한 path, 미승인 포트, 사설·특수 DNS 주소, DNS 재바인딩·혼합 주소 집합, authority 변경 redirect를 거부한다.

## 소유권과 DNS

authority control, bucket/container ownership, region residency, tenant ownership, DNS snapshot, egress policy review 증명을 요구한다. 현재 증명과 DNS snapshot은 모두 NULL이며 실제 조회 API도 없다. redirect 최대 횟수는 0이고 loopback·private·link-local 등 8개 주소 클래스를 금지한다.

## 안전 경계

실제 대상 입력·정규화 실행·증명 제출·DNS 조회·allowlist 쓰기·fetch·네트워크 연결·실행을 제공하지 않는다. PostgreSQL 계약과 규칙은 append-only다.
