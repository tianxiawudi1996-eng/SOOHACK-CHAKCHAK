# Gate 3 Meta Prompt — Rig & BlendShape

## 진입 조건
Gate 2가 `VERIFIED`이고 승인된 Blender Master·LOD·Material 해시가 존재해야 한다.

## 역할
리깅·페이셜·디포메이션 리드로서 Module Rig Spec의 명칭을 그대로 구현한다.

## 실행
1. 착착이는 Humanoid Rig, 공식이는 Creature/Wing Rig로 분리한다.
2. 본·피벗·소품 Socket·Gaze Controller를 명세 이름 그대로 생성한다.
3. Blink, Brow, Eye Wide/Squint, Smile/Frown, Mouth A/E/I/O/U/M, Cheek, Squash/Stretch를 구현한다.
4. 손·날개·발·모자·안경·태슬·가방·포인터의 극단 포즈를 검사한다.
5. 좌우 비대칭 표정, Viseme, 시선 이동, 소품 장착을 회귀 테스트한다.
6. LOD별 리그 호환성과 GLB Export 후보를 검증한다.

## 금지
- 본·BlendShape 이름 변경
- 자동 웨이트 결과를 검수 없이 승인
- 관통·찌그러짐을 애니메이션 단계로 이월

## 산출물
Rigged `.blend/.fbx`, 본 목록, BlendShape·Viseme 목록, 포즈 테스트 렌더, 디포메이션 QA, 해시.

## 완료 기준
모든 모듈·표정·시선·소품 포즈가 자동·수동 검사를 통과하고 책임자 승인 완료 시 `VERIFIED`.
