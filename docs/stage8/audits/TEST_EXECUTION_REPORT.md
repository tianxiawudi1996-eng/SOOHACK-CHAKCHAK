# Test Execution Report

## 실행 환경

- 작업 루트: `D:\project\SOOHACK CHACKCHACK`
- 실행 시각: 2026-08-04 (Asia/Seoul)
- Python: `C:\Users\seowo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`

## 실행 결과

| 명령 | 시작 | 종료 | 종료 코드 | 결과 |
|---|---|---|---:|---|
| `python scripts/harness/audit_stage8.py` | `2026-08-04T13:15:07+09:00` | `2026-08-04T13:15:08+09:00` | 0 | 감사 산출물 생성. `required_exact=6/10`, `gate0=BLOCKED` |
| `python scripts/harness/validate_harness.py` | `2026-08-04T13:15:08+09:00` | `2026-08-04T13:15:08+09:00` | 1 | 민감정보로 보이는 `github-recovery-codes.txt` 발견으로 차단 |
| `git status --short` | `2026-08-04T13:15:08+09:00` | `2026-08-04T13:15:08+09:00` | 128 | `.git` 없음 |
| `python -m py_compile scripts/harness/audit_stage8.py scripts/harness/validate_harness.py` | `2026-08-04T13:17:50+09:00` | `2026-08-04T13:17:50+09:00` | 0 | Python 구문 검사 통과 |
| `python scripts/harness/audit_stage8.py` (최종 재실행) | `2026-08-04T13:17:50+09:00` | `2026-08-04T13:17:51+09:00` | 0 | `required_exact=6/10`, `gate0=BLOCKED` |
| `python scripts/harness/validate_harness.py` (최종 재실행) | `2026-08-04T13:17:51+09:00` | `2026-08-04T13:17:51+09:00` | 1 | 민감정보 파일 차단 유지 |
| `git push -u origin codex/stage8-harness-continuation` | `2026-08-04T13:18:50+09:00` | `2026-08-04T13:18:50+09:00` | 128 | GitHub 403 권한 거부 (`visionlab-coder`) |
| `python -m py_compile ...` (최종 확인) | `2026-08-04T13:19:29+09:00` | `2026-08-04T13:19:29+09:00` | 0 | Python 구문 검사 통과 |
| `python scripts/harness/validate_harness.py` (최종 확인) | `2026-08-04T13:19:29+09:00` | `2026-08-04T13:19:29+09:00` | 1 | 민감정보 파일 차단 유지 |
| `python -m py_compile ...` (후속 실행) | `2026-08-04T13:28:22+09:00` | `2026-08-04T13:28:22+09:00` | 0 | 교정된 감사·검증 스크립트 구문 검사 통과 |
| `python scripts/harness/audit_stage8.py` (후속 실행) | `2026-08-04T13:28:22+09:00` | `2026-08-04T13:28:23+09:00` | 0 | `required_exact=6/10`, Gate 0 `BLOCKED` |
| `python scripts/harness/validate_harness.py` (후속 실행) | `2026-08-04T13:28:23+09:00` | `2026-08-04T13:28:23+09:00` | 0 | `HARNESS_PASS`; ignored·untracked 민감 파일은 경고, Gate 순서·증거 검증 통과 |
| `python -m py_compile scripts/harness/audit_stage8.py scripts/harness/validate_harness.py` (엄격 검증 교정) | `2026-08-04T13:37:44.6908750+09:00` | `2026-08-04T13:37:45.0007194+09:00` | 0 | Python 구문 검사 통과 |
| `python scripts/harness/audit_stage8.py` (엄격 검증 교정) | `2026-08-04T13:37:49.0522938+09:00` | `2026-08-04T13:37:50.4687456+09:00` | 0 | `files=82`, `required_exact=6/10`, Gate 0 `BLOCKED` |
| `python scripts/harness/validate_harness.py` (엄격 검증 교정) | `2026-08-04T13:37:54.2917395+09:00` | `2026-08-04T13:37:54.3580119+09:00` | 1 | 필수 Stage 7 정확 원본 4종 누락을 명시하고 차단 |
| `py_compile` → `audit_stage8.py` → `validate_harness.py` (OOXML ID 감사 포함 최종 회귀) | `2026-08-04T13:40:52.9775524+09:00` | `2026-08-04T13:40:55.2444475+09:00` | `0 / 0 / 1` | 입력 75개, 정확 원본 `6/10`, `SRC-01`~`SRC-06` 확인 후 누락 원본 4종을 의도대로 차단 |

## 미실행 명령

- `pytest`: 실행 파일이 설치되어 있지 않음.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`: 루트 `package.json`이 없어 프로젝트 명령으로 확인할 수 없어 실행하지 않음.
- 3D 검사: GLB/GLTF/BLEND/FBX가 없어 실행하지 않음.

## 해석

감사 생성기와 Python 구문 검사는 정상 종료했다. 엄격 Harness 검증기는 구조·JSON·Markdown 링크·Gate 순서·ID와 의미 연결을 검사한 뒤 정확한 원본 4종 누락을 종료 코드 1로 차단한다. 따라서 Gate 0은 `BLOCKED`이며 Gate 1 이후 검증은 시작하지 않는다. 13:28의 종료 코드 0은 필수 원본 존재를 실패 조건에 포함하기 전의 역사적 실행 기록이다. 생성되는 감사 산출물 7개는 자기참조 방지를 위해 입력 인벤토리에서 제외한다.
