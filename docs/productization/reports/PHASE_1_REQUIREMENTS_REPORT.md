# Phase 1 요구사항 정의 완료 보고

## 결과

- 상태: `VERIFIED`
- P0 기능 요구사항: 15/15
- 비기능 요구사항: 8/8
- 필수 로케일: 8/8
- 브랜드 세부 영역: 8/8
- 요구사항 추적: 15/15

## 확정 내용

- 제품은 Study Guard가 아니라 `수학착착 / MATH CHAKCHAK`이다.
- 핵심 사용자는 공식·식이 어려운 초등 고학년 학생과 학부모다.
- 핵심 흐름은 로케일 결정 → 진단 → 5단계 학습 → 복습 → 성장 기록이다.
- 필수 로케일은 `ko`, `zh-CN`, `ja`, `en`, `es`, `fr`, `it`, `ru`다.
- 로케일 우선순위는 URL → 사용자 설정 → 쿠키 → 브라우저 언어 → 영어 fallback이다.
- 언어 결정을 위해 IP 주소나 정밀 위치 권한을 요구하지 않는다.
- 브랜드·제품 성격·디자인 유형·색상·타이포·레이블·컴포넌트·반복 계약을 기존 SSOT에서 정규화했다.

## 산출물

- `docs/client/requirements/PRODUCT_REQUIREMENTS_v1.0.md`
- `docs/client/requirements/LOCALIZATION_REQUIREMENTS_v1.0.md`
- `docs/client/design/BRAND_PRODUCT_CONTRACT_v1.0.md`
- `client/i18n/locale-contract.json`
- `docs/productization/REQUIREMENT_TRACEABILITY_v1.0.md`
- `scripts/productization/validate_requirements.mjs`

## 검사

| 검사 | 결과 |
|---|---|
| P0 기능 요구사항 | 15/15 PASS |
| 비기능 요구사항 | 8/8 PASS |
| 지원 로케일 집합·순서 | 8/8 PASS |
| 브랜드 계약 섹션 | 8/8 PASS |
| 요구사항 추적 행 | 15/15 PASS |
| 잘못된 제품명 잔존 | 0 PASS |
| Phase 0+1 전체 회귀 | PASS |

## 차단·보류 사항

- Gate 5 수동 승인 0/1로 AI 행동의 제품 승격은 계속 차단한다.
- 상표·도메인·캐릭터 유사성 검토는 공개 출시 전 필요하다.
- 해외 교육 용어와 아동용 문구는 원어민·교육 전문가 검토가 필요하다.
- 제품 목표 수치는 현재 달성 사실이 아니라 스테이징·사용자 테스트에서 측정할 가설이다.

## 다음 Phase 진입

`ALLOWED` — 15개 P0 요구사항을 기능 ID, API·이벤트 계약, 기능별 체크리스트와 테스트 파일로 구체화한다.
