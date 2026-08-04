# Gate 2 Base Mesh & Material Audit

## Outcome

- Status: `VERIFIED`
- Automated status: `PASS`
- Models: `6/6 PASS`
- Manual approval: `1/1`
- Gate 2 status change applied: `true`
- Gate 3 allowed: `true`

## Model metrics

| Character | LOD | Triangles | Vertices | Materials | Non-manifold edges | Result |
|---|---:|---:|---:|---:|---:|---|
| Chakchaki | LOD0 | 23,372 | 11,768 | 10 | 0 | `PASS` |
| Chakchaki | LOD1 | 11,444 | 5,804 | 10 | 0 | `PASS` |
| Chakchaki | LOD2 | 3,876 | 2,002 | 8 | 0 | `PASS` |
| Gongsickyi | LOD0 | 11,028 | 5,738 | 9 | 0 | `PASS` |
| Gongsickyi | LOD1 | 5,444 | 2,882 | 9 | 0 | `PASS` |
| Gongsickyi | LOD2 | 2,028 | 1,150 | 8 | 0 | `PASS` |

LOD1 ratios are 0.4896 and 0.4937; LOD2 ratios are 0.1658 and 0.1839.

## Failures

- 없음

## Blockers

- 없음

## Decision

실제 GLB 6개와 비교 렌더를 생성했고 자동 구조·토폴로지·UV·PBR·LOD 검사를 수행했다. 프로젝트 책임자의 유효한 1인 승인과 상태 승격이 모두 확인된 경우에만 Gate 2를 `VERIFIED`로 판정한다.
