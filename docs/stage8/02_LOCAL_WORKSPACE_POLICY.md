# 수학착착 로컬 작업공간 정책

## 고정 경로

모든 수학착착 프로젝트 문서와 개발 산출물의 Windows 기준 작업 루트는 다음으로 고정한다.

```text
D:\project\SOOHACK CHACKCHACK
```

## 저장 구조

```text
D:\project\SOOHACK CHACKCHACK\
├─ docs\
│  └─ stage8\
├─ ssot\
│  └─ stage7\v1.0\
├─ evidence\
├─ release\
├─ harness\
├─ scripts\
└─ .github\
```

## 저장 원칙

1. 새 문서, 감사 보고서, 메타프롬프트, QA 결과, Release Manifest는 모두 이 루트 아래에 저장한다.
2. Stage 7 승인 원본 10종은 `ssot\stage7\v1.0\`에 원본 바이트 그대로 보관한다.
3. 버전이 확정된 파일을 덮어쓰지 않는다. 수정본은 patch 버전 또는 새 버전으로 생성한다.
4. Gate별 증거는 `evidence\gate-N\` 아래에 저장한다.
5. 배포 산출물과 롤백 정보는 `release\` 아래에 저장한다.
6. 승인된 최소 증분마다 Harness 검사를 수행하고 GitHub에 커밋·푸시한다.
7. 임시 다운로드 파일은 승인 산출물과 분리하고, 승인 후 지정 폴더로 이동한다.

## 실행 환경 제한

일반 Chat 세션은 사용자 PC의 `D:` 드라이브에 직접 쓰지 못할 수 있다. 실제 로컬 저장이 필요한 작업은 해당 폴더 접근 권한을 받은 ChatGPT Work 또는 Codex 환경에서 수행한다.

Work/Codex 시작 시 다음 경로를 프로젝트 작업 폴더로 선택한다.

```text
D:\project\SOOHACK CHACKCHACK
```

## Git 원격

```text
https://github.com/tianxiawudi1996-eng/SOOHACK-CHAKCHAK.git
```

로컬 작업과 GitHub 브랜치 상태가 일치하지 않으면 작업을 진행하지 않고 먼저 동기화 상태를 보고한다.
