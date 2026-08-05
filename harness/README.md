# Stage 8 Harness

이 하네스는 Stage 8을 증거 기반 Gate 순서로 통제한다. 선행 Gate가 `VERIFIED`가 아니면 후속 Gate를 시작하지 않는다.

현재 상태:

- Gate 0: `VERIFIED`
- Gate 1: `VERIFIED`
- Gate 2: `NOT_VERIFIED` — 기존 상단 캐릭터와 일치하는 고품질 3D 원본 또는 새 제작 필요
- Gate 3: `NOT_STARTED`
- Gate 4~8: `NOT_STARTED`

이전에 만든 절차형 Gate 2·3 모델은 캐릭터 정체성 불일치로 격리되었다. 두 빌더는 저품질 모델을 재생성하지 않고 예상 차단 종료 코드 1을 반환한다.

검증 명령:

```text
python scripts/harness/build_gate2_base_mesh.py   # 예상: 1, BLOCKED_EXTERNAL
python scripts/harness/audit_gate2.py             # 예상: 1, BLOCKED_EXTERNAL
python scripts/harness/build_gate3_rig.py         # 예상: 1, BLOCKED_PREREQUISITE
python scripts/harness/audit_gate3.py             # 예상: 1, BLOCKED_PREREQUISITE
python scripts/harness/audit_stage8.py            # 예상: 0
python scripts/harness/validate_harness.py         # 예상: 0, HARNESS_PASS
```

공식 시각 기준은 `docs/stage8/evidence/ACTIVE_CHARACTER_REFERENCE_REGISTER_v1.0.json`에서 해시로 고정한다.
