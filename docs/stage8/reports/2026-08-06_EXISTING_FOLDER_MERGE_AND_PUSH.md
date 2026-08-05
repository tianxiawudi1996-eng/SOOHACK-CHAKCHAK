# 기존 로컬 폴더 병합·정리·커밋·푸시 절차

- 기준일: 2026-08-06
- 로컬 작업 루트: `D:\project\SOOHACK CHACKCHACK`
- 원격 저장소: `https://github.com/tianxiawudi1996-eng/SOOHACK-CHAKCHAK.git`
- 대상 브랜치: `agent/mvp-v0.1-foundation`

## 목적

압축 해제 과정에서 생긴 중첩 폴더나 별도 MVP 폴더의 내용을 기존 프로젝트 루트로 이전하고, 중복·충돌을 정리한 뒤 검증·커밋·푸시한다.

## 실행 파일

```text
D:\project\SOOHACK CHACKCHACK\scripts\windows\sync_to_D_project.ps1
```

## 기본 실행

PowerShell을 열고 다음을 실행한다.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
& 'D:\project\SOOHACK CHACKCHACK\scripts\windows\sync_to_D_project.ps1'
```

압축을 다른 위치에 풀었다면 `-Source`로 정확한 폴더를 지정한다.

```powershell
& 'D:\project\SOOHACK CHACKCHACK\scripts\windows\sync_to_D_project.ps1' `
  -Source 'D:\다운로드\압축해제폴더\SOOHACK CHACKCHACK'
```

## 수행 내용

1. 기존 작업 폴더를 `D:\project\_backup\` 아래에 백업한다.
2. Git 원격 주소와 `agent/mvp-v0.1-foundation` 브랜치를 확인한다.
3. 중첩된 `SOOHACK CHACKCHACK` 또는 MVP 폴더를 자동 탐지한다.
4. `.git`, `node_modules`, 가상환경, 캐시, 빌드 결과는 이전 대상에서 제외한다.
5. 파일별 SHA-256을 비교한다.
6. 동일 파일은 중복만 제거한다.
7. 내용이 다른 기존 파일은 백업한 뒤 최신 압축 해제본으로 교체한다.
8. 느슨하게 놓인 보고서·ZIP·동기화 스크립트를 표준 폴더로 정리한다.
9. `docs/stage8/audits/LOCAL_WORKSPACE_MERGE_*.md` 실행 증거를 작성한다.
10. Harness, `git diff --check`, Python 단위검사를 실행한다.
11. 변경사항을 `chore: merge and organize local workspace`로 커밋한다.
12. 원격 브랜치에 Push한다.

## 안전 통제

- 모든 변경 전 전체 백업을 생성한다.
- 파일 복사 후 SHA-256이 일치하지 않으면 즉시 중단한다.
- 다른 브랜치에 미커밋 변경이 있으면 자동 전환하지 않고 중단한다.
- Gate 0·Gate 1 상태를 임의로 `VERIFIED`로 변경하지 않는다.
- Stage 7 승인 원본과 후보 파일은 감사 판정 전까지 분리 상태를 유지한다.

## 완료 확인

```powershell
git -C 'D:\project\SOOHACK CHACKCHACK' status -sb
git -C 'D:\project\SOOHACK CHACKCHACK' log -1 --oneline
git -C 'D:\project\SOOHACK CHACKCHACK' remote -v
```

정상 완료 시 다음 정보가 출력된다.

- Workspace
- Branch
- HEAD commit
- Backup path
- Audit report path
