# Gate 3 Rig & Blendshape Report v1.0

## 결과

- 실제 rigged GLB: 6개 생성
- 자동 QA: `PASS`
- 리그 검사: `6/6 PASS`
- 프로젝트 책임자 변형 승인: `0/1 PENDING`
- 자동 실패: `0`
- Gate 3: `BLOCKED_EXTERNAL`
- Gate 4: `NOT_STARTED`

## 리그 수치

| Character | LOD | Joints | Morph targets | Test poses |
|---|---:|---:|---:|---:|
| Chakchaki | 0 | 32 | 18 | 4 |
| Chakchaki | 1 | 32 | 18 | 4 |
| Chakchaki | 2 | 32 | 15 | 4 |
| Gongsickyi | 0 | 20 | 22 | 4 |
| Gongsickyi | 1 | 20 | 22 | 4 |
| Gongsickyi | 2 | 20 | 20 | 4 |

## 자동 검증

- 각 GLB에 skin 1개, joint hierarchy, inverse bind matrix 존재
- 모든 메시 primitive에 `JOINTS_0`·`WEIGHTS_0` 존재
- 전체 vertex weight 합 1.0, 잘못된 joint index 0
- 공통 필수 얼굴 morph 15개가 모든 LOD에서 존재하고 non-zero
- Gongsickyi `Body_Squash/Stretch`, `Wing_Open/Fold` 존재
- Chakchaki 손 포즈 4개, Gongsickyi 날개·포인터 포즈 4개 존재
- `prop_socket.L/R`가 각각 `wing_03.L/R`에 연결
- Gate 2 입력·Gate 3 출력·리그 명세·비교 렌더 SHA-256 drift 0

## 검토 렌더

- 캐릭터별 front/side skeleton overlay
- 얼굴·몸·날개 deformation 조합 4상태
- Chakchaki 손 포즈와 Gongsickyi 포인터 좌우 소켓·날개 포즈

## 도구 제약

현재 환경에는 Blender 실행 파일이 없다. glTF 2.0 skin, bind matrix, joint weight, morph accessor와 pose animation을 직접 생성하고 별도 parser로 재검증했다. nearest-joint 자동 가중치는 후보이므로 프로젝트 책임자의 실제 변형 시각 승인이 필요하다.

## 다음 작업

프로젝트 책임자 한 명이 기본 포즈, 손·날개 변형, 얼굴 조합, 시선·포인터 소켓, 액세서리 관통을 검토해야 한다. 승인 전에는 Gate 3를 `VERIFIED`로 올리지 않는다.
