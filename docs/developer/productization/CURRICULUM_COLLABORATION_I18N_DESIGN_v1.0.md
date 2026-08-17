# 수학착착 교육과정 메타데이터·캐릭터 협업 8개 언어 설계 v1.0

## Goal Framing

초1~고3 학습자가 선택한 언어로 학년, 학년군, 과목 경로, 공식 출처와 착착이·공식이의 역할 및 협업 5단계를 이해하도록 한다.

## Specification Engineering

학년 메타데이터 96행, 출처 8행, 역할 8행, 협업 단계 40행을 PostgreSQL에 저장한다. 비한국어 화면의 대상 필드에는 한글 설명이 남지 않으며, 번역은 `TRANSLATION_REVIEW_REQUIRED` 상태를 유지한다.

## Context Engineering

기존 `curriculum_grade`, `curriculum_reference`, `character_collaboration_policy`를 원본으로 보존하고 로케일별 번역 테이블을 추가한다. API는 요청 로케일을 우선하고 한국어 정본으로 폴백한다.

## Harness Engineering

복합 기본키로 조회 인덱스와 외래키 인덱스를 함께 충족한다. 로케일별 배치 시드, 단위·정적·통합·브라우저 검사와 migration rollback을 수행한다.

## Prompt Engineering

1. 12개 학년 메타데이터를 8개 언어로 정의한다.
2. 교육부 출처 표기를 8개 언어로 정의한다.
3. 두 캐릭터 역할과 5단계 제목·목표를 8개 언어로 정의한다.
4. PostgreSQL과 API 폴백을 구현한다.
5. 클라이언트 진행 질문과 선택 버튼을 8개 언어로 연결한다.

## Workflow Engineering

`잔여 문구 감사 → 번역 계약 → DB 정규화 → API 로케일 조회 → UI 연결 → 자동 검사 → 롤백 → 브라우저 검토` 순서다.

## Memory Engineering

원본 식별자, 로케일, 검증 상태, 출처 URL과 테스트 결과를 남긴다. 비밀값, 정답 데이터, 생성 도구 메타데이터와 허위 언어 승인은 남기지 않는다.

## Loop Engineering

12×8 학년, 1×8 출처, 1×8 역할, 5×8 단계를 전수 검사한다. 한글 잔존·빈 필드·폴백 실패·롤백 실패가 있으면 수정 후 전체 검사를 반복한다.
