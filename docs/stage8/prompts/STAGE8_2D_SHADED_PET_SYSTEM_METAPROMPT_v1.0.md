# 수학착착 Stage 8 — 음영 2D 펫 포즈 시스템 전환·제작 실행 메타프롬프트 v1.0

## 0. 실행 선언

이 프롬프트는 Stage 8의 3D 제작·리깅·3D 모션 경로를 종료하고, Stage 7에서 승인된 착착이·공식이의 정체성을 그대로 유지하는 음영 2D 학습 펫 시스템으로 전환하기 위한 통제 절차다. “코덱스 펫처럼 보이게”라는 요구는 특정 제품의 외형 복제가 아니라, 화면 가장자리에서 작고 친근하게 머물며 학습 상태에 즉시 반응하는 데스크톱 동반자 경험으로 해석한다.

현재 전환 상태:

```text
Canonical 2D references: VERIFIED
3D production strategy: SUPERSEDED
2D shaded pose sheets: IN_PRODUCTION
2D pose extraction: NOT_STARTED
2D runtime motion: NOT_STARTED
Gate 2: NOT_VERIFIED
```

## 1. Goal Framing

### 사용자

- 초등 수학 학습자
- 학부모·교사
- 수학착착 제품 책임자
- 캐릭터 아트·UI·프론트엔드 구현 담당자

### 달라져야 하는 것

- 저품질 3D 캐릭터 대신 승인 원본과 같은 착착이·공식이가 화면에 나타난다.
- 두 캐릭터는 대기·환영·안내·생각·칭찬·검색·축하·재도전 상태를 2D 포즈로 표현한다.
- 평면 일러스트에 부드러운 명암·접지 그림자·재질 하이라이트를 사용해 입체감은 유지하되 3D 메시를 요구하지 않는다.
- 작은 화면에서도 즉시 읽히는 “항상 곁에 있는 학습 동반자” 경험을 제공한다.

## 2. Specification Engineering

### 변경 불가 정체성

#### 착착이

- 10~12세 인상, 밝고 친근한 탐구형 학생
- 파란 S 모자, 짙은 갈색 머리, 큰 갈색 눈
- 따뜻한 흰색 후드, 파란 반바지, 파란 배낭, 파란색·흰색 운동화
- 승인 원본의 얼굴형·눈 간격·머리 비율·의상 비율·색상 유지

#### 공식이

- 둥근 노란 병아리·알형 몸체와 짧은 갈색 발
- 큰 갈색 눈, 둥근 짙은 남색 안경, 남색 학사모와 금색 술
- 별 지시봉, 짧은 노란 날개, 노랑·남색 중심 색상 유지
- 승인 원본의 몸체 실루엣·안경 비율·눈 간격·학사모 크기 유지

### 필수 8포즈

| ID | 착착이 | 공식이 | 학습 상태 |
|---|---|---|---|
| P01 | 편안한 대기·듣기 | 편안한 대기·듣기 | IDLE/LISTEN |
| P02 | 손 흔들기 | 날개 흔들기 | WELCOME |
| P03 | 옆을 가리켜 안내 | 별 지시봉 안내 | GUIDE |
| P04 | 턱을 짚고 생각 | 날개를 모으고 생각 | THINK |
| P05 | 엄지척 | 날개를 활짝 펴 칭찬 | PRAISE/PROGRESS |
| P06 | 돋보기로 탐색 | 돋보기로 탐색 | SEARCH |
| P07 | 점프·축하 | 가벼운 점프·축하 | CELEBRATE |
| P08 | 차분한 재도전 격려 | 차분한 재도전 격려 | RETRY |

### 시각 명세

- 2D 일러스트, 깨끗한 외곽선 또는 외곽선 없는 정돈된 형태
- 부드러운 셀 음영과 제한된 그라데이션, 접지 그림자, 절제된 하이라이트
- 원본의 고품질 마스코트 감성은 유지하되 3D 렌더·복셀·저폴리 외형은 금지
- 시트는 4열×2행, 동일한 카메라·크기·기준선, 포즈 간 겹침 없음
- 텍스트·번호·로고·워터마크 없음
- 1차 산출물은 밝은 단색 배경 PNG, 승인 후 개별 투명 PNG/WebP로 분리

### 완료 상태

1. 착착이·공식이 각각 8포즈가 존재한다.
2. 원본 캐릭터로 즉시 식별되며 새 캐릭터처럼 보이지 않는다.
3. 모든 포즈의 얼굴·의상·핵심 소품·색상이 일관된다.
4. 각 포즈가 지정된 학습 상태와 연결된다.
5. 자동 파일·해시·크기 검사는 PASS다.
6. 제품 책임자 1인 시각 승인이 기록된다.
7. 승인된 시트를 개별 포즈 파일과 런타임 매니페스트로 분리한다.

## 3. Context Engineering

### SSOT 입력

- `ssot/stage7/v1.0/Chakchaki_Approved_Reference_v1.0.png`
- `ssot/stage7/v1.0/Gongsickyi_Approved_Reference_v1.0.png`
- `ssot/stage7/v1.0/Chakchaki_Character_Bible_v1.0.md`
- `ssot/stage7/v1.0/Gongsickyi_Character_Bible_v1.0.md`
- `evidence/gate-1/candidates/Chakchaki_Canonical_Turnaround_Candidate_v3.png`
- `evidence/gate-1/candidates/Gongsickyi_Canonical_Turnaround_Candidate_v4.png`

### 출력

