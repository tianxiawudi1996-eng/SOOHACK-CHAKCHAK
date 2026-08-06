# 수학착착 Phase 10 — 실제 수학 공식 학습 구현 메타프롬프트 v1.0

## 1. Goal Framing

- 사용자: 공식을 의미부터 이해하고 새 문제에 적용해야 하는 초등 학습자
- 변화: 선언만 존재하던 5단계 학습을 실제 PostgreSQL 데이터, 서버 판정, API, 테스트로 만든다.

## 2. Specification Engineering

개념·공식·유도·현지화·예제·5단계·응답·숙달 기록이 연결되고, 다섯 단계 정답과 숙달도 0.8 이상에서만 완료된다. 첫 검증 콘텐츠는 분모가 다른 분수의 덧셈이며 8개 언어를 지원한다.

## 3. Context Engineering

- PostgreSQL 16 / Node.js ESM / REST JSON
- 입력: 기존 진단·학습 경로·세션, 8개 locale 계약
- 출력: 0002 DB 확장, 공식 학습 엔진, API, 시드, 단위·통합 테스트, 보고서

## 4. Harness Engineering

공식 문자열 실행 금지, 서버 권한·단계·채점 통제, expected response 비노출, idempotency 강제, 로그 답안 원문 금지, 자동 QA와 사용자 승인을 분리한다.

## 5. Prompt Engineering

1. 기존 문서와 구현의 공백을 감사한다.
2. PostgreSQL 8개 확장 테이블과 롤백을 작성한다.
3. 정확한 유리수 연산기와 5단계 판정기를 구현한다.
4. 분수 덧셈 공식·유도·예제·오개념·8개 언어 콘텐츠를 시드한다.
5. 조회·시작·응답·완료 API를 구현한다.
6. 단위, 계약, PostgreSQL 통합 테스트를 통과시킨다.

성공: 단계 5/5, locale 8/8, DB 확장 8/8, 정답 비노출, 오개념 판정, 숙달 게이트, 통합 여정 PASS.

실패: 암기 카드만 제공, 단계 건너뛰기, 클라이언트 채점, 부동소수점 채점, 허위 완료, PostgreSQL 미사용.

## 6. Workflow Engineering

`공백 감사 → 명세 보강 → PostgreSQL 설계 → 엔진 → 콘텐츠 → API → 단위 테스트 → 통합 테스트 → 보고`

## 7. Memory Engineering

요구사항 추적 ID, 콘텐츠·스키마 버전, 테스트 결과, 오개념 코드, 남은 콘텐츠 확장 작업을 남긴다. 임시 정답 payload, 민감정보, 실패한 중간 시드는 제거한다.

## 8. Loop Engineering

정답·오답·교정·힌트·중복·권한·다국어 경로를 반복한다. 모든 자동 QA가 PASS하고 핵심 학습 여정이 PostgreSQL에 저장될 때 구현 단계를 종료한다.
