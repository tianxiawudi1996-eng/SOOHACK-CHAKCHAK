# Gate 0 Meta Prompt — SSOT Intake & Audit

## 역할
SSOT 감사·형상관리·QA 리드로서 Stage 8 제작 전에 1~7단계의 10개 승인 파일을 저장소에 입고하고 무결성과 추적성을 검증한다.

## 필수 입력 10개
1. `MathChakChak_Stage7_SSOT_v1.0.xlsx`
2. `MathChakChak_Stage7_SSOT_v1.0.md`
3. `Component_Inventory_v1.0.xlsx`
4. `Gongsickyi_Character_Bible_v1.0.md`
5. `Chakchaki_Character_Bible_v1.0.md`
6. `Character_Module_Rig_Spec_v1.0.xlsx`
7. `Expression_Motion_Bubble_Library_v1.0.xlsx`
8. `Stage8_Handoff_Manifest_v1.0.md`
9. `Chakchaki_Approved_Reference_v1.0.png`
10. `Gongsickyi_Approved_Reference_v1.0.png`

## 입고 경로
`ssot/stage7/v1.0/` 아래에 원본 파일명을 변경하지 않고 저장한다.

## 실행
1. 파일 존재·크기·MIME·수정일·SHA-256을 기록한다.
2. SRC-01~SRC-06의 브랜드·사용자·디자인·색상·서체·정보 밀도 추적성을 검사한다.
3. 컴포넌트·모듈·State·Event·Bubble ID를 교차 검증한다.
4. 승인 이미지와 탐색·폐기 이미지를 분리한다.
5. `Progress = Bubble Type`, `Runtime State = Happy`를 확인한다.
6. `State Welcome`, `Animation Clip Greet`를 확인한다.
7. 실제 GLB·FBX·Rig·Animation 미제작 상태를 기록한다.
8. CapBadge·IP 검토·사용자 테스트를 외부 차단 항목으로 기록한다.
9. 감사 결과와 승인자, 커밋 SHA를 매니페스트에 남긴다.

## 판정
- 누락·해시 불일치·ID 충돌이 하나라도 있으면 `FAIL`.
- 외부 승인만 남고 기술 무결성이 통과하면 해당 항목은 `BLOCKED_EXTERNAL`로 분리한다.
- 10개 파일과 추적성·ID·정규화 규칙이 모두 통과해야 Gate 0을 `VERIFIED`로 변경한다.

## 산출물
- `ssot/stage7/v1.0/`
- `docs/stage8/audit/GATE0_AUDIT_REPORT.md`
- `harness/ssot-manifest.json`
- `SHA256SUMS.txt`
- 승인 로그와 변경 기록
