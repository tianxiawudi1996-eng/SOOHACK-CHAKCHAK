# 수학 공식 적용 문제 전수 확장·다국어 설계 v1.0

## Goal Framing

초1~고3 학습자가 자신의 로케일에서 모든 공식의 적용 문제를 풀 수 있게 한다. 기존 12개 대표 공식만 제공하던 적용 숙달 경로를 72개 공식 전체로 확장한다.

## Specification Engineering

완료 상태는 공식 72/72, 공식별 난이도 3단계, 적용 문제 216/216, 8개 로케일 번역 1,728/1,728이다. `application_mastery_score`는 협업 증거 점수와 회상 점수에서 분리한다. 정답·허용 단위·오개념 규칙은 API 응답과 브라우저 코드에 포함하지 않는다.

## Context Engineering

교육과정 기준은 교육부 고시 제2022-33호 별책 8이다. PostgreSQL 16, Node.js API, 정적 HTML·CSS·JavaScript를 사용한다. 공식 정본은 `k12-formulas.ko.json`, 문제 정본은 `formula-application-task-bank.mjs`, 번역 규칙은 `formula-application-locales.mjs`에 둔다.

## Harness Engineering

생성기가 공식 키 72개와 문제 216개를 대조하고 SQL을 일괄 생성한다. PostgreSQL은 항목과 번역을 관계형 테이블로 분리하고 `(application_item_id, locale)` 기본 키로 조회한다. API는 요청 로케일 번역을 우선하고 한국어를 폴백으로 사용한다.

## Prompt Engineering

목표는 기존 12개를 보존하면서 나머지 60개 공식을 확장하는 것이다. 각 문제는 계산·표현 추론·단위 추론·상황 적용 중 하나이며 난이도는 1~3이다. 성공 기준은 전수 범위, 로케일 완전성, 서버 채점, UI 단위 필드 제어, 정답 비노출이다.

## Workflow Engineering

`교육과정 키 감사 → 문제 정본 작성 → 로케일 템플릿 적용 → PostgreSQL 배치 시드 → API 폴백 → UI 레이블·피드백 → 자동·통합·브라우저 검증` 순서로 수행한다.

## Memory Engineering

공식 키, 문제 식, 정답 규칙, 허용 단위, 로케일 템플릿, 콘텐츠 버전과 검증 결과를 남긴다. 생성 중간 파일, 브라우저 정답 데이터, 미사용 번역과 개발용 화면 메타데이터는 남기지 않는다.

## Loop Engineering

72개 공식 각각의 문제 수와 8개 로케일 행을 반복 검사한다. 누락·중복·정답 노출·한국어 폴백 오작동이 있으면 생성 단계로 되돌아간다. 정적 감사, PostgreSQL 마이그레이션·롤백, API 8개 로케일, 브라우저 대표 경로가 모두 통과하면 종료한다.
