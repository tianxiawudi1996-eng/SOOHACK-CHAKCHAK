# 수학착착 Stage 8 통합 실행 계획

## 목표

Stage 1~7에서 승인된 수학착착 SSOT를 보존하면서, 착착이·공식이를 실제 제품에서 반응하는 학습 동반자로 통합한다. 2026-08-05 사용자 결정에 따라 3D 메시·리그 제작은 중단하고, 승인 원본과 같은 정체성을 가진 음영 2D 다중 포즈 시스템을 사용한다.

## 완료 정의

각 Gate는 필수 산출물, 자동 검증, 제품 책임자 1인 수동 승인이 모두 존재할 때만 `VERIFIED`가 된다. 자동 파일 검사는 시각 품질이나 사용자 승인을 대신하지 않는다. 선행 Gate가 `VERIFIED`가 아니면 다음 Gate에 진입하지 않는다.

## 고정 순서

1. Gate 0: SSOT 원본·메타데이터·참조 무결성 — `VERIFIED`
2. Gate 1: Canonical View 승인 — `VERIFIED`
3. Gate 2: 음영 2D 다중 포즈 시트 — `VERIFIED`
4. Gate 3: 개별 포즈 추출·투명 배경·레이어/피벗 — `VERIFIED`
5. Gate 4: 2D 상태 전환·펫 모션·reduced-motion — `BLOCKED`
6. Gate 5: AI Behavior 상태·이벤트·말풍선 연결 — `NOT_STARTED`
7. Gate 6: Product Integration — `NOT_STARTED`
8. Gate 7: QA — `NOT_STARTED`
9. Gate 8: Deployment — `NOT_STARTED`

## 2D 전환 원칙

- 착착이·공식이 승인 이미지는 정체성 SSOT다.
- 새 포즈는 얼굴·비율·의상·색상·소품을 바꾸지 않는다.
- 3D·복셀·저폴리 외형을 제품 자산으로 승격하지 않는다.
- 3D 산출물은 삭제하지 않고 감사 이력으로만 보존한다.
- 2D 포즈 시트 승인 후 개별 투명 PNG/WebP를 추출한다.
- 런타임 모션은 위치·회전·크기·투명도 중심의 가벼운 전환으로 구현한다.
- `prefers-reduced-motion`에서는 점프와 스쿼시를 정적 포즈 전환으로 대체한다.

## 작업 루프

```text
기준 확인 → 최소 변경 → 자동 검증 → 확대 시각 검증 → 1인 승인 → 증거 고정 → 상태 갱신 → 다음 Gate
```

## 현재 상태와 다음 작업

- 착착이·공식이 8포즈 시트 후보 2개를 생성했다.
- 자동 파일·해시·크기·상태 매핑 QA는 통과했다.
- Gate 2는 제품 책임자 1인 승인과 승격 감사를 거쳐 `VERIFIED`다.
- Gate 3의 16개 포즈는 512×512 투명 PNG와 무손실 WebP로 추출됐고 자동 QA 16/16을 통과했다.
- Gate 3는 알파 경계·정체성·소품·작은 UI 가독성에 대한 제품 책임자 수동 승인 1/1로 `VERIFIED`다.
- Gate 4의 8개 상태 전환은 준비·교차·착지·잔동작의 680ms 자연 연동 안무와 상태별 미세 모션을 갖추었고 `prefers-reduced-motion` 정적 대체까지 자동 QA 8/8을 통과했다.
- Gate 4는 제품 책임자의 친근함·반복 피로도·화면 잘림·학습 방해 검토 0/1로 `BLOCKED`다.
- 민감한 `github-recovery-codes.txt`는 읽거나 추적하지 않는다.
