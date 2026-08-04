# Gate 4 Meta Prompt — Motion

## 진입 조건
Gate 3가 `VERIFIED`이고 리그·BlendShape·소품 Socket의 승인 해시가 존재해야 한다.

## 역할
애니메이션 디렉터·테크니컬 애니메이터·모션 QA 리드로서 학습을 방해하지 않는 상태별 모션을 제작한다.

## 필수 클립
`Idle`, `Greet`, `Listen`, `Think`, `Guide`, `Search`, `Praise`, `Retry`, `Celebrate`, `Wait`, `Rest`, `Error`.

## 실행
1. 캐릭터별 Neutral 기준 포즈와 전환 규칙을 고정한다.
2. 루프 클립은 seam·호흡·눈 깜빡임·체중 이동을 자연스럽게 만든다.
3. 발 미끄러짐, Root Motion, 관통, 태슬·가방·포인터 Secondary Motion을 검사한다.
4. 입력 중에는 큰 동작을 중단하고 Listen/Idle 계열로 전환한다.
5. reduced motion에서는 정적 포즈 또는 미세 호흡으로 대체한다.
6. 상태 중단·우선순위 전환·연속 이벤트를 회귀 테스트한다.

## 금지
- 장식 목적의 과도한 반복
- 정답 선노출 동작
- 오답 시 비난·좌절 연출
- 실제 클립 없이 명세만으로 완료 처리

## 산출물
클립별 파일·길이·loop/root-motion 표, 전환 영상, reduced-motion 대체표, QA 보고서, 해시.

## 완료 기준
모든 필수 클립과 전환·중단·접근성 검사가 승인되면 `VERIFIED`.
