# 제한적 운영 확대 종합 의사결정 런북 v1.0

## 목적

Phase 59 승인 결과를 SHA-256으로 결속하고 제한적 운영 확대 판단에 필요한 20개 증거를 검증한다. 이 런북은 확대 실행이나 트래픽 권한을 생성하지 않는다.

## 증거 범위

- 품질·안전·개인정보·보안
- 비용·provider 오류율·fallback율·p95 latency
- 8개 로케일 동등성·접근성
- 사람 평가 calibration·비한국어 언어 검토
- 삭제·incident·kill switch·rollback
- feature flag OFF·rate/spend limit
- 학생·공개 트래픽 차단

## 수학착착 로컬 임계값

안전 위반·PII·정답 유출·예산 초과는 0건, provider 오류율은 최대 1%, fallback율은 최대 5%, p95 latency는 최대 5초로 정의한다. 이는 수학착착의 보수적 의사결정 정책이며 OpenAI 의무 수치로 주장하지 않는다.

## 판정

20/20 증거와 승인된 decision window가 있어야 단일 제품 책임자 검토를 요청한다. 하나라도 반려되면 feature flag를 OFF로 유지한다. 제품 책임자 승인 후에도 다음 비실행 확대 계획 handoff만 생성하며 학생·공개 트래픽과 운영 승격은 허용하지 않는다.

## 현재 상태

Phase 59는 외부 차단 상태다. 종합 증거 0/20, decision window `PENDING_EXTERNAL`, review `NOT_REQUESTED`, 확대 실행·dispatch·provider·flag 변경·학생/공개 트래픽은 모두 false다.
