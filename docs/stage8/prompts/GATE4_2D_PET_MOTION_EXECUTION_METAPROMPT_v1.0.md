# 수학착착 Stage 8 — Gate 4 2D 펫 전환 모션 실행 메타프롬프트 v1.0

## 1. Goal Framing

정적인 2D 포즈를 화면 가장자리에서 자연스럽게 반응하는 학습 동반자 행동으로 연결한다.

## 2. Specification Engineering

필수 상태는 `IDLE_LISTEN`, `WELCOME`, `GUIDE`, `THINK`, `PRAISE_PROGRESS`, `SEARCH`, `CELEBRATE`, `RETRY`다. 모션은 2D 이미지의 위치·회전·크기·투명도만 사용하며 과도한 흔들림을 금지한다. `prefers-reduced-motion`에서는 점프·스쿼시를 정적 포즈 전환으로 대체한다.

## 3. Context Engineering

입력은 Gate 3에서 승인된 개별 PNG/WebP와 런타임 매니페스트다. 출력은 상태 전환 표, 타이밍 토큰, CSS/Canvas/앱 런타임 구현, 자동 접근성 QA와 시각 승인 기록이다.

## 4. Harness Engineering

승인 해시 외 자산 로드를 차단한다. 프레임 드롭, 레이아웃 이동, 클릭 차단, 화면 밖 잘림, reduced-motion 미지원은 실패다.

## 5. Prompt Engineering

Idle 4~7초 루프, Welcome 0.8~1.2초, Think 2~4초, Guide 0.8~1.4초, Celebrate 1.0~1.5초를 기준으로 구현한다. 상태 전환 8/8, reduced-motion 8/8, 주요 뷰포트 QA 통과가 성공 기준이다.

## 6. Workflow Engineering

`상태 매핑 → 전환 토큰 → 기본 모션 → reduced-motion → 성능 측정 → 시각 QA → Gate 4 승인`

## 7. Memory Engineering

상태별 자산 해시, 지속시간, easing, 트리거, fallback, 접근성 대체 동작을 남긴다. 실험용 과장 모션과 미사용 프레임은 정본에서 제거한다.

## 8. Loop Engineering

한 상태씩 정상 모션과 reduced-motion을 함께 검증한다. 8개 상태의 의미가 즉시 읽히고 성능·접근성 기준을 통과하면 종료한다.
