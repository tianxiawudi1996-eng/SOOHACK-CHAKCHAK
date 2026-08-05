# Phase 4 DB 설계 완료 보고

## 결과

- 상태: `VERIFIED_STATIC`
- PostgreSQL 테이블 계약: 18/18
- 지원 locale 제약: 8/8
- 정방향·역방향 migration 대칭성: PASS
- 개인정보 보호 규칙: PASS
- 실제 PostgreSQL 적용: `NOT_RUN_NO_PSQL`

## 산출물

- 학습 도메인 ERD와 데이터베이스 설계
- 테이블별 소유 부서·보존 기간·접근 경계 계약
- 18개 테이블 초기 migration과 rollback
- 관계·상태·시간·중복 요청·감사 데이터 제약
- 데이터 보존·접근·삭제·정정·내보내기 정책
- 정적 자동 검증기

## 주요 결정

- 인증 비밀번호·토큰은 학습 DB에 저장하지 않고 외부 인증 주체 ID만 연결한다.
- 진단·학습 답안은 기능 처리를 위해 제한 저장하되 관측·감사 이벤트에는 원문을 금지한다.
- 연결 학부모는 활성 관계와 동의를 모두 충족할 때 제한된 성장 요약만 볼 수 있다.
- 모든 시각은 `timestamptz`로 저장하고 화면에서 사용자 시간대로 표현한다.
- 콘텐츠는 학습 기록이 참조하면 물리 삭제하지 않고 비활성화한다.

## 검증

| 검사 | 결과 |
|---|---|
| 계약 테이블 | 18/18 PASS |
| 외래키·고유성·상태 제약 | PASS |
| 핵심 조회 인덱스 | PASS |
| migration 단일 트랜잭션 | PASS |
| rollback 객체 대칭성 | PASS |
| 민감정보 금지 컬럼 | PASS |
| 실제 PostgreSQL parse/apply | NOT RUN |

## 남은 차단 조건

스테이징 배포 전에 PostgreSQL 실행 환경에서 `0001_initial.sql → 구조 smoke test → 0001_rollback.sql`을 실제로 실행해야 한다. 현재는 설계·정적 검증 완료이며 운영 준비 완료를 의미하지 않는다.

## 다음 Phase 진입

`ALLOWED` — Phase 5 화면·브랜드 설계는 진행할 수 있다. 실제 스테이징 배포 진입은 위 runtime migration test 완료 전까지 차단한다.
