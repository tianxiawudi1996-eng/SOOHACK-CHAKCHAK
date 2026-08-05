# 수학착착 Stage 8 — Gate 2 고품질 캐릭터 3D 제작 실행 메타프롬프트 v2.0

## 0. 실행 선언

이 프롬프트는 사용자가 거부한 절차형 저품질 모델을 대체하여, Stage 7 승인 캐릭터의 정체성을 보존하는 실제 Blender 원본과 glTF 자산을 제작·검증한다. 구조 검사만으로 시각 품질을 승인하지 않는다.

## 1. Goal Framing

- 사용자: 초등 수학 학습자, 프로젝트 책임자, 캐릭터 아트·3D·제품 담당자
- 달라져야 하는 것: 착착이와 공식이가 기존 승인 이미지와 같은 캐릭터로 즉시 인지되는 고품질 3D 자산이 생긴다.

## 2. Specification Engineering

### 착착이 변경 불가 기준

- 10~12세 인상, 4.4-head 비율 허용 ±3%
- 둥근 파란 모자, 흰 후드, 파란 반바지, 파란 가방, 큰 파랑·흰색 운동화
- 따뜻한 피부, 짙은 갈색 머리, 크지만 유아적이지 않은 눈
- Hair/Fringe, Eyes, Brows, Cap, CapBadge, Hoodie, Shorts, Shoes, Backpack 분리

### 공식이 변경 불가 기준

- 높이 1.0 / 폭 0.86 / 깊이 0.78의 달걀형 몸 허용 ±3%
- 몸 폭 약 18%의 큰 눈, 눈 지름 약 0.42의 눈 간격
- 원형 네이비 안경, 네이비 학사모, 별 포인터
- 짧고 둥근 부리-입, 짧고 넓은 발, 사람형 손 금지
- Eyes, Brows, MouthBeak, Glasses, GraduationCap, Feet, StarPointer 분리

### 완료 산출물

1. 캐릭터별 편집 가능한 `.blend` 원본
2. 캐릭터별 LOD0/1/2 GLB 6개
3. 정면·좌측·앞 3/4 렌더와 비교 보드
4. PBR 재질, UV 또는 절차형 재질 좌표, smooth shading
5. 파일·해시·삼각형·재질·모듈 매니페스트

## 3. Context Engineering

- 외형 SSOT: `ssot/stage7/v1.0/*_Approved_Reference_v1.0.png`
- 다면도: `evidence/gate-1/candidates/*_Canonical_Turnaround_Candidate_*.png`
- 캐릭터 명세: `ssot/stage7/v1.0/*_Character_Bible_v1.0.md`
- 리그 명세: `ssot/stage7/v1.0/Character_Module_Rig_Spec_v1.0.xlsx`
- 제작기: Blender 5.2 LTS 및 `scripts/blender/build_stage8_high_fidelity_characters.py`
- 출력: `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2-high-fidelity/`

## 4. Harness Engineering

- 공식 이미지 SHA-256이 활성 참조 대장과 일치해야 한다.
- 렌더는 실제 Blender 카메라·조명으로 생성한다.
- mesh는 smooth shading을 사용하며 근접면의 명백한 각짐·관통을 허용하지 않는다.
- LOD는 LOD0의 정체성·핵심 실루엣과 분리 모듈을 유지한다.
- CapBadge는 교체 가능한 모듈이며 최종 IP 승인 전 배포를 차단한다.
- 시각 검토 전 Gate 2를 `VERIFIED`로 올리지 않는다.

## 5. Prompt Engineering

### 지금 할 작업

1. 승인 이미지와 캐릭터 바이블에서 비율·색상·모듈을 추출한다.
2. Blender에서 고해상도 곡면 메시와 비파괴 재질을 제작한다.
3. 캐릭터별 원본과 LOD GLB를 내보낸다.
4. 정면·측면·3/4 렌더를 생성한다.
5. 공식 이미지와 비교하여 정체성·실루엣·의상·소품·재질을 검수한다.

### 성공 기준

- 두 캐릭터 모두 변경 불가 특징 100% 존재
- 이전 격리 후보보다 높은 곡면 해상도와 시각 완성도
- 파일 파싱·해시·축·단위·재질·LOD 검사 PASS
- 비교 렌더에서 동일 캐릭터로 인지
- 프로젝트 책임자 수동 승인 1/1

### 실패 기준

- 기본 도형이 그대로 드러나는 저품질 외형
- 얼굴·실루엣·연령·의상·안경·학사모·포인터 불일치
- 메시 관통, 심한 각짐, 누락 모듈, 잘못된 색상
- 자동 검사만으로 승인 주장

## 6. Workflow Engineering

SSOT 잠금 → Blender 제작 환경 확인 → 공식이 LOD0 → 착착이 LOD0 → 재질·세부 묘사 → 세 방향 렌더 → 시각 개선 반복 → LOD 생성 → GLB QA → 책임자 승인 → Gate 2 승격 순서로 진행한다.

## 7. Memory Engineering

- 남길 것: Blender 버전, 소스 경로, 공식 이미지 해시, 모델 해시, 모듈 목록, 렌더, 시각 검토 결정, 미결정 IP 항목
- 없앨 것: 격리 모델의 활성 지위, 근거 없는 품질 승인, 임시 렌더와 중간 실패 파일

## 8. Loop Engineering

한 캐릭터의 LOD0 제작 → 3방향 렌더 → 공식 이미지 비교 → 불일치 수정이 반복 단위다. 변경 불가 특징이 모두 존재하고 명백한 저품질·관통·비율 오류가 없을 때 LOD와 내보내기로 진행한다. 책임자 승인 전에는 종료하지 않는다.
