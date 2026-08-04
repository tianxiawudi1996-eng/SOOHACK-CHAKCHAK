# Stage 8 통합 실행 계획

## 사용자와 변화

이 문서는 수학착착 프로젝트의 제작·검증 담당자가 Stage 1~7 승인 기준을 보존하면서 Stage 8 산출물을 순차적으로 실행할 때 사용한다. 현재 필요한 변화는 “파일이 있다고 가정하는 작업”에서 “원본·해시·테스트·수동 승인 증거가 있어야 다음 Gate로 넘어가는 작업”으로의 전환이다.

## 완료 정의

각 Gate는 필수 증거와 자동·수동 검증이 모두 존재할 때만 `VERIFIED`가 된다. Gate 0이 `VERIFIED`가 아니면 Gate 1 이후 구현은 시작하지 않는다. 현재 Gate 0은 정확한 승인 원본 4종 누락으로 `BLOCKED`다. 로컬 민감 파일은 ignore·untracked 경고로 분리되며 canonical SSOT 또는 Git 추적 상태일 때만 Gate 차단으로 취급한다.

## 고정 순서

1. Gate 0: SSOT 원본·메타데이터·해시·정합성 감사
2. Gate 1: Canonical View 승인
3. Gate 2: Base Mesh·Material
4. Gate 3: Rig·Blendshape
5. Gate 4: Motion
6. Gate 5: AI Behavior
7. Gate 6: Product Integration
8. Gate 7: QA
9. Gate 8: Deployment

## 작업 루프

```text
기준선 확인 → 최소 변경 → 자동 검증 → 수동 검증 → 증거 저장
→ SSOT 대조 → 실패 원인 기록 → 회귀 검증 → 상태 갱신 → 커밋
```

## 현재 차단 및 다음 작업

- 정확한 `MathChakChak_Stage7_SSOT_v1.0.md`, `Chakchaki_Character_Bible_v1.0.md`, 승인 이미지 2종의 원본을 작업공간에 입고해야 한다.
- `github-recovery-codes.txt`는 내용을 열람·복사·커밋하지 않고 계정 보안 조치 후 격리해야 한다.
- Git 저장소 기준선을 안전하게 만들고, 관련 파일만 별도 브랜치에 커밋해야 한다.
- 위 항목이 해소되기 전 Gate 1~8 구현은 시작하지 않는다.
