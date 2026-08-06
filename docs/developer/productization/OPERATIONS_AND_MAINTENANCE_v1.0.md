# 수학착착 운영·유지보수 기준 v1.0

## 서비스와 책임 역할

| 영역 | 책임 역할 | 핵심 확인 |
|---|---|---|
| 웹·다국어 | client owner | 8개 locale, 정적 자산, fallback |
| API | API owner | readiness, p95, 5xx, 서명 세션 |
| PostgreSQL | database owner | backup freshness, 복구, 연결 포화 |
| 보안 | security maintainer | 비밀값, 취약점, 접근 경계 |
| 배포 | release manager | staging, 승인, health, rollback |
| 개인정보 | privacy owner | 보존기간, 접근·삭제 감사 |

실명과 실제 연락 경로는 조직의 운영 시스템에서 배정하며 저장소에 추정 기록하지 않는다.

## SLI·SLO와 알림

- 월간 가용성 목표: 99.9%
- 핵심 API p95: 2초 이하
- 5분간 5xx 비율 2% 초과: page
- DB readiness 2분 실패: page
- 최근 성공 백업 24시간 초과: page
- locale fallback 30분간 1% 초과: ticket

정확한 계약은 `infra/operations/slo-contract.json`과 `alert-rules.json`을 따른다.

## 장애 대응

1. health·readiness·metrics와 최근 배포를 확인한다.
2. request ID와 상태 코드만 사용해 로그를 조회한다.
3. 답안·문제·토큰·개인정보를 incident 문서에 복사하지 않는다.
4. 배포 관련 장애면 직전 검증 이미지로 rollback한다.
5. DB 장애면 쓰기를 차단하고 최신 검증 백업의 복구 가능성을 확인한다.
6. 영향·완화·복구·재발방지를 기록한다.

## 백업·복구

- 외부 운영: RPO 24시간, RTO 4시간
- 일일 백업과 월간 복구 rehearsal
- 복구 환경은 운영 트래픽과 분리하고 외부 DB 포트를 열지 않는다.
- 복구 후 스키마 테이블 수, 핵심 행 수, API readiness를 비교한다.
- 백업 암호화 키와 접근권한은 secret manager·운영 IAM에서 관리한다.

## 배포·rollback

`build → 전체 테스트 → staging → health/readiness → 제품 책임자 승인 → 승격 → 관찰` 순서를 따른다. 오류율 또는 지연 임계치 초과 시 직전 검증 이미지로 rollback한다. 외부 배포 대상과 권한 없이 성공을 기록하지 않는다.

## 유지보수 주기

주간 의존성 감사, release별 전체 회귀, 일일 백업 freshness, 월간 복구 rehearsal·보존기간 감사, 분기별 접근권한·비밀값 회전을 수행한다. 결과는 비밀값 없이 evidence와 보고서로 남긴다.
