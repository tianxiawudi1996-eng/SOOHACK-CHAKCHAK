# Stage 8 Harness

이 Harness는 Stage 8을 증거 기반으로 순차 실행하기 위한 기계 판독 상태와 검증 규칙을 보관한다.

- 허용 상태: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `NOT_VERIFIED`, `VERIFIED`
- Gate는 `0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8` 순서로 진행한다.
- 선행 Gate가 `VERIFIED`가 아니면 후속 Gate 구현을 시작하지 않는다.
- 파일 존재만으로 `VERIFIED`를 기록하지 않는다.
- 원본 승인 파일은 `ssot/stage7/v1.0/`에 바이트 그대로 보존한다.

검증 명령:

```text
python scripts/harness/audit_stage8.py
python scripts/harness/validate_harness.py
```

현재 상태는 `harness/status.json`과 `docs/stage8/audits/GATE0_SSOT_AUDIT_REPORT.md`를 함께 확인한다.
