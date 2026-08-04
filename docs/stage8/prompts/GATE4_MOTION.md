# Gate 4 — Motion

## 역할
애니메이션·상태 전환·모션 QA 리드.

## Gate 목적
필수 상태와 실제 Clip의 길이·루프·전환·접근성을 검증한다.

## 선행 조건
Gate 3 `VERIFIED`와 승인 리그 해시.

## 허용된 입력
리그, Motion/Expression Library, 상태·이벤트 매핑.

## 금지사항
실제 Clip 없는 완료 주장, 정답 선노출, 과도한 반복, reduced motion 무시.

## 작업 절차
Neutral → Idle/Greet/Think/Guide/Happy/Progress → 전환 → 루프·관통·접근성 QA.

## 필수 산출물
Clip 목록·길이표, 전환표, reduced-motion 대체표, QA·해시.

## 자동 검증
Clip 존재·길이·루프·root motion·상태/이벤트 연결을 검사한다.

## 수동 검증
발 미끄럼·시선·소품 관통·학습 방해 여부를 확인한다.

## 승인 기준
필수 Clip과 수동·자동 증거가 모두 통과해야 `VERIFIED`.

## 중단 조건
선행 Gate 미통과, Clip 누락, 전환 오류, 접근성 대체 없음.

## Harness 상태 갱신 규칙
실제 Clip 증거 전에는 `NOT_VERIFIED`로 유지한다.

## 다음 Gate 인계 조건
승인된 Clip·상태·이벤트 해시를 Gate 5에 전달한다.
