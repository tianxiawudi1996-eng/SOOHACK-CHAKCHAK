# 수학착착 API 계약 v1.0

## 공통 규칙

- 기본 경로: `/api/v1`
- JSON 요청·응답, UTF-8
- 인증 사용자 요청은 서버에서 역할과 학생 연결을 검증한다.
- 쓰기 요청은 `Idempotency-Key`를 지원한다.
- 로케일은 URL과 사용자 설정으로 결정하며 `Content-Language`로 응답한다.

### 성공 봉투

```json
{"data": {}, "meta": {"request_id": "req_...", "locale": "ko", "schema_version": "1.0"}}
```

### 오류 봉투

```json
{"error": {"code": "VALIDATION_ERROR", "message_key": "error.validation", "retryable": false}, "meta": {"request_id": "req_..."}}
```

기술 스택·SQL·내부 예외 메시지를 사용자 응답에 노출하지 않는다.

## P0 엔드포인트

| Method | Path | 역할 | 기능 | 핵심 테스트 |
|---|---|---|---|---|
| GET | `/locales` | 공개 | 지원 로케일·버전 | locale contract |
| PATCH | `/me/preferences/locale` | 인증 | 사용자 언어 저장 | auth+validation |
| POST | `/diagnostics` | 학생/학부모 | 진단 생성 | idempotency |
| POST | `/diagnostics/{id}/responses` | 학생 | 진단 응답 저장 | ownership |
| POST | `/diagnostics/{id}/complete` | 학생 | 진단 완료·경로 생성 | state transition |
| POST | `/learning-sessions` | 학생 | 추천 경로에서 세션 생성 | duplicate prevention |
| GET | `/learning-sessions/{id}` | 학생/연결 학부모 | 세션 조회·재개 | authorization |
| POST | `/learning-sessions/{id}/answers` | 학생 | 답안 제출·피드백 | answer safety |
| POST | `/learning-sessions/{id}/hints` | 학생 | 다음 단계 힌트 | no answer reveal |
| POST | `/learning-sessions/{id}/complete` | 학생 | 세션 완료 | idempotency |
| GET | `/reviews/due` | 학생 | 기한이 된 회상 목록 | timezone |
| POST | `/reviews/{id}/attempts` | 학생 | 회상 결과·다음 일정 | scheduling |
| GET | `/students/{id}/progress` | 학생/연결 학부모 | 성장 요약 | role projection |
| GET | `/students/{id}/parent-report` | 연결 학부모 | 학부모 리포트 | consent+redaction |

## Phase 26 데이터 권리 엔드포인트

| Method | Path | 역할 | 기능 | 핵심 테스트 |
|---|---|---|---|---|
| POST | `/privacy/requests` | 학생 본인 | 권리 요청 접수 | ownership+idempotency |
| GET | `/privacy/requests` | 학생 본인 | 본인 요청 목록 | identifier redaction |
| GET | `/privacy/requests/{id}` | 학생 본인 | 요청·상태 이력 조회 | ownership |
| POST | `/privacy/requests/{id}/cancel` | 학생 본인 | 초기 상태 요청 취소 | state transition+idempotency |

보호자 대리 접수는 관리형 신원·활성 연결·대리권 검증이 준비되기 전까지 제공하지 않는다. 삭제 또는 동의 철회 요청 접수는 실제 데이터 삭제·동의 변경을 자동 실행하지 않는다.

## Phase 27 개인정보 운영 엔드포인트

| Method | Path | 역할 | 기능 | 핵심 테스트 |
|---|---|---|---|---|
| POST | `/local-demo/privacy-operator/session` | 로컬 전용 | 합성 ADMIN 토큰 | local-demo gate |
| GET | `/privacy-operations/requests` | ADMIN | 운영 처리 큐 | role+redaction |
| POST | `/privacy-operations/requests/{id}/transition` | ADMIN | 배정·증적·결정·상태 전이 | lock+idempotency |

운영 큐는 관리형 신원이 준비되기 전까지 로컬 합성 환경에서만 검증한다. `COMPLETED` 전이는 이행 실행기와 별도 승인 게이트가 준비될 때까지 409로 차단한다.

## Phase 28 개인정보 이행 통제 엔드포인트

| Method | Path | 역할 | 기능 | 핵심 테스트 |
|---|---|---|---|---|
| POST | `/privacy-operations/requests/{id}/fulfilment-plans` | OPERATOR | dry-run 계획 | approved+assignment |
| POST | `/privacy-operations/fulfilment-plans/{id}/impact-assessment` | OPERATOR | 영향 집계 | aggregate+hash |
| POST | `/privacy-operations/requests/{id}/legal-holds` | PRIVACY_APPROVER | 법적 보류 | unique active hold |
| POST | `/privacy-operations/legal-holds/{id}/release` | PRIVACY_APPROVER | 보류 해제 | reason+audit fields |
| POST | `/privacy-operations/fulfilment-plans/{id}/approvals` | 승인자 2인 | 개인정보·보안 승인 | distinct users+roles |

이중 승인 상태는 실행 허가가 아니다. API는 파괴적 이행 엔드포인트를 제공하지 않으며 기존 `COMPLETED` 전이도 계속 차단한다.

## Phase 29 불변 개인정보 이행 패키지

| Method | Path | 역할 | 기능 | 핵심 테스트 |
|---|---|---|---|---|
| POST | `/privacy-operations/fulfilment-plans/{id}/package-manifests` | OPERATOR | 승인 계획 봉인 | dual-approved+hash |
| GET | `/privacy-operations/package-manifests/{id}` | 운영 역할 | 패키지 생명주기 조회 | student 403 |
| POST | `/privacy-operations/package-manifests/{id}/recovery-checkpoints` | OPERATOR | 무변경 복구 기준점 | valid+immutable |
| POST | `/privacy-operations/package-manifests/{id}/revalidate` | OPERATOR | 만료 패키지 후속 리비전 | unchanged hashes+no hold |

패키지 봉인과 재검증은 실제 실행이 아니다. 유효기간 만료·활성 법적 보존·영향 또는 승인 해시 변경 시 409를 반환하며 파괴적 실행 API는 존재하지 않는다.

## Phase 30 개인정보 실행 준비도

| Method | Path | 역할 | 기능 | 핵심 테스트 |
|---|---|---|---|---|
| POST | `/privacy-operations/package-manifests/{id}/execution-readiness-reviews` | SECURITY_APPROVER | 준비도 검토 리비전 생성 | operator 403+blocked |
| GET | `/privacy-operations/execution-readiness-reviews/{id}` | 운영 역할 | 로컬·외부 차단 조회 | student 403 |

준비도 검토는 실행 권한을 생성하지 않는다. 외부 증거 입력, 중단 스위치 해제, 실행 승인 또는 실행 엔드포인트는 없으며 모든 현재 검토는 `BLOCKED_LOCAL_PREREQUISITE` 또는 `BLOCKED_EXTERNAL`만 반환한다.

## 버전·호환성

- breaking change는 `/v2` 또는 명시적 schema version을 사용한다.
- 번역 키와 오류 코드는 삭제 전 최소 한 릴리스 동안 deprecated 상태를 제공한다.
- 시간은 저장·API에서 UTC ISO-8601, 표시 시 사용자 시간대로 변환한다.
