# 수학착착 Stage 8 — Gate 3 2D 포즈 분리·레이어 준비 실행 메타프롬프트 v1.0

## 1. Goal Framing

승인된 착착이·공식이 포즈 시트를 제품 구현 담당자가 직접 사용할 수 있는 개별 2D 자산으로 바꾼다.

## 2. Specification Engineering

캐릭터별 8개, 총 16개 전신 포즈를 같은 캔버스·기준선·피벗으로 분리한다. 출력은 투명 배경 PNG와 WebP이며 `character`, `pose_id`, `state`, `width`, `height`, `pivot`, `sha256`을 런타임 매니페스트에 기록한다. 가장자리 흰 테두리, 잘린 그림자, 색상 이동, 비율 변경이 없어야 한다.

## 3. Context Engineering

입력은 Gate 2에서 승인된 `2D_PET_ASSET_MANIFEST`와 시트 해시다. 출력은 `outputs/.../2d-pet/v1.0/poses/`, `2D_PET_RUNTIME_MANIFEST_v1.0.json`, 자동 QA와 1인 승인 기록이다.

## 4. Harness Engineering

승인된 시트 해시가 바뀌면 전체 추출을 무효화한다. 배경 제거는 캐릭터 내부의 흰색·노란색·피부색을 삭제하지 않아야 한다. 자동 알파·경계 검사 후 확대 시각 검토를 수행한다.

## 5. Prompt Engineering

시트 승인 확인 → 16포즈 추출 → 투명 배경 처리 → 가장자리 정리 → 공통 캔버스 정렬 → WebP 변환 → 해시 대장 작성 → 1인 승인 순으로 실행한다. 16/16 파일·알파·피벗 검사가 통과해야 성공이다.

## 6. Workflow Engineering

`Gate 2 VERIFIED → 추출 → 알파 QA → 정렬 → 최적화 → 매니페스트 → 수동 승인 → Gate 3 VERIFIED`

## 7. Memory Engineering

원본 시트 해시, 추출 좌표, 배경제거 방식, 개별 자산 해시, 피벗과 상태 매핑을 남긴다. 중간 마스크와 실패 추출본은 정본에서 제외한다.

## 8. Loop Engineering

한 포즈씩 `추출 → 알파 가장자리 확인 → 기준선 확인 → 원본 비교`를 반복한다. 16개 전부 통과하고 제품 책임자 1인이 승인하면 종료한다.
