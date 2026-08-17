# 외부 참조 증명 Scan Attestation 계약 v1.0

Phase 42 scanner 정책 다음에 결과 해시·객체 해시·scanner identity·engine attestation·서명 DB 최신성·시간 순서·독립성을 검증하는 정책 계약이다. 두 독립 엔진이 모두 CLEAN이어야 하며 하나라도 MALICIOUS·SUSPICIOUS·INCONCLUSIVE·불일치이면 사람 검토로 차단한다. 실제 결과와 attestation은 0개이며 입력·검증·조정·release API는 없다. SECURITY_APPROVER만 revision을 생성하고 두 테이블은 append-only다.
