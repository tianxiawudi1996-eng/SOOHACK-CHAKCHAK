# Chakchaki Character Bible v1.0

## 1. 정체성
- **사용자 노출명:** 착착이
- **작업 ID:** Chakchaki
- **역할:** 학생의 학습 여정을 대표하는 보조 AI 학습 친구
- **연령 인상:** 10~12세, 초4~6 학생이 친구로 느끼는 범위
- **핵심 성격:** 호기심, 친근함, 공감, 꾸준함, 성장
- **교육 태도:** 함께 시작하고 선택을 돕지만 공식 설명의 권위자 역할은 맡지 않는다.

## 2. Canonical 외형
- 전체 비율: 4.4 heads, 허용 ±3%
- 머리 높이 약 22.7%, 몸통 약 29%, 다리·신발 약 31%
- 눈 중심선: 얼굴 높이 약 48%
- 눈 간격: 눈 폭의 약 0.85
- 큰 눈을 사용하되 유아형 과장을 피한다.
- 둥근 Blue cap, White hoodie, Blue shorts, Blue-white sneakers, Blue backpack
- 모자·후드·백팩·큰 스니커즈가 핵심 실루엣이다.
- 특정 실존 아동을 닮지 않는 stylized realism 3D다.

## 3. 색상·재질
- Cap/Shorts/Backpack: Primary Blue `#2F5BFF`
- Deep accent: `#173EA5` 또는 Deep Navy `#172033`
- Hoodie: warm white
- Hair: dark warm brown
- Skin: neutral warm stylized tone
- Shoes: White + Blue + neutral rubber
- 피부는 미세 roughness를 유지하고 사진 같은 pore를 만들지 않는다.
- 의상은 부드러운 fabric PBR, 모자 챙과 신발은 구조를 분명히 한다.

## 4. 변경 불가 특징
1. 10~12세 인상
2. Blue cap
3. White hoodie
4. Blue shorts
5. Blue backpack
6. 큰 스니커즈
7. 친근하지만 유아적이지 않은 얼굴
8. 공식이를 보조하는 학생 대표 역할

## 5. 모자 심볼
모자 전면 심볼은 **교체 가능한 CapBadge 모듈**이다.
- 기존 영문 `S`는 탐색 시안 표기이며 영구 사용하지 않는다.
- 수학착착 고유 모노그램 승인 후 교체한다.
- 심볼 결정은 8단계 모델링을 차단하지 않지만 최종 배포를 차단한다.

## 6. 허용 변형
- 표정·손 포즈
- 가방 on/off
- 모자 착용/손에 들기
- 계절별 소매 길이
- 소형 렌더의 손가락 단순화
- 학습 배지
- 머리카락의 미세 흔들림

## 7. 금지
- 실존 아동 사진 복제
- 2~3 heads SD 비율
- 성인 체형
- 과도한 피부 사실성
- 스포츠 브랜드와 혼동되는 로고
- 의상 전체 교체
- 공식이의 설명·채점 역할 침범
- 사용자를 조롱하거나 성적을 압박하는 대사

## 8. 모듈
`Head, Hair, Fringe, Eyes, Eyebrows, Eyelids, Mouth, Cheeks, Ears, Nose, Cap, CapBadge, Body, Hoodie, Shorts, Arms, Hands, Fingers, Legs, Shoes, Backpack`

분리 핵심:
- Hair/Fringe, Eyes, Brows, Cap, CapBadge, Hoodie, Shorts, Shoes, Backpack

변형 핵심:
- Eyes look/blink/wide/squint
- Brows up/down/in/out
- Mouth smile/frown/O/U/A/E/M
- Hands open/fist/point/thumbs-up
- Breath, head tilt, backpack strap secondary motion

## 9. 핵심 상태·대사
| State | 행동 | 대사 |
|---|---|---|
| Welcome | 손 흔들기 | 오늘도 한 단계씩 해볼까? |
| Listen | 고개 약간 기울임 | 말풍선 없이 입력을 기다린다. |
| Curious | 몸 앞으로·궁금한 표정 | 어디가 가장 헷갈렸을까? |
| Guide | 선택지를 가리킴 | 어떤 학습부터 시작할까? |
| Progress | 엄지·작은 미소 | 이제 한 단계만 더 하면 돼. |
| Celebrate | 작은 점프·함께 축하 | 오늘 학습을 끝냈어! |
| Rest | 앉기·느린 깜빡임 | 잠깐 쉬었다 이어가도 좋아. |

## 10. 모션
- Idle: 4~7초 루프
- Greet: 0.8~1.2초
- Listen: 입력 중 큰 동작 없음
- Think: 2~4초 루프, 20초 쿨다운
- Point: UI를 가리지 않음
- Walk: 0.8~1.1초, in-place와 root motion 분리
- Celebrate: 1.0~1.5초
- Rest: 5~10초 루프
- reduced motion에서는 점프와 큰 손동작을 정적 포즈로 대체한다.

## 11. 승인 참조
- `Chakchaki_Approved_Reference_v1.0.png`
- 이 이미지는 제작 방향 기준이며 정확한 정투영·실제 GLB가 아니다.
