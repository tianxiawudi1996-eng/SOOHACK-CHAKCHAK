# 2026-08-06 로컬 다운로드 및 GitHub 동기화 보고서

## 목적

최근 수학착착 Stage 8·MVP v0.1 작업물을 Windows 기준 작업공간인 다음 경로에 일관되게 배치하고, 동일 소스 기준을 GitHub에 유지한다.

```text
D:\project\SOOHACK CHACKCHACK
```

## GitHub 기준

- Repository: `tianxiawudi1996-eng/SOOHACK-CHAKCHAK`
- Branch: `agent/mvp-v0.1-foundation`
- Draft PR: `#3`
- 기반 커밋: `f1a07bef01e1202f352369b0107e99d2e387910f`
- Windows 동기화 도구 커밋: `f88d6fe4805c9dcea4306e0685678c8580809c82`

## 다운로드 패키지

파일명:

```text
SOOHACK_CHACKCHAK_latest_workspace_2026-08-06.zip
```

SHA-256:

```text
3b228b56988578b8e619d6a2026dbd64d4dc6da18f85595bdbe8407411302240
```

ZIP은 `D:\project`에 압축 해제하면 최상위 폴더가 `SOOHACK CHACKCHACK`이 되도록 구성한다.

## 포함 범위

- MVP v0.1 범위 승인서
- ADR-0001~0003
- OpenAPI 0.1 계약
- 관계형 DB 논리 Schema
- 2D Vertical Slice HTML·CSS·JavaScript·학습 JSON
- Gate 0 SSOT 동기화 감사와 매니페스트
- 자동 검사·정적 서버 스크립트
- 범소프트 8-Phase 제품화 로드맵 Markdown·Word
- Stage 8 Canonical v5.0.1, Gate 1 v5.1.1, Gate 1 Remediation v5.2.0 보관 ZIP
- 로컬 파일별 SHA-256 목록

## 실행 방법

```powershell
Set-ExecutionPolicy -Scope Process Bypass
& 'D:\project\SOOHACK CHACKCHACK\scripts\windows\sync_to_D_project.ps1'
```

스크립트는 기존 작업공간이 있으면 `.git`을 제외한 안전 백업을 먼저 만들고, GitHub 브랜치를 가져온 뒤 로컬 전용 보고서와 증거 패키지를 복사한다.

## 검증 규칙

```powershell
python D:\project\SOOHACK CHACKCHACK\scripts\harness\validate_harness.py
python -m unittest discover -s 'D:\project\SOOHACK CHACKCHACK\tests' -v
```

## 상태

- 최신 소스 GitHub 푸시: `DONE_IMPLEMENTED`
- Windows 동기화 스크립트: `DONE_IMPLEMENTED`
- 다운로드 ZIP 생성: `DONE_IMPLEMENTED`
- Stage 8 Harness CI: 재실행 확인 대상
- Gate 0: `FAIL` 유지 — Stage 7 원본 바이트와 승인 체인 미마감
- Production 배포: `NOT STARTED`
