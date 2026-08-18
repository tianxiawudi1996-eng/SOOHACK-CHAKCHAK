# 외부 API·PostgreSQL 개발 대상 결정 v1.0

## 현재 판정

- 판정: `HOLD`
- 후보 API 런타임: `Cloudflare Containers`
- 개발 데이터베이스 권고안: Neon PostgreSQL
- 환경: `DEVELOPMENT`
- 제품 공개 상태: 프런트엔드 미리보기만 사용 가능, API·DB 기능은 차단 유지

## 선택 근거

현재 API는 Node.js `node:http`, `pg`, 포트 `8080`을 사용하는 OCI 컨테이너다. Cloudflare Containers는 기존 Dockerfile을 유지하면서 Worker를 통해 컨테이너로 요청을 전달할 수 있어 Worker 런타임으로 API 전체를 재작성하는 것보다 변경 범위가 작다. PostgreSQL은 Containers가 제공하지 않으므로 관리형 PostgreSQL을 별도로 확정하고 TLS 연결을 사용한다.

Cloudflare Hyperdrive는 PostgreSQL 자체가 아니라 기존 데이터베이스 연결 계층이다. 현재 컨테이너 경로의 첫 배포에서는 직접 TLS 연결을 기준으로 하고, 실제 부하 측정 후 Hyperdrive 도입 여부를 별도 결정한다.

개발 환경의 우선 권고는 Neon이다. 기존 `pg` 드라이버를 유지할 수 있고 Cloudflare가 지원 PostgreSQL 공급자로 명시하며, 무료 개발 검증에서 짧은 복원 구간을 시험한 뒤 유료 Launch의 최대 7일 복원 구간으로 승격할 수 있다. 단, 실제 학생 데이터와 상용 운영의 한국 리전·개인정보 요건은 개발 환경과 분리해 재심사한다. Supabase 서울 리전과 AWS RDS 서울 리전은 운영 후보로 유지한다.

## 외부 확인이 필요한 조건

1. Cloudflare 현재 인증 갱신 및 Containers 목록 읽기 성공
2. Workers Paid 플랜 사용 승인과 비용 경계 확인
3. 관리형 PostgreSQL 공급자·개발 인스턴스·백업/PITR 정책 확정
4. 다음 네 참조 메타데이터 입력
   - `target_reference`
   - `provider_code=CLOUDFLARE_CONTAINERS_NEON_POSTGRESQL` (개발 권고)
   - `environment_code=DEVELOPMENT`
   - `connection_reference`

원문 접속 주소, DB 비밀번호, API 토큰과 세션 키는 저장소 산출물에 기록하지 않는다.

## 다음 실행 게이트

네 참조 입력을 검증한 뒤 Cloudflare 계정 기능을 재확인한다. 이 두 단계가 통과하기 전에는 Container 생성, 관리형 DB 생성, migration 적용, Secret 주입 또는 배포를 수행하지 않는다. Workers Paid 또는 관리형 DB 유료 전환은 별도 비용 승인을 받는다.
