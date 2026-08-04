# Stage 8 Harness

이 디렉터리는 수학착착 Stage 8의 작업 순서, Gate 상태, 증거 경로와 승인 조건을 단일하게 관리합니다.

## 운영 원칙

1. `harness/status.json`이 현재 진행 상태의 기계 판독 기준이다.
2. Gate는 `0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8` 순서로만 이동한다.
3. 이전 Gate가 `VERIFIED`가 아니면 다음 Gate를 시작할 수 없다.
4. 허용 상태는 `DONE_SPEC`, `DONE_IMPLEMENTED`, `VERIFIED`, `BLOCKED_EXTERNAL`, `FAIL`뿐이다.
5. 실제 자산과 테스트 증거가 없으면 `VERIFIED`를 사용하지 않는다.
6. 외형·역할·행동 변경은 patch가 아니라 v1.1 변경 요청으로 분리한다.
7. 모든 변경은 문서, 테스트, 증거 경로, 커밋을 남긴다.

## 실행

```bash
python scripts/harness/validate_harness.py
```

CI에서도 동일 검증을 수행합니다.

## 현재 병목

- Gate 1 Canonical View가 `FAIL`
- Gate 2 Base Mesh는 `BLOCKED_EXTERNAL`
- 누락된 중립 정면·좌우 측면·앞뒤 3/4·액세서리 제거 뷰와 사람 승인이 필요
