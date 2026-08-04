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
python scripts/harness/audit_gate1_single_approval.py
python scripts/harness/audit_gate1.py
python scripts/harness/audit_gate2.py
python scripts/harness/audit_gate3.py
python scripts/harness/validate_harness.py
```

Gate 1의 활성 승인 정책은 `PROJECT_OWNER_SINGLE_APPROVAL`이다. 권한 있는 프로젝트 책임자 한 명이 두 캐릭터와 전체 증거 패키지를 한 번에 승인한다. 기존 5역할×2캐릭터 승인 자료는 감사 이력으로 보존하지만 Gate 판정에는 사용하지 않는다.

Gate 2는 실제 GLB 6개와 자동 QA 6/6 PASS, John KIM의 프로젝트 책임자 수동 비교 승인 1/1로 `VERIFIED`다.

Gate 3는 실제 rigged GLB 6개와 자동 QA 6/6 PASS가 준비됐으며 프로젝트 책임자 수동 변형 검토 0/1을 대기한다.

현재 상태는 `harness/status.json`, `docs/stage8/audits/GATE1_SINGLE_APPROVER_AUDIT.md`, `docs/stage8/audits/GATE2_BASE_MESH_MATERIAL_AUDIT.md`를 함께 확인한다.
