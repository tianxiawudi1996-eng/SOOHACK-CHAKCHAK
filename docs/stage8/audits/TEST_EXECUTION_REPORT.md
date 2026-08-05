# Stage 8 테스트 실행 보고

## 2026-08-05 음영 2D 전략 검증

| 명령 | 종료 코드 | 결과 |
|---|---:|---|
| `python scripts/harness/audit_2d_pet_assets.py` | 1 | 자동 QA `PASS`; 시트 2/2, 선언 포즈 16/16, 수동 승인 0/1로 예상 차단 |
| `python scripts/harness/audit_2d_pet_single_approval.py` | 1 | `BLOCKED_EXTERNAL`; 유효 승인 0/1, 필수 체크 0/8, 후보 해시 변동 0 |
| `python scripts/harness/audit_stage8.py` | 0 | 전체 파일 271개, Stage 7 필수 원본 10/10, Gate 0 `VERIFIED` |
| `python scripts/harness/validate_harness.py` | 0 | `HARNESS_PASS`; Gate 2 `NOT_VERIFIED`, Gate 3 `NOT_STARTED` |
| `git diff --check` | 0 | 공백 오류 없음 |
| 정적 검토 서버 HTTP 검사 | 0 | 페이지·원본 2개·후보 시트 2개 모두 `200 OK` |

## 결과 해석

2D 자동 감사기의 종료 코드 1은 실패가 아니라 제품 책임자 수동 승인 0/1을 나타내는 통제된 외부 차단이다. PNG 디코딩, 1536×1024 크기, 원본·후보 해시, 검토 복사본, 캐릭터 2/2, 상태 매핑 8/8은 통과했다.

전체 Stage 8 하네스는 새 2D 전략과 기존 3D 감사 보관 상태를 함께 검증하여 `HARNESS_PASS`를 반환했다. Gate 2는 시각 승인 전까지 `NOT_VERIFIED`로 유지되고 Gate 3 진입은 차단된다.

## 보안 통제

`docs/ssot/stage7/v1.0/github-recovery-codes.txt`는 ignore·untracked 경고로만 확인했으며 내용을 읽거나 기록하지 않았다.
