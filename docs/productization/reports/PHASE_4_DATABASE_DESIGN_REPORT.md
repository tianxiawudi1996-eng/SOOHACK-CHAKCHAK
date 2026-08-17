# Phase 4 DB 설계 완료 보고

## 결과

- 상태: `VERIFIED`
- PostgreSQL 테이블 계약: 18/18
- 지원 locale 제약: 8/8
- 정방향·역방향 migration 대칭성: PASS
- 개인정보 보호 규칙: PASS
- 실제 PostgreSQL 16 적용·rollback: PASS

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
| 실제 PostgreSQL parse/apply | PASS |
| 제약 smoke test | PASS |
| rollback 후 스키마 제거 | PASS |

## 실행 검증 결과

PostgreSQL 16 임시 격리 환경에서 `0001_initial.sql → 구조·제약 smoke test → 0001_rollback.sql`을 실행했다. 18개 테이블이 생성됐고 테스트 트랜잭션은 rollback됐으며, 역 migration 후 `mathchakchak` 스키마가 존재하지 않음을 확인했다. 검증 전용 컨테이너는 결과 확인 후 제거했다.

## 다음 Phase 진입

`ALLOWED` — DB runtime 차단 조건이 해소됐다. 스테이징 배포는 Phase 6 기능 15/15 완료 후 진입한다.
