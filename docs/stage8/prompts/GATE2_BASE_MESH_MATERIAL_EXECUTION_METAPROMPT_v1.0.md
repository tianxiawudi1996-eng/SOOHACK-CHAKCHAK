# 수학착착 Stage 8 — Gate 2 베이스 메시·머티리얼 실행 메타프롬프트 v1.0

## 0. 실행 선언

이 프롬프트는 Gate 1에서 승인된 Chakchaki·Gongsickyi Canonical View를 실제 glTF 2.0 GLB 베이스 메시, 분리 모듈, PBR 재질과 LOD0/1/2 후보로 변환하고 자동·수동 증거로 Gate 2를 통제한다. 실제 파일과 검증 결과 없이 완료를 주장하지 않는다.

현재 선행 상태:

```text
Gate 0: VERIFIED
Gate 1: VERIFIED
Gate 2: NOT_STARTED → 실행 후 BLOCKED_EXTERNAL 예상
Gate 3: NOT_STARTED
```

## 1. Goal Framing

### 사용자

- 수학착착 프로젝트 책임자
- 3D 모델링·LookDev·런타임 담당자
- 다음 Gate의 Rig·BlendShape 제작자

### 달라져야 하는 것

- 2D Canonical View만 존재하던 상태에서 실제 로딩 가능한 GLB 후보가 생긴다.
- 두 캐릭터의 필수 모듈, UV0, PBR 재질과 LOD 계층이 기계 검증 가능해진다.
- 프로젝트 책임자가 비교 렌더를 한 번 검토할 수 있다.

## 2. Specification Engineering

### 완료 상태

1. `char_<id>_lod0/1/2_v100.glb` 여섯 파일이 실제 존재한다.
2. glTF 2.0, meter 단위, Y-up, root scale 1.0이다.
3. Chakchaki 21개, Gongsickyi 11개 명세 모듈 노드가 존재한다.
4. 모든 메시 primitive에 POSITION, NORMAL, UV0, triangle index가 있다.
5. PBR base color·roughness·metallic 값이 내장되고 외부 텍스처 의존성이 없다.
6. LOD1은 LOD0 triangle의 45~60%, LOD2는 15~25%다.
7. welded topology 기준 non-manifold edge와 degenerate triangle이 0이다.
8. Chakchaki CapBadge는 `PLACEHOLDER_IP_PENDING` 교체 모듈이다.
9. Canonical-vs-LOD0 및 LOD 비교 렌더가 캐릭터별로 존재한다.
10. 프로젝트 책임자의 수동 비교 검토 1/1 전에는 Gate 2를 승격하지 않는다.

### 성공 기준

```text
models = 6/6 PASS
automated QA = PASS
LOD1 ratio = 0.45~0.60
LOD2 ratio = 0.15~0.25
non-manifold = 0
degenerate triangles = 0
manual approval = 1/1
status = READY_FOR_PROMOTION
```

### 실패·차단 기준

- GLB·모듈·UV·PBR·해시·LOD 오류: `FAIL`
- Gate 1 미검증 또는 source hash drift: `FAIL`
- 프로젝트 책임자 비교 검토 누락: `BLOCKED_EXTERNAL`
- 수동 `REJECT`: `FAIL`
- CapBadge를 최종 심볼로 확정: `FAIL`

## 3. Context Engineering

### 기술 스택

- Python 3, Pillow
- 직접 생성한 glTF 2.0 binary GLB
- embedded PBR material factor, UV0
- 결정적 LOD0/1/2 topology
- Blender 미설치 환경에서 GLB 구조를 직접 파싱하는 감사기

### 입력

- `evidence/gate-1/candidates/Chakchaki_Canonical_Turnaround_Candidate_v3.png`
- `evidence/gate-1/candidates/Gongsickyi_Canonical_Turnaround_Candidate_v4.png`
- `ssot/stage7/v1.0/Chakchaki_Character_Bible_v1.0.md`
- `ssot/stage7/v1.0/Gongsickyi_Character_Bible_v1.0.md`
- `ssot/stage7/v1.0/Character_Module_Rig_Spec_v1.0.xlsx`

### 출력

