# 수학착착 Phase 19 — 공식 카탈로그·회상 8개 언어 실행 메타프롬프트 v1.0

## Goal Framing

초1~고3 학습자가 선택한 언어로 공식 학습과 회상을 이어가도록 공식 제목·설명·표기·회상 문구를 8개 로케일에 제공한다.

## Specification Engineering

완료 상태는 공식 72개, 로케일 8개, 콘텐츠 리비전 576행, 번역 504행이다. 비한국어 콘텐츠의 한글 잔존은 0이고, 협업 세션과 회상 선택지는 시작 로케일을 유지한다. 자동 QA와 사람의 번역 승인을 분리한다.

## Context Engineering

- 카탈로그: `infra/database/catalog/k12-formulas.ko.json`
- 콘텐츠: `scripts/productization/formula-catalog-locales.mjs`
- PostgreSQL: migration 0010, seed 0008
- 런타임: `developer/src/api/repository.mjs`, `client/curriculum/app.js`

## Harness Engineering

Node 단위·정적 테스트, PostgreSQL 통합 테스트, compose 스테이징, 마이그레이션 롤백·재적용, 브라우저 검토를 사용한다. 정답·채점 규칙과 비밀값을 공개하거나 저장하지 않는다.

## Prompt Engineering

1. 공식 72개 제목을 7개 언어에 배치한다.
2. 설명·수식 표기·회상 지시문·캐릭터 전략을 생성한다.
3. PostgreSQL 리비전과 협업 로케일을 이행한다.
4. 카탈로그·협업·회상 API와 선택지를 현지화한다.
5. 8개 로케일 API와 비한국어 한글 잔존을 검증한다.
6. 롤백 후 재적용하고 제품 회귀 검사를 수행한다.

## Workflow Engineering

`명세 → 콘텐츠 → DB → API → UI → 단위 검사 → 통합 검사 → 롤백 → 보고` 순서로 진행한다.

## Memory Engineering

번역 리비전, 검증 상태, 콘텐츠 해시, 테스트 결과와 미승인 로케일을 남긴다. 임시 생성 메타데이터, 정답 스키마, 허위 승인과 개인 데이터는 제거한다.

## Loop Engineering

72×7 콘텐츠와 8개 API 로케일을 전수 반복한다. 수량 불일치, 한글 잔존, 로케일 소실, 정답 노출 또는 롤백 실패가 있으면 수정 후 처음부터 재검증한다. 자동 검증 통과 후 사람의 언어 검토 대기 상태로 종료한다.
