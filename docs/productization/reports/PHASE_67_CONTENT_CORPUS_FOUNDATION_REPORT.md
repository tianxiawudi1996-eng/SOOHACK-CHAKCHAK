# Phase 67 합법 전문 콘텐츠 코퍼스 기반 보고서

## 결과

PostgreSQL 코퍼스 플랫폼과 게시 통제는 로컬 검증을 통과했다. 실제 사용권 문항은 제공되지 않았으므로 D80-02와 시장 80점은 아직 완료가 아니다.

```text
platform = PASS_LOCAL
licensed_items = 0/30000
D80-02 = BLOCKED_EXTERNAL_CONTENT_EVIDENCE
market_score_80_confirmed = false
```

## 구현

- 사용권·가져오기 batch·문항·revision·검수·품질 결함 6개 테이블
- 학년·개념·유형·난도·기술·오개념·SHA-256 태그
- 활성 사용권, 현재 revision hash, 서로 다른 수학 검수 2명, 권리 검수, 중대 결함 0의 게시 게이트
- 승인·게시된 현재 revision의 UPDATE·DELETE 차단
- 외래키 인덱스, 게시 상태 복합·부분 인덱스, keyset pagination 계약
- 관리자 전용 준비도 API와 학생 접근 403

## 검증

| 항목 | 결과 |
|---|---|
| PostgreSQL migration | forward 6/6, rollback 0/0, reapply 6/6 |
| 게시 역조건 | 무검수 게시 BLOCKED |
| 수학 검수 | 서로 다른 2명 요구 PASS |
| 권리 검수 | 필수 PASS |
| revision 불변성 | PASS |
| 합성 테스트 잔존 | 0건 |
| 단위 테스트 | 287/287 PASS |
| PostgreSQL 통합 | 39/39 PASS |
| 스테이징 | 39/39 PASS |
| 보안 | PASS, 알려진 취약점 0 |
| 운영 | 20/20, DB ready PASS, 5xx 0 |

## Postgres 모범사례 반영

Postgres 스킬의 제약조건, FK 인덱스, 부분·복합 인덱스, batch insert, keyset pagination 지침을 스키마와 계약에 반영했다. 이로써 30,000개 규모에서 깊은 OFFSET 조회와 FK 전체 스캔을 피하도록 설계했다.

## 남은 외부 입력

1. 문항 공급자 또는 자체 제작 문항의 실제 사용권 문서 내부 참조
2. 문항 원본과 매니페스트 SHA-256
3. 서로 다른 수학 검토자 2명의 실제 identity reference와 결정
4. 저작권 담당자의 실제 승인
5. 중복·정답·해설·난도 표본 감사

다음 로컬 Phase는 Phase 68 풀이 과정 인식·신뢰도 게이트다. 실제 콘텐츠가 공급되기 전까지 코퍼스 준비도는 fail-closed를 유지한다.