- `outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/gate2/*.glb`
- `docs/stage8/evidence/gate2/GATE2_BUILD_MANIFEST_v1.0.json`
- `docs/stage8/evidence/gate2/GATE2_AUTOMATED_QA_v1.0.json`
- `docs/stage8/evidence/gate2/GATE2_MANUAL_REVIEW_v1.0.json`
- `docs/stage8/evidence/gate2/previews/`
- `docs/stage8/audits/GATE2_BASE_MESH_MATERIAL_AUDIT.md`

## 4. Harness Engineering

### 허용 도구

- `scripts/harness/build_gate2_base_mesh.py`
- `scripts/harness/audit_gate2.py`
- `scripts/harness/inspect_stage7_rig_spec.mjs`
- `scripts/harness/audit_stage8.py`
- `scripts/harness/validate_harness.py`
- SHA-256, Git diff/status

### 통제

1. Stage 7 SSOT와 Gate 1 증거를 수정하지 않는다.
2. 실제 GLB 파일이 없으면 Gate 2 완료를 주장하지 않는다.
3. CapBadge에는 영구 `S` 또는 임의 신규 로고를 고정하지 않는다.
4. 자동 렌더는 수동 실루엣·색상·관통 검토를 대체하지 않는다.
5. Rig, BlendShape, animation은 Gate 3 이후 작업으로 남긴다.
6. Gate 2 `VERIFIED` 전에는 Gate 3를 시작하지 않는다.

## 5. Prompt Engineering

### 지금 할 작업

1. Stage 7 모듈·LOD 명세와 Gate 1 해시를 검증한다.
2. 두 캐릭터의 분리 모듈 베이스 메시를 생성한다.
3. PBR 재질, UV0, LOD0/1/2를 GLB에 기록한다.
4. Canonical 비교 렌더와 LOD 비교 렌더를 만든다.
5. 구조·토폴로지·LOD·재질·해시를 자동 감사한다.
6. 자동 PASS 후 프로젝트 책임자의 1인 수동 결정을 대기한다.

### 수동 검토 입력

```text
Reviewer name:
Decision: APPROVE | APPROVE_WITH_PATCH | REJECT
Reviewed at: ISO-8601 with timezone
Scope acknowledged: true
Silhouette matches canonical: true|false
Proportions match Character Bible: true|false
Color/material drift acceptable: true|false
Accessory intersections clear: true|false
LOD transitions acceptable: true|false
Comment:
```

## 6. Workflow Engineering

```text
1. Gate 1 and source-hash check
2. Rig-spec workbook inspection
3. Base-module construction
4. UV0 and PBR material assignment
5. LOD generation
6. GLB binary export
7. Canonical/LOD comparison render
8. Automated Gate 2 audit
9. One-person manual review
10. Controlled Gate 2 promotion
```

## 7. Memory Engineering

### 남길 것

- 여섯 GLB 경로·SHA-256·triangle·vertex·material 수
- LOD 비율과 module 목록
- CapBadge placeholder 상태
- 비교 렌더와 수동 결정
- 자동 실패·외부 차단 원인

### 없앨 것

- Blender가 있다고 가정한 기록
- 실제 파일 없는 완료 주장
- 자동 렌더를 사람 승인으로 계산한 값
- Gate 2 전 Rig·animation 완료 주장

## 8. Loop Engineering

### 반복 단위

모델 생성 → GLB 감사 → 비교 렌더 확인 → drift 보정 → 재감사다.

### 종료 조건

- 성공: 자동 6/6 PASS와 수동 승인 1/1
- 외부 차단: 자동 PASS 후 프로젝트 책임자 검토 대기
- 실패: 파일·해시·topology·UV·PBR·LOD 오류 또는 수동 거절

## 9. 실행 명령

```powershell
python scripts/harness/build_gate2_base_mesh.py
python scripts/harness/audit_gate2.py
python scripts/harness/audit_stage8.py
python scripts/harness/validate_harness.py
git diff --check
```

## 10. 지금 실행할 지시

1. 여섯 GLB와 네 비교 렌더를 실제 생성한다.
2. 자동 감사가 6/6 PASS인지 확인한다.
3. 프로젝트 책임자 수동 검토가 없으면 `BLOCKED_EXTERNAL` 0/1로 보고한다.
4. Gate 3를 시작하지 않는다.
