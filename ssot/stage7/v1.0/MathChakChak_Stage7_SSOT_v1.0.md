# Math ChackChack Stage 7 SSOT v1.0

- **버전:** v1.0
- **동결일:** 2026-08-03
- **상태:** 조건부 PASS — 8단계 제작 착수 가능
- **외부 승인 대기:** 착착이 모자 고유 심볼, 브랜드·캐릭터 상표/유사성 공식 검토
- **중요:** 이 문서는 실제 GLB·FBX 완성을 의미하지 않는다. 실제 3D 자산은 8단계에서 제작한다.

## 1. 고정 기준

| 항목 | 확정 내용 |
|---|---|
| 브랜드 | 수학착착 / MATH CHAKCHAK |
| 슬로건 | 수학이 착착, 공식이 척척. |
| 브랜드 약속 | 쉽게 이해하고, 오래 기억하고, 문제는 스스로. |
| 제품 | 초4~6 학생과 학부모를 위한 성장형 1:1 AI 수학 튜터 |
| 학습 구조 | 이해 → 연결 → 반복 → 회상 → 적용 |
| 디자인 | Bento 50% + Material 35% + Playful 15% |
| 색상 | #2F5BFF / #20BFA9 / #FFB84D / #FF6B6B / #172033 |
| 서체 | Gmarket Sans / Pretendard / STIX Two Math |
| Primary CTA | 무료 학습 진단 시작하기 |

## 2. 자료 감사 결과

### 확정본
- 1단계 브랜드·슬로건
- 2단계 사용자·제품
- 3단계 디자인 방향
- 4단계 색상
- 5단계 타이포그래피
- 6단계 정보 밀도·메시지 강도

### 보완 완료
- 기존 7단계 컴포넌트 시스템
- 착착이 역할·캐릭터 기준
- 캐릭터 모듈·리그·BlendShape 사전 명세
- 표정·행동·말풍선 상태 라이브러리

### 승인 기준 참조
- `Chakchaki_Approved_Reference_v1.0.png`
- `Gongsickyi_Approved_Reference_v1.0.png`

### 탐색·폐기
- 초기 합본 UI 보드: 분위기만 참고
- 3D 마스코트 합본 가이드: 연출·말풍선 참고
- `soohack chackchack` 표기: 폐기, 착착이로 통일

## 3. 충돌 결정

1. 소년 캐릭터는 **착착이(Chakchaki)** 로 통일한다.
2. 극사실 인간 아동이 아니라 **10~12세 인상의 stylized realism 3D**로 제작한다.
3. 공식이의 입은 **짧고 둥근 부리-입 하이브리드**로 고정한다.
4. 공식이 영문 작업 ID는 **Gongsickyi**로 통일한다.
5. 최신 분리형 가이드만 Canonical Reference로 사용한다.
6. 착착이 모자 전면 배지는 교체 모듈로 분리하고, 고유 심볼 승인 전 임시 S를 영구 자산에 사용하지 않는다.
7. 현재 이미지는 3D 프리프로덕션 기준이며 실제 GLB/FBX가 아니다.

## 4. 디자인 토큰

- Primary Blue `#2F5BFF`
- Primary Light `#E9EEFF`
- Growth Mint `#20BFA9`
- Reward Yellow `#FFB84D`
- Soft Coral `#FF6B6B`
- Deep Navy `#172033`
- Slate Gray `#667085`
- Soft Line `#DDE3F0`
- Page Background `#F6F8FF`
- 기본 간격 `8px`; 스케일 `4/8/12/16/24/32/48/64/96`
- 컨트롤 radius `10px`, 카드 `12px`, 강조 카드·모달 `16px`
- 최소 터치 `44×44px`
- Focus ring `2px #2F5BFF + 2px offset`
- 모션 `150~220ms ease-out`, `prefers-reduced-motion` 지원
- 컨테이너 `max-width:1200px`
- Breakpoint `360/768/1024/1200`

## 5. 컴포넌트 원칙

계층은 Foundation → Atom → Molecule → Organism → Template로 구성한다.

