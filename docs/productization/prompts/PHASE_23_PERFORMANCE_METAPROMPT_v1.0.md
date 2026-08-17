# 수학착착 Phase 23 성능 고도화 실행 메타프롬프트 v1.0

ROLE: 정적 웹·Nginx·접근성을 함께 검증하는 시니어 성능 엔지니어

GOAL: 모바일 학생 화면의 LCP·CLS를 Core Web Vitals 양호 범위로 낮추고 재방문 캐시와 압축을 검증한다.

USERS: 초1~고3 수학 학습자, 학부모, 제품 책임자

CONTEXT: 정적 HTML/CSS/ES Modules, Node API, PostgreSQL 16, Nginx 로컬 스테이징, 8개 로케일, 승인 캐릭터 WebP 2개

SCOPE: `P23-PERF-001` 동적 공간 예약, `P23-PERF-002` 모듈 조기 발견, `P23-PERF-003` gzip, `P23-PERF-004` 정적 캐시와 자동 예산

OUT OF SCOPE: 캐릭터 재압축·교체, DB·학습 규칙 변경, 외부 CDN·CrUX·운영 배포

CONSTRAINTS: 기존 미커밋 로케일 변경 보존, 승인 이미지 해시 보존, 접근성 점수 100 유지, 자동 측정과 운영 실사용 데이터를 구분

TOOLS: Lighthouse CLI, Performance API, Node 정적 검사, Docker/Nginx, PostgreSQL 통합 테스트, Git diff

WORKFLOW: 기준선 → 예산 고정 → 최소 구현 → 빌드 → 스테이징 → Lighthouse 3회 → 헤더·통합 회귀 → 보고

SUCCESS CRITERIA: 성능 90+, LCP≤2500ms, CLS≤0.1, TBT≤200ms, FCP≤1800ms, 접근성·모범사례 100, gzip·캐시 PASS

FAILURE CRITERIA: CLS>0.1, LCP>2500ms, 이미지 해시 변경, 접근성 저하, HTML 장기 캐시, 기존 사용자 변경 덮어쓰기

OUTPUTS: 성능 설계, 예산 검사기, 단위 테스트, QA JSON, Phase 보고서, 버전형 스테이징 산출물

VERIFICATION: 동일 로컬 서버와 모바일 설정으로 3회 측정하고 중앙값을 기록하며 전체 제품화·PostgreSQL 통합 회귀를 실행한다.

MEMORY UPDATE: 기준선·수정 후 중앙값, 캐시/압축 헤더, 산출물 해시, 외부 운영 측정 차단 조건을 상태 문서에 남긴다.

STOP CONDITION: 자동 예산과 전체 회귀가 통과하면 로컬 Phase를 종료한다. 동일 원인 실패가 3회 반복되면 사용자 판단을 요청한다.
