# Stage 8 테스트 실행 보고

## 2026-08-05 Gate 2 승격 및 Gate 3 투명 포즈 검증

| 명령 | 종료 코드 | 결과 |
|---|---:|---|
| `python scripts/harness/audit_2d_pet_assets.py` | 0 | Gate 2 `VERIFIED`; 시트 2/2, 선언 포즈 16/16, 수동 승인 1/1 |
| `python scripts/harness/audit_2d_pet_single_approval.py` | 0 | `PROMOTED`; 유효 승인 1/1, 필수 체크 8/8, 후보 해시 변동 0 |
| `python scripts/harness/audit_gate3_2d_pet_poses.py` | 0 | `VERIFIED`; 포즈·PNG·WebP·원본 픽셀 일치 16/16, 수동 승인 1/1 |
| `python scripts/harness/audit_gate4_2d_pet_motion.py` | 1 | 자동 QA `PASS`; 상태·reduced-motion 8/8, 준비·교차·착지·잔동작 자연 연동 PASS, 수동 승인 0/1로 예상 차단 |
| `python scripts/harness/audit_stage8.py` | 0 | Stage 7 필수 원본 10/10, Gate 0 `VERIFIED` |
| `python scripts/harness/validate_harness.py` | 0 | `HARNESS_PASS`; Gate 2·3 `VERIFIED`, Gate 4 `BLOCKED` |
| `git diff --check` | 0 | 공백 오류 없음 |
| 정적 검토 서버 HTTP 검사 | 0 | 랜딩페이지·Gate 4 검토 페이지·CSS·JS 모두 `200 OK` |

## 결과 해석

Gate 3 감사기는 제품 책임자 수동 승인 1/1과 16개 PNG·16개 무손실 WebP의 해시·크기·투명 모서리·피벗·원본 셀 픽셀 동등성을 확인하고 종료 코드 0을 반환했다.

전체 Stage 8 하네스는 새 2D 전략과 기존 3D 감사 보관 상태를 함께 검증하여 `HARNESS_PASS`를 반환했다. Gate 2와 Gate 3는 `VERIFIED`이며 Gate 4 진입이 허용됐다.

Gate 4 감사기의 종료 코드 1은 실패가 아니라 제품 책임자 수동 승인 0/1을 나타내는 통제된 외부 차단이다. 8개 상태, 지속시간, 승인 포즈 매핑, `transform`·`opacity` 제한, 120ms 준비·320ms 교차·240ms 착지, 상태 잔동작, 캐릭터 리듬 차이, 빠른 입력 취소, reduced-motion 8/8, 랜딩·검토 화면 연결은 모두 통과했다.

## 보안 통제

`docs/ssot/stage7/v1.0/github-recovery-codes.txt`는 ignore·untracked 경고로만 확인했으며 내용을 읽거나 기록하지 않았다.
