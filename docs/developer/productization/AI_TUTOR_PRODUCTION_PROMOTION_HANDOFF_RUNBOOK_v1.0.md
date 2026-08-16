# AI 튜터 운영 승격 handoff 런북 v1.0

## 목적

Phase 54가 실제 관찰 80건과 단일 제품 책임자 검토를 통과한 뒤 운영 승격에 필요한 12개 외부 통제를 참조로 묶는다. secret 원문은 저장하지 않는다.

## 필수 통제

운영 프로젝트 분리, 중앙 secret manager, 미성년자 보존·동의, 연령 적합 안전 필터, 사람 감독, provider rate·spend limit, model·prompt 불변 pin, 중앙 예산 카운터, 모니터링·알림, rollback·kill switch 훈련, 사고 대응·데이터 권리 절차가 모두 필요하다.

## 배포 경계

초기 트래픽은 0%, feature flag는 OFF, 배포 창은 최대 30분이다. 모든 증거와 단일 제품 책임자 승인이 있어도 이 Phase는 dry-run handoff만 만들며 실제 배포는 허가하지 않는다.

## 현재 상태

Phase 54 차단, 통제 0/12, 배포 창 `PENDING_EXTERNAL`, 승인 `NOT_REQUESTED`, API 키·배포·학생 트래픽·운영 승격 모두 false다.
