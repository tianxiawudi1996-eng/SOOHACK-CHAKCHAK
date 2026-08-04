# Stage 8 통합 실행 계획

## 사용자와 변화

이 문서는 수학착착 프로젝트의 제작·검증 담당자가 Stage 1~7 승인 기준을 보존하면서 Stage 8 산출물을 순차적으로 실행할 때 사용한다. 현재 필요한 변화는 “파일이 있다고 가정하는 작업”에서 “원본·해시·테스트·수동 승인 증거가 있어야 다음 Gate로 넘어가는 작업”으로의 전환이다.

## 완료 정의

각 Gate는 필수 증거와 자동·수동 검증이 모두 존재할 때만 `VERIFIED`가 된다. Gate 0이 `VERIFIED`가 아니면 Gate 1 이후 구현은 시작하지 않는다. Stage 7 정확 원본 10종이 canonical SSOT에 입고되어 Gate 0은 `VERIFIED` 조건을 충족했다. 로컬 민감 파일은 ignore·untracked 경고로 분리되며 canonical SSOT 또는 Git 추적 상태일 때만 Gate 차단으로 취급한다.

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

## 현재 상태 및 다음 작업

- `github-recovery-codes.txt`는 내용을 열람·복사·커밋하지 않고 계정 보안 조치 후 격리해야 한다.
- Gate 1에서는 두 캐릭터의 canonical view·turnaround 증거를 점검하고 승인 이미지의 임시 요소와 시점 일관성을 검증한다.
- Gate 2 이후는 실제 3D 자산이 입고되기 전까지 시작하지 않는다.
- 착착이 모자 고유 심볼과 외부 IP 검토는 공개·배포 전 차단조건으로 유지한다.
