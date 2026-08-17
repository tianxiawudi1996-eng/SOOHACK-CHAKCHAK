# 수학착착 Phase 23 성능 고도화 보고서

## 목표와 범위

모바일 학생이 학년별 공식 화면을 열 때 콘텐츠가 밀리거나 늦게 나타나는 문제를 줄였다. `P23-PERF-001~004`에 따라 레이아웃 안정성, 주 모듈 조기 발견, gzip, 캐시 정책과 자동 성능 예산을 구현했다. DB·학습 규칙·승인 캐릭터 이미지는 제외했다.

## 기준선

Lighthouse 13.4.1 모바일 기준 성능 81, LCP 2,567ms, CLS 0.305였다. 캐시 TTL이 없어 재방문 낭비가 182,811바이트였고 CSS 렌더 차단 후보는 약 300ms였다. 미사용 JS/CSS와 이미지 전달 포맷은 병목이 아니었다.

## 설계와 구현

- 번역·API 데이터가 채워지기 전 hero·학년 선택·학년 요약 공간 예약
- 네 학생 화면의 `app.js` modulepreload
- HTML `no-cache`, CSS/JS 7일, 승인 WebP 1년 캐시
- HTML/CSS/JS/JSON gzip과 `Vary: Accept-Encoding`
- Lighthouse·자산 크기·정적 전달 계약을 단위·정적 검사로 고정
- 기존 미커밋 로케일 선택 저장 변경을 보존

정적 흐름은 `Browser → versioned artifact → Nginx cache/compression → Browser`이며 API·Service·Repository·PostgreSQL 흐름은 변경하지 않았다.

## 실패와 수정

1차 공간 예약 후 LCP는 2,263ms까지 개선됐지만 CLS 0.297이 남았다. Lighthouse가 번역 문구 삽입으로 밀린 학년 선택 영역을 지목해 hero 높이를 추가 예약했고 CLS 중앙값을 0.045로 낮췄다. 랜딩 modulepreload가 빌드 후 잘못된 경로를 사용해 404가 발생했으나 빌드 치환을 추가해 콘솔 오류 0건과 모범사례 100을 복구했다.

Lighthouse CLI는 Windows Chrome 임시 프로필 정리에서 EPERM을 반환했지만 JSON 보고서는 정상 생성됐다. 보고서 존재와 JSON 파싱을 실행 성공 판단으로 분리했으며 원시 보고서는 사용자 산출물에 포함하지 않았다.

## 실행 검사

- 단위 테스트: 53/53 PASS
- Phase 23 정적 예산: PASS
- 교육과정 3회 중앙값: 성능 97, LCP 2,417ms, CLS 0.045, TBT 15ms
- 교차 화면: 랜딩 98, 진단 99, 공식학습 98, 접근성 모두 100
- 캐시 낭비: 182,811 → 3,110바이트
- 스테이징 gzip·캐시·MIME·health: PASS
- 승인 자산 SHA-256: 변경 없음
- PostgreSQL 통합 테스트: 14/14 PASS
- 스테이징 산출물 HTTP 응답: 33/33 PASS
- Web/API Health Check: 200/200 PASS
- 전체 제품화 회귀: Phase 0~23 PASS

## 인수 기준

성능 90 이상, LCP 2,500ms 이하, CLS 0.1 이하, TBT 200ms 이하, FCP 1,800ms 이하, 접근성·모범사례 100을 모두 만족했다. 초기 전송량 215,496바이트와 단일 최대 자산 91,110바이트도 예산 이하다.

## 차단 조건

Lighthouse는 실제 사용자 INP를 측정하지 않는다. 운영 75백분위 LCP·INP·CLS, 외부 CDN, HTTPS 성능은 외부 배포와 실사용 트래픽이 확보될 때까지 완료로 추정하지 않는다.

## 다음 Phase 진입

로컬 성능 자동 QA와 전체 회귀가 통과하면 Phase 23을 `AUTO_VERIFIED_LOCAL_LAB`으로 종료한다. 다음 Phase 24는 보안 헤더·세션·API 역조건·의존성 취약점의 제품 보안 강화로 진행한다.
