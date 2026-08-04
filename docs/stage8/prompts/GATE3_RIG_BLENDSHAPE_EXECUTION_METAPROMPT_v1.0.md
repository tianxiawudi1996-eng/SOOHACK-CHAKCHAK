# 수학착착 Stage 8 — Gate 3 Rig & Blendshape 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 3D Technical Art Lead, Character Art Lead, Product Owner
- 변화: 승인된 Gate 2 메시를 Stage 7 본맵·BlendShape 명칭과 일치하는 실제 glTF skin·joint·morph target 후보로 전환한다.

## 2. Specification Engineering

완료 상태는 다음과 같다.

1. Gate 2가 `VERIFIED`이고 입력 GLB 6개의 SHA-256이 고정돼 있다.
2. 모든 LOD GLB에 실제 `skin`, joint hierarchy, inverse bind matrix, `JOINTS_0`, `WEIGHTS_0`가 있다.
3. Chakchaki는 humanoid 필수 계층과 손 포즈 4개를 가진다.
4. Gongsickyi는 creature 필수 계층, 양쪽 3단 날개와 좌우 포인터 소켓을 가진다.
5. 공통 필수 얼굴 상태 15개와 캐릭터 전용 필수 상태가 실제 non-zero morph target으로 존재한다.
6. 가중치 합, 본 부모 관계, 소켓, morph·pose 명칭, 입력·출력 해시가 자동 검사를 통과한다.
7. 프로젝트 책임자 1인이 기본 포즈·표정·시선·소품·관통 비교를 승인한다.

자동 검사가 통과해도 수동 승인 전 상태는 `BLOCKED_EXTERNAL`이다.

## 3. Context Engineering

- 리그 명세: `docs/ssot/stage7/v1.0/Character_Module_Rig_Spec_v1.0.xlsx`
- 승인 입력: `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2/`
- 출력: `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate3/`
- 증거: `docs/stage8/evidence/gate3/`
- 기술: glTF 2.0 GLB, Y-up, meter, root scale 1.0, embedded buffer

## 4. Harness Engineering

- 도구: Python 표준 라이브러리, Pillow, 직접 GLB parser/writer, SHA-256, Stage 8 Harness
- 통제: 본·morph 명칭을 임의로 바꾸지 않는다. Gate 2 파일은 수정하지 않는다.
- Blender가 없는 환경에서는 glTF 구조·가중치·변형 accessor를 직접 생성·파싱한다.
- 자동 웨이트 결과는 후보이며 수동 승인 전 완료로 간주하지 않는다.
- Gate 3 `VERIFIED` 전에는 Gate 4를 시작하지 않는다.

## 5. Prompt Engineering

1. Gate 2 상태와 6개 입력 해시를 검증한다.
2. 캐릭터별 본 계층과 bind pose를 만든다.
3. 모든 메시 primitive에 joint index와 정규화된 weight를 기록한다.
4. 명세상의 필수 얼굴·몸·날개 morph target과 손/소켓 pose를 기록한다.
5. skeleton 및 deformation 비교 렌더를 생성한다.
6. 자동 감사로 구조·명칭·부모·가중치·non-zero morph·해시를 검증한다.
7. 프로젝트 책임자 1인 승인 전 Gate 3을 `BLOCKED`로 유지한다.

## 6. Workflow Engineering

```text
Gate 2 hash check → skeleton → skin weights → morph targets → pose library → review renders → automated audit → one-person review
```

## 7. Memory Engineering

- 남길 것: 입력·출력 해시, 본·morph·pose 목록, 가중치 검사, 소켓 부모, 비교 렌더, 미승인 상태
- 없앨 것: 임시 dependency junction, 추정 승인, 승인되지 않은 `VERIFIED` 상태
- 인계: `Gate 3 automated QA [STATUS] / rigs 6/6 / manual [N]/1 / Gate 4 [STATUS]`

## 8. Loop Engineering

- 반복: 한 캐릭터·LOD 생성 → 파싱 → 계층/가중치/morph 검사 → 전체 재검증
- 성공: 자동 검사 6/6과 수동 승인 1/1
- 외부 차단: 수동 시각 승인 미입력
- 실패: 입력 해시 drift, 본·morph 누락, 잘못된 부모, 비정규 가중치, 빈 변형

## 실행 명령

```powershell
python scripts/harness/build_gate3_rig.py
python scripts/harness/audit_gate3.py
python scripts/harness/audit_stage8.py
python scripts/harness/validate_harness.py
git diff --check
```

현재 실행은 실제 후보 생성과 자동 감사까지 수행하며, 수동 승인을 추정하지 않는다.
