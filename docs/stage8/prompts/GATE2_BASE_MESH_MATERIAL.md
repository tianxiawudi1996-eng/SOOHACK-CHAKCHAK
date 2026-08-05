# Gate 2 — Base Mesh & Material

> **수정 상태:** 이전 절차형 GLB는 사용자에 의해 정체성·품질 불일치로 거부되었다. 이 문서의 기존 생성 결과는 승격 근거가 아니며 Gate 2는 `NOT_VERIFIED`다. 공식 기준은 상단의 기존 Stage 7 승인 이미지다.

## 역할
모델링·토폴로지·UV·LookDev 리드.

## Gate 목적
Canonical View를 실제 메시·재질·텍스처 예산으로 변환한다.

## 선행 조건
Gate 1 `VERIFIED`, Canonical 해시와 승인된 입력 존재.

## 허용된 입력
Canonical View, Character Bible, Rig Spec, 모바일 런타임 예산.

## 금지사항
실제 모델 없이 완료 주장, 임의 외형 변경, 승인 전 CapBadge 고정.

## 작업 절차
메시 → UV → 재질 → 소품 분리 → LOD → 오버레이 비교 → 무결성 QA.

## 필수 산출물
`.blend`/`.glb` 후보, 메시·UV·재질 보고서, LOD, 해시.

## 자동 검증
파일 무결성·메시·재질·텍스처 참조·비매니폴드·스케일 검사를 수행한다.

## 수동 검증
실루엣·비율·색상 drift·관통을 Canonical과 대조한다.

## 승인 기준
실제 파일과 자동·수동 증거가 모두 통과해야 `VERIFIED`.

## 중단 조건
Gate 1 미통과, 메시 파일 누락, 예산 초과, 검증 도구 부재.

## Harness 상태 갱신 규칙
검증 불가 자산은 `NOT_VERIFIED` 또는 `BLOCKED`로 기록한다.

## 다음 Gate 인계 조건
승인된 메시·재질·LOD 해시가 존재하고 Gate 2가 `VERIFIED`여야 한다.
