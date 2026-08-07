# 수학착착 성능 엔지니어링 v1.0

## 목표와 사용자

`P23-PERF-001~004`는 모바일 네트워크의 학생이 학년별 공식 화면을 열 때 콘텐츠가 늦게 나타나거나 갑자기 밀리는 문제를 줄인다. 제품 책임자는 재현 가능한 실험실 지표와 정적 예산으로 회귀를 판단한다.

## 완료 명세

- Lighthouse 모바일 성능 점수 90 이상
- LCP 2,500ms 이하, CLS 0.1 이하, TBT 200ms 이하
- FCP 1,800ms 이하, Speed Index 3,400ms 이하
- 초기 전송량 350KB 이하, 단일 자산 100KB 이하
- 승인 캐릭터 이미지 내용과 해시는 변경하지 않음
- 네 화면의 주 모듈을 문서 head에서 조기 발견
- Nginx 텍스트 압축, 이미지 1년·코드 7일 캐시, HTML 재검증

Lighthouse는 입력이 없는 실험실 환경에서 INP를 측정하지 못하므로 TBT를 대리 지표로 사용한다. 실제 운영 INP는 외부 배포 후 75백분위 데이터로 별도 검증한다.

## 데이터 흐름과 경계

`Browser → versioned static artifact → Nginx cache/compression → Browser`가 정적 경로다. API·Service·Repository·PostgreSQL 흐름은 변경하지 않는다. 동적 교육과정 데이터가 도착하기 전에는 학년 선택 영역과 요약 영역의 공간을 예약한다.

## 검증

정적 계약, 단위 경계값, 로컬 스테이징 헤더, Lighthouse 모바일 3회 측정, 기존 PostgreSQL 통합 회귀 순서로 검증한다. 외부 CrUX와 운영 CDN은 이번 로컬 Phase 범위 밖이다.
