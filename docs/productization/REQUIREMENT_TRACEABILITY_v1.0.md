# 제품 요구사항 추적표 v1.0

| 요구사항 | 기능 설계 대상 | 구현 영역 | 필수 테스트 | 현재 상태 |
|---|---|---|---|---|
| REQ-P0-001 | 로케일 해석기 | client | locale resolver unit/E2E | Phase 2 대기 |
| REQ-P0-002 | 다국어 랜딩 | client | translation completeness/visual | Phase 2 대기 |
| REQ-P0-003 | 역할·권한 | client/developer | authorization matrix | Phase 2 대기 |
| REQ-P0-004 | 학습 진단 | developer/client | diagnostic domain unit | Phase 2 대기 |
| REQ-P0-005 | 5단계 학습 루프 | developer/client/agent | state machine unit/E2E | Phase 2 대기 |
| REQ-P0-006 | 단계형 힌트 | agent/developer | answer-leak safety eval | Phase 2 대기 |
| REQ-P0-007 | 정답·오답 피드백 | agent/client | copy and behavior matrix | Phase 2 대기 |
| REQ-P0-008 | 기억 복습 | developer | scheduler unit/timezone | Phase 2 대기 |
| REQ-P0-009 | 성장 기록 | developer/client | aggregation/authorization | Phase 2 대기 |
| REQ-P0-010 | AI 행동 연동 | agent/client | Stage 8 Gate 5 audit | 수동 승인 대기 |
| REQ-P0-011 | 접근성 | client | axe/keyboard/screen reader | Phase 2 대기 |
| REQ-P0-012 | 반응형 UI | client | 4 viewport visual/E2E | Phase 2 대기 |
| REQ-P0-013 | 안전·개인정보 | developer/agent | privacy/log policy | Phase 2 대기 |
| REQ-P0-014 | 오류 복구 | client/developer | fault injection/retry | Phase 2 대기 |
| REQ-P0-015 | 관측 가능성 | developer | event schema/PII scan | Phase 2 대기 |

Phase 2에서 각 행에 기능 ID·API 계약·구체적인 테스트 파일 경로를 추가한다.
