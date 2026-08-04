# Gate 1 Candidate Generation Record

- 실행일: 2026-08-04 (Asia/Seoul)
- 이미지 편집: 내장 이미지 생성 도구
- 결정적 후처리: `scripts/harness/build_gate1_evidence.py`
- 자동 검사: `scripts/harness/audit_gate1.py`
- Gate 상태: `BLOCKED`

## 입력과 불변 조건

Stage 7 승인 참조 이미지와 기존 Gate 1 후보를 캐릭터 정체성 기준으로 사용했다. 편집 프롬프트는 4×4/16칸 순서, 영문 라벨, 캐릭터 얼굴·체형·의상·소품·색, 좌우 방향 논리, 액세서리 제거·실루엣·가독성 셀을 고정했다. 변경 허용 범위는 첫 8개 방향의 키와 바닥선 정규화뿐이었다.

## 생성 계보

| 캐릭터 | 편집 입력 | 편집 출력 | 전달 후보 |
|---|---|---|---|
| Chakchaki | `Chakchaki_Canonical_Turnaround_Candidate_v1.png` | `Chakchaki_Canonical_Turnaround_Candidate_v2.png` | `Chakchaki_Canonical_Turnaround_Candidate_v3.png` |
| Gongsickyi | `Gongsickyi_Canonical_Turnaround_Candidate_v2.png` | `Gongsickyi_Canonical_Turnaround_Candidate_v3.png` | `Gongsickyi_Canonical_Turnaround_Candidate_v4.png` |

편집 출력은 모델 생성 결과의 출처 보존용이며, 전달 후보는 동일 검사식을 사용하는 결정적 후처리로 4096×4096 보드에 정렬했다.

## 전달 산출물

- 후보 보드 2개
- 캐릭터별 16개, 총 32개 2048×2048 방향 파일
- 8방향 실루엣 오버레이 2개
- 차이·바닥선 주석 시트 2개
- 자동 QA JSON·Markdown, SHA-256 목록
- Canonical View Register와 10개 수동 승인 행을 가진 Excel 승인 대장

## 제한

자동화는 실제 승인자가 아니다. 캐릭터·3D·브랜드 UX·QA·제품 책임자가 두 캐릭터를 각각 승인하기 전에는 후보를 canonical SSOT, `VERIFIED`, `APPROVED`, `FINAL`로 표시하지 않는다.
