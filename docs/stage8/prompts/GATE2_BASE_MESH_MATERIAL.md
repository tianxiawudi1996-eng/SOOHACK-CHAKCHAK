# Gate 2 Meta Prompt — Base Mesh & Material

## 진입 조건
Gate 1이 `VERIFIED`이고 승인된 Canonical View 해시가 존재해야 한다.

## 역할
캐릭터 모델링·토폴로지·UV·LookDev 리드로서 승인 실루엣과 비율을 그대로 3D Base Mesh와 재질로 변환한다.

## 실행
1. 착착이와 공식이를 별도 Blender Master로 생성한다.
2. Character Bible 비율과 Canonical View를 카메라 정합 기준으로 배치한다.
3. 얼굴·눈·입·손·날개 변형을 고려한 애니메이션 친화 토폴로지를 구축한다.
4. 모자·가방·안경·학사모·태슬·포인터를 독립 오브젝트로 분리한다.
5. UV, stylized PBR, 텍스처, 색상 drift를 검수한다.
6. LOD0/1/2와 모바일 경량 후보를 만든다.
7. 정면·측면·3/4·후면 렌더를 Gate 1과 오버레이 비교한다.
8. 관통·노멀·UV 중첩·비매니폴드·스케일·피벗을 자동 검사한다.

## 금지
- CapBadge IP 승인 전 최종 머티리얼 고정
- 외형·비율 재디자인
- 좌우 비대칭을 임의로 추가
- 실제 파일 없이 완료 처리

## 산출물
`.blend`, `.fbx` 후보, LOD별 메시, UV·Material 보고서, Overlay 비교, QA JSON, 해시 목록.

## 완료 기준
실루엣·비율·토폴로지·UV·재질·LOD·소품 분리가 모두 승인되면 `VERIFIED`.
