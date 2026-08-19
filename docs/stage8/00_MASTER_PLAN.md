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
5. Gate 4: 2D 상태 전환·펫 모션·reduced-motion — `VERIFIED`
6. Gate 5: AI Behavior 상태·이벤트·말풍선 연결 — `VERIFIED` (자동 QA PASS, 제품 책임자 승인 1/1)
7. Gate 6: Product Integration — `VERIFIED` (반응형·정적 품질·내용 주소 RC)
8. Gate 7: QA — `VERIFIED` (명령 14/14, 단위 336/336, 통합 61/61, P0 0)
9. Gate 8: Deployment — `BLOCKED` (외부 개발 전체 스택 PASS, 콜드스타트 CPU 최적화·운영 출시 승인 미완료)

## Gate 6 제품화 증거 매핑

- Phase 5: 승인 캐릭터 2/2, 로케일 8/8, 360·768·1024·1200 화면 PASS
- Phase 6: 기능 개발 `VERIFIED`, 기능 체크리스트 15/15
- Phase 7: 로컬 스테이징 Artifact 78/78, 승인 포즈 32/32, rollback PASS, 외부 배포 false
- Phase 8: Frontend→API→PostgreSQL 핵심 사용자 여정 PASS
- 고정 증거: `docs/stage8/evidence/gate6/GATE6_PRODUCT_INTEGRATION_EVIDENCE_MAP_v1.0.json`

Gate 6 종료 증거 3/3과 RC SHA-256 `3ff96ece71a86e8e61c5fdd22d0073ae365620f7bfb0500f86a03bd178a544dd`가 고정됐다.

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
- Gate 4의 8개 상태 전환은 준비·교차·착지·잔동작의 680ms 자연 연동 안무와 상태별 미세 모션을 갖추었고, Edge 실제 런타임의 순차·역순·빠른 입력·CLS·3개 뷰포트·포인터·`prefers-reduced-motion` 검사 7/7을 통과했다.
- Gate 4는 제품 책임자의 친근함·반복 피로도·화면 잘림·학습 방해 검토 1/1 승인으로 `VERIFIED`다.
- Gate 5는 Stage 7 정본의 상태 15/15·이벤트 15/15·말풍선 13/13을 승인된 8개 시각 상태에 연결했다.
- 실제 Edge에서 우선순위 선점·입력 보호·단일 대기열·로그 개인정보 최소화·캐릭터 숨김·반응형·reduced-motion 검사가 모두 PASS했다.
- Gate 5는 제품 책임자 1인 수동 승인 1/1과 승격 감사를 거쳐 `VERIFIED`다.
- Gate 6는 제품화 Phase 5~8 증거, 실제 Chromium 4개 뷰포트, lint·런타임 타입 계약, 불변 RC로 `VERIFIED`다.
- Gate 7은 출시 차단 QA 14/14, 단위 336/336, PostgreSQL 통합 61/61, 접근성 6/6, P0 0으로 `VERIFIED`다.
- Gate 8은 Cloudflare Workers Free·Hyperdrive·Neon PostgreSQL 개발 배포와 공개 Health·API·DB 검증이 PASS했다. 다만 콜드스타트 CPU 23ms 관찰 위험과 운영 출시 승인 미완료 때문에 전체 Gate는 `BLOCKED`다.
- 민감한 `github-recovery-codes.txt`는 읽거나 추적하지 않는다.
