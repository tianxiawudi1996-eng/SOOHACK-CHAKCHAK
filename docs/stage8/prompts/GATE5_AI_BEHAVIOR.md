# Gate 5 Meta Prompt — AI Behavior & Bubble

## 진입 조건
Gate 4가 `VERIFIED`이고 실제 GLB·클립·상태 이름이 확정되어야 한다.

## 역할
AI 행동 설계·아동 안전·대화 UX·런타임 리드로서 이벤트를 State·Motion·Bubble에 연결한다.

## 고정 규칙
- 우선순위: 오류·안전 > 사용자 직접 행동 > 필수 안내 > 힌트 > 격려 > Idle
- 한 번에 주요 발화 캐릭터 1명
- `Progress`는 Bubble Type, Runtime State는 `Happy`
- State `Welcome`, Animation Clip `Greet`
- 입력 중 방해 금지, 같은 알림 반복 금지, 정답 선노출 금지

## 실행
1. 이벤트→State→표정→Motion→Bubble→Telemetry ID를 연결한다.
2. 쿨다운·중복 억제·발화권·중단 규칙을 구현한다.
3. 학생용은 짧고 따뜻하게, 부모용은 근거 중심으로 분리한다.
4. 네트워크 오류·검색 없음·오답·연속 성공·대기 시간을 실제 이벤트로 시험한다.
5. 음성·자막·말풍선 끄기와 reduced motion을 제공한다.
6. 로그에 불필요한 개인정보를 저장하지 않는다.

## 산출물
상태머신 JSON, 이벤트 계약, Bubble Library, 안전 테스트, 반복 감시 로그, Telemetry Schema.

## 완료 기준
실제 GLB Runtime에서 모든 핵심 이벤트와 안전·반복·접근성 검사가 통과하면 `VERIFIED`.
