# Gate 1 QA·승인 패키지 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: Character Art Lead, 3D Technical Art Lead, UX Brand System Lead, QA Lead, Product Owner
- 변화: 생성된 턴어라운드 보드를 “존재하는 이미지”에서 “방향별 측정·수정·승인 가능한 Gate 1 증거”로 전환한다.
- 금지: 사람 승인 없이 Gate 1을 `VERIFIED`로 바꾸거나 Gate 2를 시작하지 않는다.

## 2. Specification Engineering

완성 상태는 다음과 같다.

1. 착착이·공식이 후보 및 승인 레퍼런스 SHA-256 일치
2. 캐릭터별 필수 16셀 존재와 PNG 디코딩 확인
3. 보드·셀 해상도, 캐릭터 높이, 바닥선, 배경, 좌우 중복 지표 기록
4. 허용 편차 ±3% 초과 항목을 `FAIL`로 기록
5. 자동 QA JSON·Markdown, SHA256SUMS, Register, Manual Approval Log 존재
6. 5역할 실제 승인 전 상태는 `BLOCKED_EXTERNAL` 또는 `FAIL`

## 3. Context Engineering

- SSOT: `ssot/stage7/v1.0/`
- 현재 후보: `evidence/gate-1/candidates/`
- 기준 명세: `docs/ssot/stage7/v1.0/GATE1_CANONICAL_TURNAROUND_REMEDIATION_METAPROMPT_v5.2.0.md`
- 자동 QA: `scripts/harness/audit_gate1.py`
- 증거: `docs/stage8/evidence/gate1/`
- 감사 보고서: `docs/stage8/audits/`

## 4. Harness Engineering

- 원본·canonical 이미지는 읽기 전용으로 처리한다.
- 후보 수정은 새 버전 파일로 저장한다.
- SHA-256이 기록과 다르면 즉시 실패한다.
- 자동 QA는 이미지 생성 성공 여부와 Gate 승인 여부를 분리한다.
- 민감정보 파일은 읽거나 커밋하지 않는다.

## 5. Prompt Engineering

현재 작업은 두 후보 보드의 정량 QA와 승인 패키지 작성이다.

- 성공: 계측 결과와 실패 원인이 파일·수치·해시로 재현 가능하다.
- 실패: 후보 누락, 해시 불일치, 디코딩 실패, 16셀 구조 실패, 2048px 미달, ±3% 초과, 수동 승인 누락.
- 제약: 미러링으로 누락 방향을 채우지 않고, 승인 레퍼런스 외형을 재디자인하지 않는다.

## 6. Workflow Engineering

```text
기준 해시 확인
→ 후보 디코딩·4×4 구조 검사
→ 방향별 높이·바닥선·배경 계측
→ 좌우 미러 유사도·실루엣 검사
→ FAIL 목록 생성
→ 한 항목 최소 보정
→ 재검증
→ 5역할 승인 요청
```

## 7. Memory Engineering

- 남길 것: 입력/출력 해시, 후보 버전, 계측 수치, 실패 이유, 보정 이력, 승인자 결정
- 없앨 것: 임시 렌더, 승인되지 않은 `FINAL` 명칭, 근거 없는 PASS 문구
- 이전 후보는 삭제하지 않고 `superseded`로 기록한다.

## 8. Loop Engineering

1. 자동 QA를 실행한다.
2. 한 번에 실패 원인 하나만 수정한다.
3. 수정 전후 해시와 지표를 비교한다.
4. 자동 실패가 남으면 반복한다.
5. 자동 검사가 통과해도 5역할 승인이 없으면 종료 상태는 `BLOCKED_EXTERNAL`이다.
6. 5역할 승인과 모든 증거가 있을 때만 Gate 1을 `VERIFIED`로 종료한다.

## 실행 명령

```text
python scripts/harness/audit_gate1.py
python scripts/harness/validate_harness.py
```
