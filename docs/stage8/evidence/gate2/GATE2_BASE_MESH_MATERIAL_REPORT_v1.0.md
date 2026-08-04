# Gate 2 Base Mesh & Material Report v1.0

## 결과

- 실제 GLB: 6개 생성
- 자동 QA: `PASS`
- 자동 모델 검사: `6/6 PASS`
- 수동 비교 검토: `0/1 PENDING`
- Gate 2: `BLOCKED_EXTERNAL`
- Gate 3: `NOT_STARTED`

## 수치

| Character | LOD0 triangles | LOD1 | Ratio | LOD2 | Ratio |
|---|---:|---:|---:|---:|---:|
| Chakchaki | 23,372 | 11,444 | 48.96% | 3,876 | 16.58% |
| Gongsickyi | 11,028 | 5,444 | 49.37% | 2,028 | 18.39% |

두 캐릭터 모두 LOD1 45~60%, LOD2 15~25% 기준을 통과한다. 여섯 파일 모두 welded topology 기준 non-manifold edge 0, degenerate triangle 0이며 UV0·normal·embedded PBR material을 가진다.

## 모듈·재질

- Chakchaki: Character Bible의 21개 모듈 노드
- Gongsickyi: Character Bible의 11개 모듈 노드
- 외부 texture dependency 없음
- BaseColor·roughness·metallic PBR factor 내장
- UV0는 후속 texture baking을 위해 유지
- CapBadge: `PLACEHOLDER_IP_PENDING`, 교체 가능, 최종 심볼 미확정

## 비교 렌더 관찰

- Chakchaki: 파란 모자, 흰 후드, 파란 하의·백팩, 큰 신발과 A-pose 실루엣이 유지된다. 얼굴·머리·손가락은 베이스 메시 수준으로 단순화돼 있다.
- Gongsickyi: 달걀형 몸, 큰 눈·원형 안경, 학사모, 짧은 부리, 날개·발·별 포인터가 유지된다.
- LOD1과 LOD2에서 핵심 실루엣과 액세서리를 보존했다.
- 자동 비교 렌더는 실제 DCC 뷰포트의 관통·쉐이딩·정투영 판단을 완전히 대체하지 않는다.

## 도구 제약

현재 환경에 Blender 실행 파일이 없다. 따라서 GLB는 glTF 2.0 규격으로 직접 생성했고, 별도 파서가 header, chunk, accessor, triangle topology, UV0, normal, PBR, module, scale, axis와 hash를 검사했다.

## 남은 작업

프로젝트 책임자 한 명이 Canonical-vs-LOD0 및 LOD 비교 렌더에서 실루엣, 비율, 색상·재질 drift, 액세서리 관통, LOD 전환을 확인해야 한다. 승인 전에는 Gate 2를 `VERIFIED`로 올리지 않는다.
