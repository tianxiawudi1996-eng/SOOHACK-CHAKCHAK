# 수학착착 Phase 40 외부 참조 증명 intake 상태기계 정책 보고서

## 결과

Phase 39 증명 인계 계약을 quarantine·중복·replay·서명·issuer·2인 검토의 fail-closed intake 정책으로 연결했다. 실제 증명을 업로드·저장·검증하거나 검토 결정을 기록하지 않았다.

자동 검증 상태는 `AUTO_VERIFIED_LOCAL_PROOF_INTAKE_POLICY_BLOCKED_EXTERNAL`이다. 이는 intake 기능이 운영된다는 뜻이 아니라 외부 채널이 없는 상태에서 정책과 차단 경계가 검증됐다는 뜻이다.

## 검증 결과

- intake 계약·규칙 테이블 2/2
- 규칙 6/6, 상태 9/9, 전이 14/14, 거절 코드 12/12
- replay 통제 6/6, 검토 결정 enum 3/3
- 실제 proof submission 0건, review decision 0건
- 단위 테스트 125/125 PASS
- Phase 40 통합 1/1 PASS
- 전체 PostgreSQL 통합 31/31 PASS
- 계약·규칙 UPDATE/DELETE 2/2 차단
- migration forward·rollback·reapply PASS
- SECURITY_APPROVER 생성 PASS, OPERATOR 생성 403, 학생 조회 403
- submission·transition·review·release·activate 경로 404, COMPLETED 전이 409
- intake·quarantine·검증·검토·release·allowlist·연결·실행 권한 false, 원본 변경 0건

## 실패와 수정

구문·단위·정적·PostgreSQL migration·API 통합·전체 회귀·rollback/reapply 검사에서 구현 오류가 발견되지 않았다. Phase 39에서 발생했던 INSERT 열/값 개수 불일치를 반복하지 않도록 Phase 40 규칙 INSERT는 필수 열만 명시하고 나머지는 DB의 강제 기본값과 NULL 제약으로 통제했다.

## 사실·가정·미결정

- 사실: 실제 proof, issuer, signature, nonce, reviewer, 결정은 저장되지 않는다.
- 사실: 현재 상태는 `NOT_ACCEPTING`이고 intake·검증 API가 없다.
- 가정: 실제 운영자는 승인된 별도 채널에서 metadata-only 증명을 제공해야 한다.
- 미결정: intake 채널, quarantine 보존 기간, replay window, 검토 SLA와 검토자 신원 정책이다.

## 다음 Phase

Phase 41은 실제 intake를 열지 않은 상태에서 quarantine 저장소·malware 검사·콘텐츠 형식 제한·보존·삭제·감사 증거의 운영 준비 계약을 설계한다. 외부 저장소와 보안 승인이 있기 전까지 데이터 쓰기와 검사 실행은 금지한다.
