# Gongsickyi Character Bible v1.0

## 1. 정체성
- **사용자 노출명:** 공식이
- **작업 ID:** Gongsickyi
- **역할:** 공식의 뜻과 기억 연결을 돕는 병아리형 주 마스코트·학습 코치
- **핵심 성격:** 호기심, 정확함, 인내심, 따뜻한 성취 축하
- **교육 태도:** 정답을 대신 말하지 않고 다음 한 단계의 사고를 돕는다.

## 2. Canonical 외형
- 달걀형 몸: 높이 1.0 / 폭 0.86 / 깊이 0.78, 허용 ±3%
- 눈 지름: 몸 폭의 약 18%, 허용 ±4%
- 눈 간격: 눈 지름의 약 0.42
- 원형 네이비 안경은 눈 가장자리를 가리지 않는다.
- 네이비 학사모와 별 포인터는 핵심 실루엣이다.
- 입은 길게 돌출되지 않는 짧고 둥근 **부리-입 하이브리드**다.
- 발은 짧고 넓어 정지·착지 시 안정적으로 보인다.

## 3. 색상·재질
- Body: Reward Yellow `#FFB84D`
- Highlight: `#FFD57A`
- Shadow: `#E39A20`
- Cap/Glasses: Deep Navy `#172033`
- Accent: Primary Blue `#2F5BFF`
- Feet/Pointer handle: warm brown
- 재질은 실제 깃털이 아니라 부드러운 다운 느낌의 stylized PBR이다.
- 플라스틱 장난감처럼 과도한 gloss를 사용하지 않는다.

## 4. 변경 불가 특징
1. 달걀형 병아리 실루엣
2. 큰 눈과 원형 안경
3. 학사모
4. 별 포인터
5. Yellow/Navy 중심 색상
6. 따뜻하고 정확한 학습 코치의 태도

## 5. 허용 변형
- 포인터 on/off
- 안경 반사 강도 조절
- 학사모 태슬 방향
- 계절·행사 작은 배지
- 표정·날개 포즈
- LOD에 따른 깃털·재질 단순화

## 6. 금지
- 긴 실제 새 부리
- 사람형 팔·손
- 완전 구형 또는 납작한 몸
- 안경·학사모 동시 제거
- 유명 병아리 캐릭터의 눈·부리·실루엣 복제
- 정답 선노출·비난·과도한 아기 말투

## 7. 모듈
`Body, Eyes, Eyebrows, Eyelids, MouthBeak, Cheeks, Glasses, GraduationCap, Wings, Feet, StarPointer`

분리 모듈:
- Eyes, Eyebrows, MouthBeak, Glasses, GraduationCap, Feet, StarPointer

변형 핵심:
- Eyes look/blink/wide/squint
- Brows up/down/in/out
- Mouth smile/frown/O/U/A/E/M
- Body breathe/squash/stretch
- Wings open/fold
- Cheek puff/blush
- Star glow

## 8. 핵심 상태·대사
| State | 행동 | 대사 |
|---|---|---|
| Guide | 별 포인터로 공식 지시 | 공식의 뜻부터 같이 볼까? |
| Think | 날개 모으고 시선 위 | 어떤 뜻인지 먼저 떠올려보자. |
| Praise | 날개 펼침·별 반짝임 | 착! 정확하게 기억했어. |
| Retry | 차분한 안내 | 괜찮아, 한 단계만 다시 해보자. |
| Search | 돋보기·시선 이동 | 관련 내용을 찾고 있어. |
| Celebrate | 작은 점프·컨페티 1회 | 오늘 학습을 끝냈어! |
| Error | 걱정 눈·재시도 안내 | 연결을 확인하고 다시 시도해보자. |

## 9. 모션
- Idle: 4~7초 루프, 미세 호흡·눈 깜빡임·시선 이동
- Guide: 0.8~1.4초, UI를 가리지 않음
- Praise: 0.8~1.2초
- Retry: 0.8~1.2초
- Celebrate: 1.0~1.5초, 컨페티 1.2초 이하
- Hop: 0.7~1.0초
- reduced motion에서는 점프·컨페티를 정적 포즈로 대체한다.

## 10. 승인 참조
- `Gongsickyi_Approved_Reference_v1.0.png`
- 이 이미지는 제작 방향 기준이며 정확한 정투영·실제 GLB가 아니다.
