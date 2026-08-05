# 수학착착 Stage 8 — 캐릭터 정체성 복구 실행 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 수학착착 학습자, 프로젝트 책임자, 캐릭터·3D 제작 담당자
- 달라져야 하는 것: 기존 상단 승인 캐릭터만 공식 시각 기준으로 유지하고, 정체성이 다른 하단 절차형 모델을 제품 후보에서 제거한다.

## 2. Specification Engineering

완료 상태는 다음과 같다.

1. Stage 7 승인 이미지와 Gate 1 턴어라운드의 경로·SHA-256이 고정된다.
2. 거부된 Gate 2·3 GLB와 미리보기는 복구 가능한 별도 경로에 격리된다.
3. Gate 2는 `NOT_VERIFIED`, Gate 3은 `NOT_STARTED`가 된다.
4. 실제 고품질 3D 원본이 없음을 명시한다.
5. 절차형 기본 도형 생성기는 캐릭터 후보를 더 이상 만들지 않는다.

## 3. Context Engineering

- 공식 2D 기준: `ssot/stage7/v1.0/*_Approved_Reference_v1.0.png`
- 공식 다면도 기준: `evidence/gate-1/candidates/*_Canonical_Turnaround_Candidate_*.png`
- 상태·증거: `harness/status.json`, `docs/stage8/evidence/ACTIVE_CHARACTER_REFERENCE_REGISTER_v1.0.json`
- 3D 원본 검색 결과: 승인 가능한 `.blend`, `.fbx`, `.glb`, `.gltf`, `.obj` 없음

## 4. Harness Engineering

- SHA-256으로 공식 이미지가 바뀌지 않았는지 검사한다.
- 활성 Gate 2·3 출력 경로에 거부된 GLB가 남아 있으면 실패한다.
- 격리 자산은 감사 이력으로만 보존하며 재사용·승격하지 않는다.
- 2D 이미지를 실제 3D 메시라고 주장하지 않는다.

## 5. Prompt Engineering

지금 할 작업은 잘못된 승격을 취소하고 공식 캐릭터 기준을 복구하는 것이다. 새 캐릭터 생성, 저품질 자동 변환, 리깅 진행은 범위 밖이다.

성공 기준:

- 공식 이미지 해시 일치
- 활성 저품질 GLB 0개
- Gate 2 `NOT_VERIFIED`
- Gate 3 `NOT_STARTED`
- Gate 3·4 진입 차단

실패 기준:

- 공식 이미지 누락 또는 해시 불일치
- 거부 자산이 활성 출력에 존재
- 승인 취소 뒤에도 Gate 2·3이 승격 상태

## 6. Workflow Engineering

공식 이미지 확인 → 3D 원본 검색 → 저품질 후보 격리 → 승인·상태 취소 → 생성기 차단 → 감사 재실행 순서로 진행한다.

## 7. Memory Engineering

- 남길 것: 공식 이미지 해시, 격리 경로, 거부 사유, 현재 Gate 상태, 필요한 다음 입력
- 없앨 것: 저품질 후보의 활성 자산 지위, 잘못된 승인 효력, 2D를 3D로 간주한 기록

## 8. Loop Engineering

새 3D 입력마다 공식 이미지와 정체성·비율·의상·소품·표현 품질을 먼저 비교한다. 하나라도 불일치하면 Gate 2를 통과시키지 않는다. 고품질 3D 후보와 책임자 승인이 모두 충족될 때 종료한다.