```text
Button/Primary/Large/Default
Input/Text/Medium/Error
Modal/Diagnostic/Start
Mascot/Gongsickyi/Praise
```

모든 인터랙션 컴포넌트는 필요에 따라 다음 상태를 가진다.

`Default / Hover / Pressed / Focus / Loading / Disabled / Selected / Success / Error`

핵심 규칙:
- 한 화면 Primary CTA 1개
- 카드당 주장·행동 1개
- 색상+텍스트+아이콘으로 상태 표현
- 학생용과 부모용 카피 분리
- 모달은 중요한 결정에만 사용
- 수식은 KaTeX/MathJax로 렌더링
- MVP 화면 재사용률 80% 이상

## 6. 캐릭터 역할

### 공식이
주 마스코트이자 공식 학습 코치다. 설명, 힌트, 칭찬, 재도전, 복습, 검색, 완료를 담당한다. 정답을 먼저 말하지 않는다.

### 착착이
학생의 학습 여정을 대표하는 보조 AI 친구다. 환영, 학습 시작, 공감, 선택 안내, 성장 표현을 담당한다. 공식 설명의 권위자 역할은 맡지 않는다.

## 7. 3D 프리프로덕션 기준

### 착착이
- 10~12세 인상
- 전체 4.4 heads, 허용 ±3%
- Blue cap, White hoodie, Blue shorts, Blue-white shoes, Blue backpack
- 모자·후드·백팩·큰 스니커즈 실루엣 유지
- Head/Hair/Eyes/Brows/Mouth/Cap/Clothes/Hands/Fingers/Shoes/Backpack 모듈화
- Humanoid stylized rig + 얼굴 BlendShape + 손 포즈

### 공식이
- 병아리형 달걀 실루엣: 높이 1.0, 폭 0.86, 깊이 0.78
- 큰 눈, 원형 안경, 학사모, 별 포인터
- 짧고 둥근 부리-입 하이브리드
- Body/Eyes/Brows/MouthBeak/Glasses/Cap/Wings/Feet/Pointer 모듈화
- Creature rig + Squash/Stretch + 날개·립싱크 BlendShape

## 8. 행동 상태

공통 상태 15개:

`Neutral, Welcome, Happy, Listen, Think, Curious, Guide, Search, Praise, Retry, Concern, Celebrate, Wait, Rest, Error`

우선순위:

`오류·안전 > 사용자 직접 행동 > 필수 학습 안내 > 힌트 > 격려 > Idle`

입력 중에는 Listen/Wait만 허용하고 자동 말풍선과 큰 동작을 중지한다. 동일 메시지를 연속 반복하지 않는다. 한 번에 주요 발화 캐릭터는 한 명이다.

## 9. 말풍선 규칙

- 1~2문장
- 한 번에 한 행동
- 정답 선노출 금지
- 비난·불안·아기 말투·과도한 감탄 금지
- 중요한 메시지는 자동 소멸 금지
- 캐릭터를 숨겨도 UI 텍스트로 동일 정보 제공
- viewport 충돌 시 앵커 이동 또는 모바일 sheet 사용

## 10. EXIT 판정

| 항목 | 판정 |
|---|---|
| 디자인 토큰 | 완료 |
| 컴포넌트·상태·접근성 | 완료 |
| 재사용성 80%+ | 완료 |
| 캐릭터 역할 분리 | 완료 |
| 캐릭터 기준형 | 완료 |
| 3D 모듈·리그·BlendShape 명세 | 완료 |
| 표정·동작·말풍선 매핑 | 완료 |
| 탐색·승인 시안 분리 | 완료 |
| 모자 고유 심볼 | 승인 대기 |
| 상표·유사성 공식 검토 | 외부 승인 대기 |

> **최종 판정: 조건부 PASS.**  
> 8단계의 모델링·리깅·상태머신·프론트엔드 제작은 시작할 수 있다. 공개·배포·상품화 전 모자 심볼과 IP 검토를 반드시 통과해야 한다.
