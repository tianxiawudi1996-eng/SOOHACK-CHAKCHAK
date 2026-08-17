# Stage 8 Handoff Manifest v1.0

## 1. 인수인계 상태
- **Stage 7:** 조건부 PASS
- **Stage 8 착수:** 가능
- **실제 3D 자산:** 미제작
- **공개·배포 차단 항목:** 착착이 모자 고유 심볼, 브랜드·캐릭터 상표/유사성 공식 검토

## 2. 단일 진실 원천

| 우선순위 | 파일 | 용도 |
|---:|---|---|
| 1 | `MathChakChak_Stage7_SSOT_v1.0.xlsx` | 결정·토큰·컴포넌트·EXIT |
| 2 | `MathChakChak_Stage7_SSOT_v1.0.md` | 서술형 기준 |
| 3 | `Component_Inventory_v1.0.xlsx` | Figma·프론트엔드·QA |
| 4 | `Gongsickyi_Character_Bible_v1.0.md` | 공식이 디자인 락 |
| 5 | `Chakchaki_Character_Bible_v1.0.md` | 착착이 디자인 락 |
| 6 | `Character_Module_Rig_Spec_v1.0.xlsx` | 모델·리그·BlendShape·LOD |
| 7 | `Expression_Motion_Bubble_Library_v1.0.xlsx` | 상태머신·모션·말풍선 |
| 8 | `Stage8_Handoff_Manifest_v1.0.md` | 착수·버전·변경 관리 |

## 3. 승인 참조 이미지
- `Chakchaki_Approved_Reference_v1.0.png`
- `Gongsickyi_Approved_Reference_v1.0.png`

이 이미지는 외형·모듈·표정 방향의 참조다. 정투영 치수와 실제 메시 데이터로 간주하지 않는다.

## 4. 탐색·폐기 이미지
- `수학착착_3d_마스코트_브랜드_가이드.png`: 합본 연출·말풍선 참고
- `수학착착_7단계_컴포넌트시스템_공식이_캐릭터시안.png`: 초기 UI 분위기 참고
- `a_clean_flat_ui_brand_design_spec_sheet_style_pos.png`: 구 명칭·초기 외형으로 폐기

## 5. 8단계 착수 전 검사
1. 위 8개 기준 파일이 모두 존재하는가?
2. 파일 버전이 모두 v1.0인가?
3. 승인 참조 이미지가 두 캐릭터별로 분리되어 있는가?
4. 컴포넌트·모듈·상태 ID가 코드 명명과 일치하는가?
5. 기존 탐색 이미지를 승인 기준으로 사용하지 않았는가?
6. 실제 GLB가 없음을 명확히 인지했는가?

미충족 시 신규 이미지·모델링·프론트엔드 구현을 시작하지 않는다.

## 6. Stage 8 Gate

### Gate 1 — Canonical View
- 착착이·공식이를 별도 제작
- 정면/좌/우/후면/앞 3/4/뒤 3/4
- 동일 바닥선·카메라·높이·폭
- 32/64/128px 실루엣 검수
- Gate 1 승인 전 Base Mesh 본작업 금지

### Gate 2 — Base Mesh & Material
- 토폴로지·UV·PBR·색상 drift·소품 분리
- CapBadge는 교체 모듈
- 안경·모자·가방·포인터 관통 검수

### Gate 3 — Rig & BlendShape
- `Character_Module_Rig_Spec_v1.0.xlsx`와 일치
- 눈·눈꺼풀·눈썹·입·볼·손/날개 변형
- 표정 조합에서 정체성 유지

### Gate 4 — Motion
- Idle, Greet, Listen, Think, Guide, Search, Praise, Retry, Celebrate, Wait, Rest, Error
- 입력 중 큰 동작 금지
- loop seam·발 미끄럼·소품 관통 없음

### Gate 5 — AI Behavior & Bubble
- `Expression_Motion_Bubble_Library_v1.0.xlsx` 이벤트 매핑
- 우선순위·쿨다운·반복 방지
- 정답 선노출 금지
- 캐릭터 숨김·reduced motion·음성 끄기

### Gate 6 — Product Integration
- 랜딩페이지·MVP 공통 컴포넌트 적용
- 360/768/1024/1200px
- 키보드·focus·44px·수식 접근성
- GLB 지연 로딩·LOD·fallback
- 실제 테스트 로그 제출

## 7. 변경 관리
Stage 8에서 SSOT와 충돌하는 문제가 발견되면 임의 수정하지 않는다.

```text
문제 발견
→ 변경 요청 ID 발급
→ 영향 분석
→ 외형 유지 대안
→ 승인
→ SSOT patch version
→ 8단계 반영
```

- 기술 보정: v1.0.1
- 외형·역할·행동 의미 변경: v1.1
- 이전 기준 파일 덮어쓰기 금지

## 8. 미결정·외부 과제
| ID | 항목 | 영향 | 차단 시점 |
|---|---|---|---|
| EXT-01 | 착착이 모자 고유 심볼 | 최종 CapBadge | 최종 렌더·배포 |
| EXT-02 | 브랜드 상표 선행 검토 | 브랜드 사용 | 공개·사업화 |
| EXT-03 | 캐릭터 유사성 검토 | 상품화·IP | 공개·사업화 |
| EXT-04 | 학생·부모 사용자 테스트 | 호감·연령·이해 | MVP 공개 전 |

## 9. Stage 8 첫 실행 지시

> 이 매니페스트와 Stage 7 SSOT를 먼저 감사하고 파일 존재·버전·충돌 보고서를 작성하라. Gate 1 승인 전에는 최종 Base Mesh, Rig, BlendShape, Animation, GLB 또는 제품 적용을 완료로 보고하지 마라.
