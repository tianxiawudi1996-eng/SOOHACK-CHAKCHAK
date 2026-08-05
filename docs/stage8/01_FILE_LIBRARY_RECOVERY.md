# Stage 7·8 File Library 복구 레지스트리

- 확인일: 2026-08-04
- 확인 범위: 현재 프로젝트 채팅 및 ChatGPT File Library
- 목적: 기존에 생성된 Stage 7·8 산출물을 신규 생성하지 않고 원본 기준으로 회수하여 GitHub SSOT 체인에 편입

## 1. 결론

지정된 Stage 7 승인 문서 8종과 승인 참조 이미지 2종은 존재한다. 이전 Harness에서 `미입고`로 표현한 것은 저장소 기준의 상태였으며, 프로젝트 전체 기준으로는 `File Library에서 발견 완료`가 정확하다.

현재 남은 차단은 파일 존재 여부가 아니라 다음 두 가지다.

1. File Library 원본 바이트를 저장소 작업공간으로 반출
2. 반출된 10개 파일의 SHA-256을 계산하고 GitHub에 원본 그대로 커밋

File Library 검색 결과의 파싱 텍스트를 이용해 원본 XLSX를 재생성하거나 대체하지 않는다.

## 2. 발견된 승인 파일

| No. | 파일 | File Library ID | 수정일 UTC | 발견 상태 |
|---:|---|---|---|---|
| 1 | `MathChakChak_Stage7_SSOT_v1.0.xlsx` | `file_00000000e404820bb56008c2b559ed9c` | 2026-08-03T05:05:01Z | FOUND |
| 2 | `MathChakChak_Stage7_SSOT_v1.0.md` | `file_00000000ce9882098e912ddeb7a7e1df` | 2026-08-03T05:05:15Z | FOUND |
| 3 | `Component_Inventory_v1.0.xlsx` | `file_00000000be688211a354a93fcbf18b44` | 2026-08-03T05:05:04Z | FOUND |
| 4 | `Gongsickyi_Character_Bible_v1.0.md` | `file_0000000068408208ab56766e6c7c92d7` | 2026-08-03T05:05:19Z | FOUND |
| 5 | `Chakchaki_Character_Bible_v1.0.md` | `file_00000000a1048211a8a5dcf07fd33ddd` | 2026-08-03T05:05:23Z | FOUND |
| 6 | `Character_Module_Rig_Spec_v1.0.xlsx` | `file_0000000084c081fab333dcf9675c433e` | 2026-08-03T05:05:07Z | FOUND |
| 7 | `Expression_Motion_Bubble_Library_v1.0.xlsx` | `file_000000002450820689fe8bcb26f9d7f1` | 2026-08-03T05:05:14Z | FOUND |
| 8 | `Stage8_Handoff_Manifest_v1.0.md` | `file_00000000acbc81faa9b86123c1268f2a` | 2026-08-03T05:05:28Z | FOUND |
| 9 | `Chakchaki_Approved_Reference_v1.0.png` | local Stage 8 package | — | FOUND_AND_HASHED |
| 10 | `Gongsickyi_Approved_Reference_v1.0.png` | local Stage 8 package | — | FOUND_AND_HASHED |

## 3. 승인 이미지 원본 해시

현재 Stage 8 기준 패키지에 보존된 승인 참조 이미지의 해시는 다음과 같다.

| 파일 | SHA-256 |
|---|---|
| `Chakchaki_Approved_Reference_v1.0.png` | `3263c6ea4e518a834340a855af4ca36d35ee90ac3d59c89f393c40c2cc7ea7fd` |
| `Gongsickyi_Approved_Reference_v1.0.png` | `3d2fe052a9d755a28624a134d9d9e298de70669a14d47eda8a5b48353f3e39ec` |

과거 증분 감사에서 기록한 다른 해시의 PNG와 현재 재첨부·승인된 분리형 가이드는 동일 파일이 아니다. 현재 저장소 편입 기준은 위 두 해시로 고정하며, 변경 시 변경 요청과 영향 분석이 필요하다.

## 4. 내용 확인 결과

`MathChakChak_Stage7_SSOT_v1.0.xlsx`의 12개 시트 내용은 File Library에서 확인됐다. 다음 기준이 포함되어 있다.

- SRC-01~SRC-06 추적성
- 브랜드·슬로건·약속
- 디자인 토큰
- P0 32개·P1 3개 컴포넌트
- 착착이·공식이 역할과 외형
- 실제 GLB/FBX는 Stage 8 범위
- 최신 분리형 가이드만 승인 참조
- CapBadge·상표·캐릭터 유사성 검토는 외부 차단

`Stage8_Handoff_Manifest_v1.0.md`는 Stage 7을 조건부 PASS, Stage 8 착수 가능으로 정의하며 Gate 1 승인 전 Base Mesh·Rig·Animation·GLB 완료 주장을 금지한다.

## 5. 복구·편입 순서

```text
File Library 원본 8종 반출
→ 승인 이미지 2종과 한 폴더로 통합
→ 파일명·크기·MIME 검사
→ SHA-256 계산
→ XLSX 내부 구조·시트명 검사
→ MD 인코딩·내용 검사
→ 승인/탐색/폐기 분류 확인
→ ssot/stage7/v1.0/에 원본 그대로 커밋
→ Gate 0 감사 보고서 갱신
→ Harness 회귀 검사
→ Gate 0 VERIFIED 판정
```

## 6. GPT Work 전환 기준

현재 Chat의 File Search는 File Library 파일의 존재와 내용을 읽을 수 있지만 원본 바이너리를 Git 작업공간으로 직접 내보내는 경로가 제한된다. 다음 작업부터는 파일을 지속 작업공간에 추가하고 GitHub 저장소와 함께 다루기 위해 ChatGPT Work를 사용하는 것이 적합하다.

Work에서 이 프로젝트와 GitHub 저장소를 열고, File Library의 10개 승인 파일을 작업 입력으로 추가한 뒤 `docs/stage8/prompts/GATE0_SSOT_AUDIT.md`를 실행한다. 실제 소프트웨어 구현 증분은 이후 Codex로 전환한다.

## 7. 현재 판정

```text
파일 존재 확인: DONE_IMPLEMENTED
File Library 내용 확인: DONE_IMPLEMENTED
원본 바이트 반출: BLOCKED_EXTERNAL
문서 8종 SHA-256: BLOCKED_EXTERNAL
승인 이미지 2종 SHA-256: DONE_IMPLEMENTED
Gate 0 VERIFIED: 아직 아님
Gate 1 신규 제작: Gate 0 완료 전 차단
```
