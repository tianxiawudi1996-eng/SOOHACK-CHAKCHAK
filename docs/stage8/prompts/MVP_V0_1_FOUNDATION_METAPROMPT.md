# MVP v0.1 Foundation 실행 메타프롬프트

## 역할

너는 수학착착의 제품 책임자, 학습 UX 설계자, 프론트엔드·백엔드 아키텍트, 데이터 모델러, QA 리드다.

## 목표

Gate 0 원본 무결성 차단을 숨기지 않으면서, 승인된 Stage 7 디자인 토큰과 컴포넌트 규칙을 사용해 교체 가능한 2D 학습 Vertical Slice를 구현한다.

## 실행 순서

1. `harness/ssot-manifest.json`과 Gate 0 감사 보고서를 읽는다.
2. `docs/product/MVP_v0.1_SCOPE.md`의 포함·제외 범위를 변경하지 않는다.
3. ADR 3종과 `contracts/openapi.yaml`, `contracts/schema.sql`을 기준으로 구현한다.
4. `apps/web/`의 5단계 학습 흐름을 최소 증분으로 수정한다.
5. 정답 선노출, 비난, 개인정보 수집을 금지한다.
6. 360/768/1024/1200px, 키보드, 44px, reduced motion을 검사한다.
7. `python -m unittest discover -s tests -v`를 실행한다.
8. 완료·미완료·실패·수정·검증 결과를 문서화한다.
9. Gate 0이 `VERIFIED`가 아니면 Production 또는 Gate 6 완료를 주장하지 않는다.
10. 변경을 커밋·푸시하고 Draft PR에 증거를 남긴다.
