# 수학착착 전역지침 대비 제품화 개발·공백 점검 보고서

## 1. 결론

수학착착은 랜딩 페이지만 있는 프로젝트가 아니다. K12 수학과정, 진단,
공식 학습, 회상·응용, 두 캐릭터 협업, 교사·학부모 운영, 개인정보 통제,
AI 튜터 안전 경계까지 로컬 코드와 PostgreSQL 테스트로 구현되어 있다.

그러나 `Phase 0~75 로컬 PASS`는 출시 가능한 제품 완성을 뜻하지 않는다.
현재 공개 환경은 프런트엔드와 API 브리지만 배포됐고 Node API와 PostgreSQL은
연결되지 않았다. 실제 번역·접근성 검토, 콘텐츠 라이선스, 수학 전문가 검수,
AI/OCR 실측, 학습효과·대치동 파일럿, 관리형 인증과 운영 복구 증거도 없다.
따라서 전체 상태는 계속 `BLOCKED_EXTERNAL`이다.

## 2. 주요 개발 사항

| 개발 영역 | 구현된 범위 | 현재 증거 상태 |
|---|---|---|
| 제품 기반 | client/developer/agent/docs/infra 역할 분리, 8개 로케일 | 로컬 VERIFIED |
| 브랜드·UI | Bento/Material/Playful 디자인, 승인 캐릭터 2종, 2D 포즈·모션 | 자동 QA PASS, 일부 수동 검토 필요 |
| K12 수학 | 초1~고3 12개 학년, 공식 클러스터 72개 | 로컬 PostgreSQL PASS |
| 학습 흐름 | 진단 → 적응 경로 → 개념 → 유도 → 연습 → 회상 → 응용 | 로컬 통합 PASS |
| 캐릭터 협업 | 착착이 안내·오개념 코칭, 공식이 공식·검산 설명 | 로컬 런타임 PASS |
| 다국어 | ko, zh-CN, ja, en, es, fr, it, ru | 자동 완전성 PASS, 사람 승인 미완료 |
| 접근성 | 키보드, 초점, 대비, 스크린리더 계약 | 자동 PASS, 수동 승인 미완료 |
| 운영 화면 | 학생·교사·학부모·학원 트랙 화면과 역할 경계 | 합성 데이터 PASS, 관리형 신원 미연결 |
| 보안·개인정보 | 세션 서명, RBAC, idempotency, 데이터 권리·삭제 dry-run | 로컬 PASS, 실제 IdP·운영 승인 미완료 |
| AI 튜터 | 규칙 기반 fallback, 공급자 adapter, 안전·비용·kill switch | 합성 평가 PASS, 실제 모델 증거 0건 |
| 데이터베이스 | PostgreSQL migration 0001~0040, rollback·reapply | 로컬 PostgreSQL 16 PASS |
| 배포 | Cloudflare 정적 프런트와 fail-closed API 브리지 | 공개 프런트 PASS, API·DB 미연결 |
| 운영 | SLO·경보·백업·복구 계약 | 문서·로컬 연습만 PASS |

## 3. 전역지침 11단계 대조

| 단계 | 판정 | 증거와 미진행 사항 |
|---|---|---|
| 1. 프로젝트 목표 | 증거 있는 완료 | 제품 정의·대상·80점 기준이 문서화됨 |
| 2. 문서 정리 | 진행 중 | SSOT·STATUS·Harness는 존재하나 일부 레거시 한글 문서가 현재 읽기 경로에서 깨져 보여 인코딩 품질 점검 필요 |
| 3. 요구사항 | 진행 중 | 로컬 요구사항 추적은 있으나 D80-02~10 외부 이해관계자 요구·승인·증거가 대부분 0건 |
| 4. 기능 설계 | 증거 있는 완료 | Browser→API→Service→Repository→PostgreSQL 책임과 오류 코드 구현 |
| 5. 인프라 설계 | 진행 중 | Cloudflare 프런트·API 브리지와 로컬 Docker는 있음. 외부 Node API, 관리형 PostgreSQL, Secret Manager, IdP, object storage 미구성 |
| 6. DB 설계 | 진행 중 | 40개 migration과 로컬 rollback은 PASS. 외부 DB migration, PITR, 자동 백업·복원 실증 없음 |
| 7. 화면 설계 | 진행 중 | 8개 로케일·반응형·오류 상태 구현. 실제 API 연결 화면 E2E와 언어·접근성 사람 검토 미완료 |
| 8. 기능 개발 | 진행 중 | 핵심 세로 흐름은 로컬 PASS. 라이선스 콘텐츠, 실제 OCR, 관리형 인증, 실제 AI 모델은 fail-closed |
| 9. 배포 | 진행 중 | 프런트·브리지 공개 배포 완료. API·DB 배포, 보호 Environment, 불변 backend image, 외부 rollback 증거 없음 |
| 10. 통합 테스트 | 진행 중 | 로컬 full-stack PASS. 공개 same-origin API, 실제 IdP, 외부 DB 지속성·복구 E2E 미수행 |
| 11. 유지보수 | 진행 중 | SLO·경보 규칙·주기 계약 존재. 실측 대시보드, 알림 수신처, 백업 freshness, incident drill 미연결 |

