# ADR-0002: 모듈형 단일 제품과 계약 우선 아키텍처

- 상태: Accepted for MVP foundation
- 결정일: 2026-08-06

## 결정

### MVP Vertical Slice

- 브라우저 표준 HTML·CSS·ES Module 기반
- 빌드 의존성 없이 동작하는 정적 Reference Slice
- `localStorage`를 임시 Session Store로 사용
- 결정적 규칙 기반 Tutor Feedback 사용

### 제품화 목표 구조

- Frontend: TypeScript 기반 컴포넌트 애플리케이션
- Backend: HTTP JSON API를 제공하는 모듈형 단일 서비스
- Database: 관계형 DB
- Contract: OpenAPI와 SQL Schema를 저장소에서 버전 관리
- Deployment: Development → Staging → Canary → Production

## 이유

현재 핵심 위험은 프레임워크 선택이 아니라 학습 흐름·데이터 계약·아동 안전·운영 기준의 불확실성이다. 첫 Slice는 도구 의존성을 최소화하고 계약과 기능을 검증한다.

## 전환 조건

Gate 0 기준선과 MVP 파일럿 결과가 확보되면 Frontend·Backend 구현 프레임워크와 버전을 별도 ADR로 확정한다.
