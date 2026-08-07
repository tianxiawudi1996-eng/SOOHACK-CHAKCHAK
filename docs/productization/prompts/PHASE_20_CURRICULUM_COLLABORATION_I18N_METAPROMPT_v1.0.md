# 수학착착 Phase 20 — 교육과정 메타데이터·캐릭터 협업 8개 언어 실행 메타프롬프트 v1.0

## Goal Framing

공식 학습 화면의 교육과정 정보와 착착이·공식이 협업 흐름을 선택 언어로 일관되게 제공한다.

## Specification Engineering

학년 번역 96행, 출처 8행, 역할 8행, 협업 단계 40행과 클라이언트 진행 문구 8개 로케일이 완성 상태다. 자동 QA와 언어 전문가 승인을 구분한다.

## Context Engineering

PostgreSQL migration 0011, seed 0009, Node.js API repository, curriculum 정적 클라이언트와 기존 72개 공식 리비전을 사용한다.

## Harness Engineering

외래키와 복합 기본키, 로케일 배치 삽입, 공개 API 한글 잔존 검사, 브라우저 5단계 검토, 롤백·재적용과 전체 회귀를 수행한다.

## Prompt Engineering

1. 번역 SSOT를 작성한다.
2. PostgreSQL 테이블과 시드를 생성한다.
3. 학년·공식·협업 API에 로케일 폴백을 구현한다.
4. UI의 학년·출처·역할·단계·질문·버튼을 연결한다.
5. 8개 언어 및 비노출·메타데이터 검사를 실행한다.

## Workflow Engineering

`설계 → 번역 → migration → seed → API → UI → 단위·통합 → 롤백 → 브라우저 → 보고` 순서로 실행한다.

## Memory Engineering

행 수, 검증 상태, 자동 검사와 미승인 로케일을 기록한다. 민감정보, 정답 규칙, 임시 생성 메타데이터와 허위 승인을 제거한다.

## Loop Engineering

8개 로케일을 순회해 12개 학년과 협업 5단계를 확인한다. 누락 또는 한글 설명이 하나라도 있으면 실패한다. 자동 검증 완료 후 사람의 언어 검토 대기로 인계한다.
