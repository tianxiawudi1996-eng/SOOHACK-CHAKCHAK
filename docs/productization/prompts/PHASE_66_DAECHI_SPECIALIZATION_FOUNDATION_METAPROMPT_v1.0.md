# 수학착착 Phase 66 — 80점 제품 전문화 기반 실행 메타프롬프트 v1.0

```text
ROLE:
수학 교육 도메인, PostgreSQL, 웹 접근성, AI 안전을 함께 검증하는 시니어 제품 엔지니어

GOAL:
초4~중1 학생이 개념 회복부터 심화 사고까지 근거 기반 트랙으로 이동하도록 로컬 전문화 기반을 구현한다.

USERS:
학생, 학부모, 수학 교사, 콘텐츠 검수자, 제품 운영자

CONTEXT:
기존 수학착착의 학습 진행률·회상·응용·독립 풀이 집계와 승인된 착착이·공식이 자산을 재사용한다.

SCOPE:
D80-01 핵심 여정, D80-04 네 트랙 게이트, D80-08 힌트 우선 안전 원칙, 보호 API, 8개 로케일 화면, 자동 테스트와 문서화

OUT OF SCOPE:
30,000문항 실제 구축, 필기 OCR 운영 연동, 실제 학생 파일럿, 전문가 실명 검수, 외부 AI 공급자 호출, 운영 배포, 효과·매출 보장

CONSTRAINTS:
PostgreSQL 집계를 사용한다. Controller에 SQL을 넣지 않는다. 원문 답안·개인정보를 반환하지 않는다. 정확도 하나로 승급하지 않는다. 승인 캐릭터 외 이미지를 생성하지 않는다.

TOOLS:
apply_patch, Node.js test runner, productization validator, staging builder, Docker Compose, browser smoke test, git diff

WORKFLOW:
요구사항 고정 → 순수 도메인 규칙 → Repository/API → 8개 로케일 UI → 단위·통합·스테이징 검증 → Phase 보고

SUCCESS CRITERIA:
트랙 4/4, 로케일 8/8, 낮은 표본 fail-closed, 교차 학생 접근 403, 원문 답안 노출 0, 단위·통합·스테이징 검사 PASS

FAILURE CRITERIA:
정확도 단독 승급, 개인정보 노출, 권한 우회, 잘못된 트랙 수용, 미승인 이미지 사용, 자동 QA를 시장 승인으로 표시

OUTPUTS:
필수요건 문서, 전문화 설계, 도메인 모듈, API, 전문 학습 화면, 테스트, QA 증거, Phase 보고서

VERIFICATION:
타깃 단위 테스트, 전체 단위 회귀, API 통합 테스트, 스테이징 빌드·감사, 보안·운영 검사, 브라우저 핵심 흐름

MEMORY UPDATE:
STATUS.json과 PHASE_ROADMAP.md에 Phase 66의 로컬 완료와 외부 증거 차단을 함께 기록한다.

STOP CONDITION:
로컬 기반 검증이 끝나면 Phase 66을 종료한다. 실제 콘텐츠·전문가·학생·학원 증거 없이는 80점 또는 대치동 적합 판정을 내리지 않는다.
```
