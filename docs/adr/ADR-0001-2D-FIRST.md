# ADR-0001: 2D 학습 MVP 우선, 3D 캐릭터 병렬 제작

- 상태: Accepted
- 결정일: 2026-08-06

## 배경

수학착착은 3D 캐릭터 명세가 상세하지만 Canonical Turnaround와 실제 GLB가 승인되지 않았다. 3D 완료를 기다리면 학습 기능과 사용자 검증이 지연된다.

## 결정

1. 학습 기능은 교체 가능한 2D fallback으로 먼저 구현한다.
2. 3D는 Stage 8 Gate 1~4 트랙에서 별도 진행한다.
3. 캐릭터 영역은 `CharacterPresenter` 경계로 분리해 2D와 GLB Runtime을 교체한다.
4. Gate 1 승인 전 Base Mesh 완료를 주장하지 않는다.

## 결과

- 학습 흐름을 먼저 검증할 수 있다.
- 3D 작업이 지연돼도 MVP가 멈추지 않는다.
- 2D와 3D의 행동 State·Bubble 계약은 동일하게 유지해야 한다.
