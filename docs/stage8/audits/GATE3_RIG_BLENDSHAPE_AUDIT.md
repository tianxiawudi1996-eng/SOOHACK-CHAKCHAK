# Gate 3 Rig & Blendshape Audit

## Outcome

- Status: `BLOCKED_EXTERNAL`
- Automated status: `PASS`
- Rig files: `6/6 PASS`
- Manual approval: `0/1`
- Gate 3 status change applied: `false`
- Gate 4 allowed: `false`

## Rig metrics

| Character | LOD | Joints | Weighted vertices | Morphs | Poses | Result |
|---|---:|---:|---:|---:|---:|---|
| Chakchaki | LOD0 | 32 | 11,768 | 18 | 4 | `PASS` |
| Chakchaki | LOD1 | 32 | 5,804 | 18 | 4 | `PASS` |
| Chakchaki | LOD2 | 32 | 2,002 | 15 | 4 | `PASS` |
| Gongsickyi | LOD0 | 20 | 5,738 | 22 | 4 | `PASS` |
| Gongsickyi | LOD1 | 20 | 2,882 | 22 | 4 | `PASS` |
| Gongsickyi | LOD2 | 20 | 1,150 | 20 | 4 | `PASS` |

## Failures

- 없음

## Blockers

- PROJECT_OWNER_DEFORMATION_REVIEW_REQUIRED

## Decision

실제 GLB skin·joint hierarchy·inverse bind matrix·normalized weights·non-zero morph target·pose·socket을 검사했다. 자동 검사가 통과해도 프로젝트 책임자의 기본 포즈·표정·시선·소품·관통 비교 승인 전에는 Gate 3를 `VERIFIED`로 올리지 않는다.
