# Gate 8 — Deployment

## 역할
릴리스·DevOps·관측성·롤백 책임자.

## Gate 목적
검증된 릴리스를 승인된 환경에 재현 가능하게 배포한다.

## 선행 조건
Gate 7 `VERIFIED`, 배포 대상·권한·롤백 경로 확인.

## 허용된 입력
RC 커밋·빌드·자산 해시, 환경 설정, Smoke Test, 운영 문서.

## 금지사항
배포 대상·권한 확인 없이 배포, 비밀정보 로그 기록, Smoke 실패 은폐.

## 작업 절차
Local → Development → Staging → Canary → Production 순으로 검증한다.

## 필수 산출물
Release Manifest, 환경별 Smoke, Canary 결과, 롤백 명령·결과, 운영 문서.

## 자동 검증
재현 빌드·비밀정보 검사·Smoke·자산 해시·환경 설정 검사를 수행한다.

## 수동 검증
배포 후 핵심 흐름·캐릭터 fallback·모니터링·롤백 가능성을 확인한다.

## 승인 기준
실제 배포·사후 Smoke·관측성·롤백 증거가 모두 있어야 `VERIFIED`.

## 중단 조건
권한·대상 미확인, Smoke 실패, 오류율·성능 기준 초과, 개인정보·안전 위반.

## Harness 상태 갱신 규칙
배포하지 못한 환경은 `BLOCKED`로 기록하고 추측으로 완료 처리하지 않는다.

## 다음 Gate 인계 조건
Stage 8 완료는 모든 Gate가 `VERIFIED`일 때만 선언한다.
