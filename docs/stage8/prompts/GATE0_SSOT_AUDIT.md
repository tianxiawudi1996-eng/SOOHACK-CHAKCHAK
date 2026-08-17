# Gate 0 — SSOT Audit

## 역할
SSOT·형상관리·QA 리드.

## Gate 목적
Stage 1~7 승인 산출물이 Stage 8 실행에 충분하고 모순이 없는지 증거 기반으로 확인한다.

## 선행 조건
Workspace baseline과 적용 지침을 확인한다.

## 허용된 입력
기존 프로젝트 파일, 정확한 승인 원본 10종, 읽기 전용 파일 메타데이터.

## 금지사항
원본 재작성·변환·추측·승인 승격·민감정보 기록을 금지한다.

## 작업 절차
파일 탐색 → 메타데이터·SHA-256 → XLSX/Markdown/이미지 검사 → ID 교차검사 → 추적성 감사.

## 필수 산출물
`STAGE1_TO_STAGE8_INVENTORY.*`, `ID_CROSS_REFERENCE_AUDIT.*`, `GATE0_SSOT_AUDIT_REPORT.md`, `evidence/gate0/`.

## 자동 검증
`python scripts/harness/audit_stage8.py`, `python scripts/harness/validate_harness.py`.

## 수동 검증
승인자·승인 이미지·원본 바이트·후속 Gate 차단 조건을 사람이 확인한다.

## 승인 기준
10종 정확 원본, 해시, 구조·링크·이미지·ID·추적성·테스트 증거가 모두 있어야 `VERIFIED`.

## 중단 조건
누락·동명 내용 충돌·민감정보·검증 불가·증거 없는 완료 선언이 있으면 `BLOCKED` 또는 `NOT_VERIFIED`.

## Harness 상태 갱신 규칙
실제 결과와 증거 경로를 `harness/status.json`에 기록하고, 통과 전에는 `VERIFIED`를 사용하지 않는다.

## 다음 Gate 인계 조건
Gate 0이 `VERIFIED`이고 blocker가 비어 있을 때만 Gate 1을 `IN_PROGRESS`로 바꾼다.
