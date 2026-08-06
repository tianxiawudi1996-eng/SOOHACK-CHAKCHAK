# ID 교차참조 감사

- 생성 시각(UTC): `2026-08-06T06:07:11.175836+00:00`
- 판정: `VERIFIED` — 승인 원본 입고·정의 충돌·자동검증 전제 확인이 필요하다.

## ID 사용 현황

| ID | 발견 횟수 | 참조 파일 수 | 파일 예시 |
|---|---:|---:|---|
| `BUB-CHO-01` | 12 | 6 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_BROWSER_RUNTIME_QA_v1.0.json` |
| `BUB-CMP-01` | 11 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `BUB-EMP-01` | 10 | 6 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_BROWSER_RUNTIME_QA_v1.0.json` |
| `BUB-ERR-01` | 11 | 6 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_BROWSER_RUNTIME_QA_v1.0.json` |
| `BUB-GUI-01` | 8 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `BUB-HIN-01` | 11 | 6 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_BROWSER_RUNTIME_QA_v1.0.json` |
| `BUB-PRA-01` | 8 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `BUB-PRG-01` | 5 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `BUB-RET-01` | 8 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `BUB-RET-02` | 8 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `BUB-RST-01` | 8 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `BUB-SRC-01` | 8 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `BUB-WEL-01` | 8 | 5 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `scripts/harness/audit_gate5_ai_behavior.py` |
| `EVT-001` | 9 | 8 | `assets/stage8/ai-behavior-v1.0.js`, `docs/agent/MathChakChak_Stage7_Incremental_Audit_v1.0.1.md`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json` |
| `EVT-002` | 11 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-003` | 8 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-004` | 9 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-005` | 9 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-006` | 11 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-007` | 8 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-008` | 8 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-009` | 8 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-010` | 8 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-011` | 10 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-012` | 8 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-013` | 8 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-014` | 11 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `EVT-015` | 8 | 7 | `assets/stage8/ai-behavior-v1.0.js`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx`, `docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json`, `docs/stage8/evidence/2d-pet/v1.0/GATE5_AI_BEHAVIOR_AUTOMATED_QA_v1.0.json` |
| `MOD-01` | 1 | 1 | `docs/developer/수학착착_7단계_컴포넌트_캐릭터시스템.xlsx` |
| `MOD-02` | 1 | 1 | `docs/developer/수학착착_7단계_컴포넌트_캐릭터시스템.xlsx` |
| `MOD-03` | 1 | 1 | `docs/developer/수학착착_7단계_컴포넌트_캐릭터시스템.xlsx` |
| `MOD-04` | 1 | 1 | `docs/developer/수학착착_7단계_컴포넌트_캐릭터시스템.xlsx` |
| `SRC-01` | 18 | 11 | `assets/stage8/ai-behavior-v1.0.js`, `docs/developer/수학착착_7단계_컴포넌트_캐릭터시스템.xlsx`, `docs/ssot/stage7/v1.0/Component_Inventory_v1.0.xlsx`, `docs/ssot/stage7/v1.0/Expression_Motion_Bubble_Library_v1.0.xlsx` |
| `SRC-02` | 9 | 5 | `docs/developer/수학착착_7단계_컴포넌트_캐릭터시스템.xlsx`, `docs/ssot/stage7/v1.0/Component_Inventory_v1.0.xlsx`, `docs/ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx`, `ssot/stage7/v1.0/Component_Inventory_v1.0.xlsx` |
| `SRC-03` | 8 | 4 | `docs/ssot/stage7/v1.0/Component_Inventory_v1.0.xlsx`, `docs/ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx`, `ssot/stage7/v1.0/Component_Inventory_v1.0.xlsx`, `ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx` |
| `SRC-04` | 2 | 2 | `docs/ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx`, `ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx` |
| `SRC-05` | 2 | 2 | `docs/ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx`, `ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx` |
| `SRC-06` | 3 | 3 | `docs/ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx`, `docs/stage8/audits/STAGE1_TO_STAGE7_TRACEABILITY_AUDIT.md`, `ssot/stage7/v1.0/MathChakChak_Stage7_SSOT_v1.0.xlsx` |

## 필수 의미 연결

- `Progress = Bubble Type / Happy State`: **동일 원문 행에서 두 용어 발견 = True**. 근거: `docs/agent/MathChakChak_Stage7_Incremental_Audit_v1.0.1.md`
- `Welcome State = Greet Clip`: **동일 원문 행에서 두 용어 발견 = True**. 근거: `docs/agent/MathChakChak_Stage7_Incremental_Audit_v1.0.1.md`

## 제한

- 파일명 후보는 ID 정의나 canonical 원본으로 자동 승격하지 않았다.
- 의미 연결은 원문과 수동 검토 증거가 모두 있을 때만 Gate 0 승인 근거로 사용한다.