- `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/sheets/`
- `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses/`
- `docs/stage8/evidence/2d-pet/v1.0/`
- `docs/stage8/evidence/2d-pet/v1.0/2D_PET_ASSET_MANIFEST_v1.0.json`
- `docs/stage8/evidence/2d-pet/v1.0/2D_PET_MANUAL_REVIEW_v1.0.json`

### 대체되는 3D 범위

- Gate 2의 메시·PBR 재질 제작 → 음영 2D 포즈 제작
- Gate 3의 본·블렌드셰이프 리깅 → 상태별 레이어·피벗·표정 프레임 정의
- Gate 4의 3D 애니메이션 클립 → 2D 포즈 전환·스쿼시/스트레치·페이드/슬라이드 모션

## 4. Harness Engineering

### 허용 도구

- 승인 원본을 참조하는 이미지 생성·편집 도구
- 로컬 이미지 뷰어
- PNG/WebP 처리기와 SHA-256 계산기
- JSON·Markdown 편집기
- Stage 8 감사기와 Git diff/status

### 통제

1. 승인 원본은 정체성 SSOT이며 재디자인하지 않는다.
2. 원본 경로와 SHA-256을 생성 기록에 고정한다.
3. 각 캐릭터는 자기 원본만 참조하여 생성한다.
4. 3D·복셀·저폴리·과도한 SD 비율·성인화·의상 교체를 실패 처리한다.
5. 자동 검사는 파일 완전성만 보장하며 시각 승인을 대신하지 않는다.
6. 승인되지 않은 시트는 제품 자산으로 승격하지 않는다.
7. 이미 완료된 Gate 0·1 승인 기록은 변경하지 않는다.
8. 기존 3D 산출물은 삭제하지 않고 `SUPERSEDED_BY_2D_STRATEGY`로 감사 보관한다.

## 5. Prompt Engineering

### 지금 할 작업

1. 3D 전략 폐기 결정을 기록한다.
2. 승인 원본을 참조해 캐릭터별 8포즈 음영 2D 시트를 생성한다.
3. 원본 대비 얼굴·실루엣·색상·의상·소품을 시각 비교한다.
4. 통과 후보만 2D 자산 대장에 등록한다.
5. 1인 승인 레코드를 준비하고 Gate 2는 승인 전까지 `NOT_VERIFIED`로 유지한다.

### 생성 지시 공통문

```text
승인 원본을 유일한 캐릭터 정체성 기준으로 사용한다. 얼굴, 눈, 머리/몸 비율,
의상, 소품, 색상과 전체 인상을 바꾸지 않는다. 화면 가장자리에서 반응하는
작고 친근한 학습 동반자용 고품질 2D 포즈 시트를 만든다. 부드러운 셀 음영,
절제된 그라데이션, 접지 그림자와 재질 하이라이트를 사용한다. 4x2 격자에
8개 전신 포즈를 같은 크기와 카메라로 배치하고 서로 겹치지 않게 한다.
텍스트, 라벨, 로고, 워터마크는 넣지 않는다. 3D 렌더, 복셀, 저폴리,
새 의상, 새 얼굴, 추가 팔다리, 손가락 오류를 금지한다.
```

### 성공 기준

- `identity_match = PASS`
- `pose_count = 8/8` per character
- `state_mapping = 16/16`
- `file_integrity = PASS`
- `manual_approval = APPROVE`

### 실패 기준

- 원본과 다른 얼굴·나이·실루엣·의상·색상
- 3D 모델 또는 저폴리 느낌이 다시 나타남
- 포즈 누락·중복·의미 불명확
- 잘린 신체·겹친 포즈·추가 팔다리·소품 오류
- 승인 전 제품 자산 승격

## 6. Workflow Engineering

```text
1. 전략 전환 기록
2. 승인 원본·해시 고정
3. 착착이 8포즈 시트 생성
4. 공식이 8포즈 시트 생성
5. 시각·구조 QA
6. 불일치 포즈 재생성
7. 제품 책임자 1인 승인
8. 개별 포즈 추출·투명 배경 처리
9. 런타임 상태 매니페스트 작성
10. 2D 전환 모션 제작
11. 제품 통합·QA·배포
```

## 7. Memory Engineering

### 남길 것

- 사용자 전략 변경 결정과 시각 방향
- 승인 원본 경로·해시
- 실제 생성 프롬프트·도구·생성 시각
- 시트와 개별 포즈 경로·해시·상태 매핑
- 자동 QA와 1인 승인 기록
- 실패 후보와 폐기 사유

### 없앨 것

- 3D 제작이 여전히 필수라는 전제
- 저품질 3D 후보를 활성 자산으로 가리키는 참조
- 승인되지 않은 생성 이미지를 정본으로 표시한 기록
- 생성 도구가 만든 임의 텍스트·로고·정체성 변형

### 다음 인계문

```text
2D strategy: [ACTIVE|SUPERSEDED]
Shaded pose sheets: [N]/2
Valid poses: [N]/16
Identity QA: [STATUS]
Manual approval: [STATUS]
Gate 2: [STATUS]
Next action: [ACTION]
```

## 8. Loop Engineering

반복 단위는 `한 캐릭터 시트 생성 → 8포즈 계수 → 원본 정체성 비교 → 오류 포즈 확인 → 재생성`이다. 얼굴이나 핵심 실루엣이 달라지면 전체 시트를 실패 처리한다. 포즈 일부만 문제이면 해당 포즈만 분리 재생성한다. 두 캐릭터 16포즈가 모두 통과하고 제품 책임자 1인이 승인한 뒤에만 Gate 2를 `VERIFIED`로 종료한다. 이후 Gate 3·4는 2D 레이어·전환 모션 검증으로 진행한다.
