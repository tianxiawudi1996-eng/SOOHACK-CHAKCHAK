# 수학착착 브랜드·제품·디자인 계약 v1.0

## 서비스 정의

- 브랜드명: **수학착착**
- 영문 표기: **MATH CHAKCHAK**
- 슬로건: **수학이 착착, 공식이 척척.**
- 브랜드 약속: **쉽게 이해하고, 오래 기억하고, 문제는 스스로.**
- 제품 정의: 공식과 식이 어려운 초등 고학년 학생을 위한 성장형 1:1 AI 수학 튜터

## 제품 성격

- 친구처럼 따뜻하지만 전문 튜터처럼 정확하다.
- 한 번에 한 단계만 안내하고 학생이 스스로 설명·회상·적용하게 한다.
- 틀림을 실패로 규정하지 않고 다음 행동으로 연결한다.
- 학부모에게는 과장된 성적 약속 대신 학습 과정과 변화의 근거를 제공한다.

## 디자인 유형

- Bento Grid 50%: 랜딩과 리포트의 정보 구조
- Material 35%: 입력·버튼·상태·진행·피드백
- Playful 15%: 승인 캐릭터·칭찬·성취 강조
- 타사 제품·캐릭터·레이아웃을 직접 모방하지 않는다.

## 색상 팔레트

| 토큰 | 값 | 역할 |
|---|---|---|
| Primary Blue | `#2F5BFF` | 브랜드·주 CTA·현재 단계 |
| Growth Mint | `#20BFA9` | 정답·완료·성장 |
| Reward Yellow | `#FFB84D` | 보상·강조·공식이 |
| Soft Coral | `#FF6B6B` | 오답·주의·보완 |
| Deep Navy | `#172033` | 제목·본문·핵심 숫자 |
| Slate Gray | `#667085` | 설명·보조 정보 |
| Soft Line | `#DDE3F0` | 테두리·구분 |
| Soft Blue White | `#F6F8FF` | 페이지 배경 |

색상만으로 정답·오답·선택·오류를 전달하지 않는다.

## 타이포그래피

- Display: Gmarket Sans Bold — 한국어 히어로·슬로건
- Body/UI: Pretendard Variable — 한국어 본문·버튼·입력
- Math: STIX Two Math — 수식·기호
- Global fallback: Noto Sans 계열 — 중국어·일본어·라틴·키릴 문자
- 모바일 본문 최소 16px, 수식은 이미지가 아닌 접근 가능한 텍스트로 렌더링

폰트 로드 실패 시 시스템 폰트로 대체하며 핵심 기능을 차단하지 않는다.

## 레이블

- 한 카드에는 주장 1개·증거 1개·주 행동 1개만 둔다.
- 입력 라벨과 placeholder를 분리하고 오류에는 원인과 해결 행동을 함께 표시한다.
- 학생 화면은 정보 밀도 2.5, 학부모 화면은 4.0을 기준으로 한다.
- 주 CTA는 한 화면에 하나만 두고 결과를 예측할 수 있는 행동형 문구를 사용한다.
- 번역 확장을 고려해 고정 폭·말줄임표를 핵심 행동 레이블에 사용하지 않는다.

## 컴포넌트

- Foundation: 색상·타이포·간격·반경·그림자·모션
- Atom: Button·Icon Button·Input·Checkbox·Badge·Chip
- Molecule: Search+Filter·Formula Header·Answer Input·Status Banner·Toast
- Organism: Diagnostic Card·Formula Memory Card·Learning Stepper·Parent Report·Modal·Navigation
- Template: Landing·Diagnostic Flow·Learning Session·Result·Parent Report
- 모든 상호작용 컴포넌트는 Default/Hover/Pressed/Focus/Loading/Disabled/Error/Success 상태를 정의한다.

## 반복

- 디자인 간격은 `4/8/12/16/24/32/48/64/96` 스케일을 반복 사용한다.
- 학습은 이해 → 연결 → 반복 → 회상 → 적용의 동일한 순서를 유지한다.
- 같은 칭찬·힌트·캐릭터 행동을 연속 반복하지 않고 쿨다운과 우선순위를 적용한다.
- 사용자는 반복 구조를 예측할 수 있어야 하지만 문구와 캐릭터 리듬은 기계적으로 느껴지지 않아야 한다.

## 검토 보류 항목

- 공개 전 `수학착착` 상표·도메인 확인
- 초등학생 5명·학부모 5명의 이름·역할·유아적 인상·가치 이해 테스트
- 해외 로케일별 교육 용어 원어민 검수
- Gate 5 제품 책임자 수동 승인
