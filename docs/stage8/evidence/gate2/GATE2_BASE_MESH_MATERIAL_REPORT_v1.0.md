# Gate 2 Base Mesh & Material Report v1.0

## 결과

- 실제 GLB: 6개 생성
- 자동 QA: `PASS`
- 자동 모델 검사: `6/6 PASS`
- 프로젝트 책임자 시각 승인: `1/1 APPROVE` (`John KIM`)
- 실패·차단: `0`
- Gate 2: `VERIFIED`
- Gate 3: `NOT_STARTED`, 진입 허용

## 메시 수치

| Character | LOD0 triangles | LOD1 | Ratio | LOD2 | Ratio |
|---|---:|---:|---:|---:|---:|
| Chakchaki | 23,372 | 11,444 | 48.96% | 3,876 | 16.58% |
| Gongsickyi | 11,028 | 5,444 | 49.37% | 2,028 | 18.39% |

두 캐릭터 모두 LOD1 45~60%, LOD2 15~25% 기준을 통과했다. 여섯 파일 모두 welded topology 기준 non-manifold edge 0, degenerate triangle 0이며 UV0·normal·embedded PBR material을 가진다.

## 모듈·재질

- Chakchaki: Character Bible의 21개 모듈 노드
- Gongsickyi: Character Bible의 11개 모듈 노드
- 외부 texture dependency 없음
- BaseColor·roughness·metallic PBR factor 내장
- UV0는 후속 texture baking을 위해 유지
- CapBadge: `PLACEHOLDER_IP_PENDING`, 교체 가능·최종 상표 미확정

## 수동 승인

John KIM이 두 캐릭터의 Canonical-vs-LOD0 및 LOD 비교 렌더를 대상으로 실루엣, 비율, 색상·재질 drift, 액세서리 관통, LOD 전환을 확인하고 `APPROVE`했다. 승인 시각은 `2026-08-05T08:27:34+09:00`이다.

## 도구 제약

현재 환경에는 Blender 실행 파일이 없다. GLB는 glTF 2.0 규격으로 직접 생성했으며 별도 파서가 header, chunk, accessor, triangle topology, UV0, normal, PBR, module, scale, axis와 SHA-256을 검증했다.

## 다음 작업

Gate 3 Rig & Blendshape 작업을 시작할 수 있다. 이번 승인 작업 자체는 리그·블렌드셰이프 자산을 생성하지 않았다.
