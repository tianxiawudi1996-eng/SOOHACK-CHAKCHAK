# 제품 요구사항 추적표 v1.0

| 요구사항 | 기능 설계 대상 | 구현 영역 | 필수 테스트 | 현재 상태 |
|---|---|---|---|---|
| REQ-P0-001 | FEAT-I18N-001 로케일 해석기 | client | tests/unit/i18n/locale-resolver.test.ts | 설계 완료 |
| REQ-P0-002 | FEAT-LAND-001 다국어 랜딩 | client | tests/e2e/landing-locales.spec.ts | 설계 완료 |
| REQ-P0-003 | FEAT-AUTH-001 역할·권한 | client/developer | tests/unit/auth/role-policy.test.ts | 설계 완료 |
| REQ-P0-004 | FEAT-DIAG-001 학습 진단 | developer/client | tests/unit/diagnosis/diagnosis-service.test.ts | 설계 완료 |
| REQ-P0-005 | FEAT-LEARN-001 5단계 학습 루프 | developer/client/agent | tests/unit/learning/session-machine.test.ts | 설계 완료 |
| REQ-P0-006 | FEAT-HINT-001 단계형 힌트 | agent/developer | tests/unit/agent/hint-policy.test.ts | 설계 완료 |
| REQ-P0-007 | FEAT-FEED-001 정답·오답 피드백 | agent/client | tests/unit/agent/feedback-policy.test.ts | 설계 완료 |
| REQ-P0-008 | FEAT-REVIEW-001 기억 복습 | developer | tests/unit/review/review-scheduler.test.ts | 설계 완료 |
| REQ-P0-009 | FEAT-REPORT-001 성장 기록 | developer/client | tests/unit/report/progress-report.test.ts | 설계 완료 |
| REQ-P0-010 | FEAT-PET-001 AI 행동 연동 | agent/client | scripts/harness/audit_gate5_ai_behavior.py | 수동 승인 대기 |
| REQ-P0-011 | FEAT-A11Y-001 접근성 | client | tests/e2e/accessibility.spec.ts | 설계 완료 |
| REQ-P0-012 | FEAT-RWD-001 반응형 UI | client | tests/e2e/responsive.spec.ts | 설계 완료 |
| REQ-P0-013 | FEAT-PRIV-001 안전·개인정보 | developer/agent | tests/unit/privacy/log-policy.test.ts | 설계 완료 |
| REQ-P0-014 | FEAT-RES-001 오류 복구 | client/developer | tests/integration/resilience/retry-flow.test.ts | 설계 완료 |
| REQ-P0-015 | FEAT-OBS-001 관측 가능성 | developer | tests/unit/observability/event-schema.test.ts | 설계 완료 |

Phase 4~6에서 실제 테스트 파일을 구현하고, Phase 8에서 로케일별 핵심 흐름 E2E 결과를 연결한다.
