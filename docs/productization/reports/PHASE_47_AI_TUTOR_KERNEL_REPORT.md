# Phase 47 AI 튜터 커널 완료 보고서

## 목표와 결과

기존 PostgreSQL·서버 채점을 단일 진실 원천으로 유지하면서, 착착이는 생각 연결을 돕고 공식이는 수학 규칙을 검증하는 2인 튜터 런타임을 구현했다. 외부 모델이 비활성화되어도 8개 언어의 안전 규칙 응답으로 학습이 계속된다.

현재 상태는 `AUTO_VERIFIED_LOCAL_AI_TUTOR_FALLBACK_EXTERNAL_MODEL_BLOCKED`다. 외부 모델 호출 성공이나 운영 배포 완료를 의미하지 않는다.

## 주요 산출물

- `developer/src/agent/tutor-kernel.mjs`: strict 출력, 역할 분담, 정답 노출 방지, 1.5초 대체 경로
- `developer/src/agent/openai-responses-provider.mjs`: Responses API 구조화 출력 어댑터, `store:false`
- `developer/src/agent/tutor-service.mjs`: 최소 맥락 조회·생성·저장 오케스트레이션
- `developer/src/api/server.mjs`, `repository.mjs`: 튜터 API와 PostgreSQL 증거 저장
- `infra/database/migrations/0031_ai_tutor_feedback*.sql`: 적용·롤백 스키마
- `client/math-learning/*`: 착착이·공식이 분리 코칭 카드
- Phase 47 실행 메타프롬프트, 설계서, 감사기, 단위·통합 테스트

## 개인정보·수학 정확성 통제

- 모델 입력 제외: user/student ID, 원문 답안, 예상 정답, scoring rule, 토큰
- 모델 권한 제외: 정오 판정, 숙달도, 단계 전이, 복습 일정
- 허용 맥락: locale, stage, 서버 outcome, misconception code, hint level, 공식 표기, 현재 질문·힌트
- 잘못된 JSON, 정답 직접 노출, 제공자 오류, 시간 초과, 키 미설정은 `RULE_FALLBACK`
- API 키는 환경변수로만 주입하고 코드·DB·보고서에 저장하지 않음

## 실행 검사와 수정

- 핵심 단위 테스트: 9/9 PASS
- 전체 단위 테스트: 152/152 PASS
- Phase 47 감사: PASS, 역할 2/2, 로케일 8/8
- PostgreSQL 16 migration 0031: 적용 → 롤백 → 재적용 PASS
- 격리형 API 이미지 빌드: PASS, npm 취약점 0
- 실제 5단계 공식 학습·오개념·튜터 저장·멱등 재생 통합 테스트: 1/1 PASS
- 스테이징 정적 빌드: PASS, 35 files
- 브라우저: 카드 2/2, 가로 넘침 0, 콘솔 경고·오류 0
- `git diff --check`: PASS

첫 통합 실행에서 튜터 멱등 scope가 DB `varchar(64)`를 초과해 500이 발생했다. scope를 응답 UUID 기반 51자 이하로 축소하고 이미지 재빌드·통합 테스트를 다시 실행해 PASS를 확인했다.

## 차단과 남은 위험

- 승인된 외부 API 키와 네트워크에서 생성형 경로를 실제 호출하지 않았으므로 `provider_live_tested=false`다.
- 기존 `4181` API는 실제 세션 비밀값을 읽거나 복제하지 않기 위해 교체하지 않았다. 새 API는 격리형 `4182`에서 검증 후 제거했다.
- `4183`은 새 정적 UI 검토용이며 API 프록시가 없는 화면 구조 프리뷰다.
- 전체 K–12 공식에 대한 프롬프트 품질 평가, 아동 안전 레드팀 데이터셋, 모델 비용·지연 SLO는 후속 Phase에서 필요하다.

## 다음 Phase 진입

Phase 48은 모델 품질 평가 하네스와 오개념별 골든 케이스를 구축한다. 외부 모델 키가 없으면 제공자 호출은 계속 차단하고 규칙 기반 경로만 평가한다.
