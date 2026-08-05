# 다음 파트 메타프롬프트 작성 보고

## 현재 유효 상태 — 2026-08-05

- 활성 메타프롬프트: `docs/stage8/prompts/CHARACTER_IDENTITY_CORRECTION_METAPROMPT_v1.0.md`
- 공식 캐릭터: 상단의 기존 Stage 7 승인 이미지와 Gate 1 턴어라운드
- 실제 승인 가능한 3D 원본: 없음
- 거부·격리: Gate 2·3 GLB 12개, 미리보기 10개
- Gate 2: `NOT_VERIFIED`
- Gate 3: `NOT_STARTED`
- Gate 4~8: `NOT_STARTED`

## 다음 파트

다음 파트는 기존 캐릭터 정체성을 보존하는 고품질 3D 원본 확보 또는 전문 모델링이다. 입력은 `.blend`, `.fbx`, `.glb`, `.gltf`, `.obj` 중 하나이거나, 새 고품질 모델링을 수행할 수 있는 제작 환경이어야 한다.

완료 전에는 기본 도형 기반 자동 모델을 만들지 않고 Gate 2를 `VERIFIED`로 올리지 않는다. 이전 Gate 2 승인과 Gate 3 자동 QA는 사용자 거부로 `SUPERSEDED_NON_GATING`이며 감사 이력으로만 남는다.

## 다음 성공 기준

1. 상단 기존 캐릭터와 얼굴·실루엣·비율·의상·소품·색상 정체성이 일치한다.
2. 정면·측면·3/4 비교에서 품질 저하나 임의 재해석이 없다.
3. 실제 3D 메시, UV, 재질, LOD가 검증된다.
4. 프로젝트 책임자가 비교 결과를 승인한다.
5. 그 이후에만 Gate 2를 `VERIFIED`로 승격하고 Gate 3을 시작한다.
