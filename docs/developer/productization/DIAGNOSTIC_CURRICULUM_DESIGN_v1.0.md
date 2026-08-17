# 학생용 진단·교육과정 확장 설계 v1.0

## 1. Goal Framing

- 사용자: 초등 5~6학년 수학 학습자와 학습 흐름을 확인하는 제품 책임자
- 달라져야 하는 것: 학습자는 3문항 진단을 마치고 보충·기본·도전 추천 이유를 이해한 뒤, 가장 필요한 분수 공식을 바로 학습한다.

## 2. Specification Engineering

완료 상태는 8개 로케일에서 동치분수·분수 덧셈·분수 곱셈 진단 문항 3개가 제공되고, 결과가 `REMEDIATE | CORE | EXTEND`로 설명되며, 선택된 주제의 5단계 공식 학습으로 한 번만 인계되는 상태다. API는 정답 스키마를 반환하지 않는다.

## 3. Context Engineering

- 기술: 정적 HTML/CSS/JavaScript, Node.js HTTP API, PostgreSQL 16
- 관련 파일: `client/diagnostic/`, `client/math-learning/`, `developer/src/api/`, migration `0004`, seed `0003`
- 교육과정: 동치분수, 분모가 다른 분수의 덧셈, 분수의 곱셈

## 4. Harness Engineering

- 스키마 rollback/reapply, 콘텐츠 수·로케일 완전성, API 소유권, 코드 만료·1회 소비를 자동 검사한다.
- 로컬 데모 인계 코드는 원문을 DB에 저장하지 않고 SHA-256만 저장한다.
- 세션 토큰은 JavaScript 메모리에만 두며 localStorage, sessionStorage, cookie를 사용하지 않는다.

## 5. Prompt Engineering

목표는 진단 UI와 복수 공식 콘텐츠를 실제 PostgreSQL 여정으로 연결하는 것이다. 범위는 3문항, 8개 언어, 추천 설명, 1회 인계, 공식 3종이다. 정답·토큰 노출, 외부 배포, 승인되지 않은 캐릭터 생성은 금지한다.

성공 체크리스트:

- [ ] 진단 문항 3/3, 로케일 8/8
- [ ] 적응형 추천 3/3
- [ ] 인계 코드 1회 소비·만료·해시 저장
- [ ] 공식 개념 3/3과 각 5단계
- [ ] 데스크톱·390px·키보드·축소 모션 검증

## 6. Workflow Engineering

`진단 시작 → 문항 조회 → 응답 3회 → 경로 결정 → 이유 표시 → 1회 코드 발급 → 공식 화면에서 소비 → 선택 주제 5단계 학습`

## 7. Memory Engineering

남길 것은 문항 ID, 정오 요약, 추천 코드, 학습 경로 ID, 콘텐츠 버전, 감사 결과다. 정답 원문, 세션 토큰, 소비된 인계 코드, 개발용 화면 메타데이터는 남기지 않는다.

## 8. Loop Engineering

오답 3개, 정답 2개, 정답 3개 시나리오로 세 경로를 반복 검증한다. 동일 코드를 두 번 소비하거나 만료 코드를 사용하면 실패해야 한다. 모든 자동 검사와 브라우저 핵심 여정이 통과하면 Phase 13을 종료한다.
