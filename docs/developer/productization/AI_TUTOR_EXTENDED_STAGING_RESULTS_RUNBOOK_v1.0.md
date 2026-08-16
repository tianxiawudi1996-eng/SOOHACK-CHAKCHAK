# AI 튜터 확장 스테이징 결과 수집·판정 런북 v1.0

## 목적

승인된 Phase 53 관찰에서 생성된 80건의 참조·정량 지표만 수집하고 운영 승격 검토 가능 여부를 판정한다. 입력·응답 원문과 학생 식별자는 수집하지 않는다.

## 진입 조건

- Phase 53 상태 `READY_FOR_EXTENDED_STAGING_OBSERVATION_HANDOFF`
- Phase 53 대장 SHA-256 일치
- 8개 로케일 각각 10건, 총 80건
- 관찰 종료 후 kill switch `REARMED`
- rollback 또는 fallback 복귀 증거 참조

## 판정

스키마·역할·로케일 성공률 100%, 안전·정답 유출·개인정보·버전 불일치·예산·kill switch 실패 0건을 요구한다. provider 오류율 5% 이하, fallback 10% 이하, p95 1,500ms 이하를 요구한다. 이 수치는 수학착착 프로젝트 정책이다.

임계치 위반은 `REJECT_AND_ROLLBACK`이며 완료된 rollback 증거가 필요하다. 모든 임계치 통과 후에도 단일 제품 책임자 검토를 거쳐 `EXTENDED_STAGING_ACCEPTED_FOR_PRODUCTION_HANDOFF`까지만 허용한다. 운영 승격은 이 Phase가 허가하지 않는다.

## 현재 상태

Phase 53은 차단 상태이며 결과는 0/80이다. provider 호출, API 키 접근, 관찰 실행, 학생·운영 트래픽, 운영 승격은 모두 false다.
