# Gate 1 후보 생성 기록

- 생성 방식: built-in image generation
- 입력 1: `ssot/stage7/v1.0/Chakchaki_Approved_Reference_v1.0.png`
- 입력 2: `ssot/stage7/v1.0/Gongsickyi_Approved_Reference_v1.0.png`
- 출력 위치: `evidence/gate-1/candidates/`
- 상태: `NOT_VERIFIED`

## 프롬프트 세트

각 캐릭터별 승인 레퍼런스를 단일 외형 기준으로 사용했다. 동일 축척·동일 바닥선·정면/좌우 3/4/좌우 측면/후면/액세서리 제거/실루엣/32·64·128 가독성의 16셀 보드를 요청했다. 중립 자세, 캐릭터 비율·얼굴·의상·소품·색상 보존, 좌우 방향 중복 금지, 전신 비크롭, 흰 배경, 추가 소품·워터마크 금지를 공통 제약으로 지정했다.

착착이는 10~12세 인상, 4.4-head 비율, 파란 모자·흰 후드·파란 반바지·운동화·백팩을 고정했다. 공식이는 달걀형 병아리 실루엣, 둥근 안경·학사모·별 포인터·짧은 부리-입을 고정했다.

## 제한

- 생성 이미지는 후보이며 canonical SSOT에 포함하지 않는다.
- 생성 모델의 raster 결과만으로 정투영 카메라와 3D 치수 일치를 증명할 수 없다.
- 사람 승인 전 `VERIFIED`, `APPROVED`, `FINAL`로 명명하지 않는다.

## 공식이 v2 단일 보정

v1 보드의 `SILHOUETTE-3Q` 셀만 대상으로, 약 45도 회전된 3/4 외곽선에서 몸체 깊이·날개 겹침·발 오프셋·학사모 챙·안경 림·별 포인터가 구분되도록 요청했다. 다른 15셀과 그리드·라벨·배경은 유지하도록 제한했다. 결과는 `Gongsickyi_Canonical_Turnaround_Candidate_v2.png`이며 v1은 보정 이력으로 남겼다.