## 4. 이번 고도화

Harness 한 종류만 실행하던 GitHub Actions에 제품화 CI 계약을 추가했다.

- workflow: `.github/workflows/productization-ci.yml`
- quality job: npm lock 설치, lint, runtime type contract, 전체 단위 테스트,
  staging artifact, Cloudflare dry-run
- integration job: 매 실행 시 임시 세션 Secret 생성·마스킹, Docker Compose
  검증, Node API + PostgreSQL full stack, readiness, API core journey,
  operations runtime, 실패 로그, 항상 cleanup
- 권한: `contents: read`
- fork에 위험한 `pull_request_target`, 저장소 Secret, 배포 job: 없음
- 현재 상태: 로컬 계약 PASS, GitHub 실행 `NOT_RUN`, 배포 `false`

실제 로컬 검증 결과:

- CI 계약 실패 테스트: workflow 부재를 1회 재현
- CI 계약 단위 테스트: 1/1 PASS
- 전체 단위 테스트: 349/349 PASS
- lint: PASS (`text=419`, `scripts=363`, `json=39`)
- runtime type contract: PASS (`assertions=467`)
- Docker Compose config: PASS, 임시 Secret은 프로세스 종료 전 제거
- Cloudflare package dry-run: PASS (`assets=96`)
- staging readiness: PASS (`artifact=78/78`, `locales=8/8`)
- 현재 로컬 운영 런타임: 20/20 readiness PASS, p95 23.66ms, 5xx 0,
  PostgreSQL ready PASS
- 기존 4180/4181 컨테이너는 중단·재생성하지 않음

## 5. 출시까지 남은 필수 작업

### P0 — 실제 제품 기능 차단 해소

1. 외부 Node API 개발 런타임과 관리형 PostgreSQL 대상 확정
2. migration 0001~0040 적용·검증 및 백업/PITR 활성화
3. Secret Manager에서 세션 키·API origin 주입
4. Cloudflare `API_ORIGIN` 연결 후 `/readyz`·`/api/v1/locales` 실측
5. 공개 URL에서 진단→공식학습→회상→응용 E2E
6. 보호된 GitHub Environment와 검증 SHA 기반 배포 승인
7. 관리형 학생·교사·학부모 인증과 보호자 연결 정책

### P1 — 품질·전문성 증거

1. 7개 번역 로케일 사람 검토와 접근성 수동 승인
2. 공식·문항 콘텐츠 라이선스 및 독립 수학 전문가 이중 검토
3. 실제 AI 모델 8개 로케일 평가·사람 교정·안전 승인
4. OCR 공급자 벤치마크와 낮은 신뢰도 수동 입력 경로 실측
5. 관측성 대시보드, 실제 경보 수신처, 백업 freshness와 복원 drill

### P2 — 시장·운영 검증

1. 8~12주 학습효과 파일럿과 독립 분석
2. 대치동 학원 2곳 이상 현장 검증
3. 법률·개인정보·상용 운영 통제 10개 검증
4. custom domain, 운영 변경창, rollback·incident drill, 제품 책임자 승인

## 6. 차단과 다음 READY

현재 외부 대상 없이 수행 가능한 CI 고도화는 완료했다. 다음 READY는
`외부 Node API + PostgreSQL 개발 배포 대상 확정`이다. 필요한 입력은 Secret
원문이 아니라 `target_reference`, `provider_code`, `environment_code=DEVELOPMENT`,
`connection_reference` 네 개의 내부 참조다. 실제 API·DB 연결 전까지 공개
제품의 데이터 기능과 시장·학습효과 주장은 계속 차단한다.
