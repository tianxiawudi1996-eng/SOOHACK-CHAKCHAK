# Stage 8 Master Execution Plan

## 목적

1~7단계 SSOT를 변경하지 않고 실제 자산과 제품을 순차 제작·검증·배포한다. 작업은 Gate 단위 최소 증분으로 수행하며, 실패를 건너뛰지 않는다.

## 현재 기준선

- Gate 0: `DONE_IMPLEMENTED` — 원본 10개 파일의 최종 해시·공식 승인 기록은 남음
- Gate 1: `FAIL` — Canonical View 보정 필요
- Gate 2~4: `BLOCKED_EXTERNAL`
- Gate 5~8: 명세는 존재하나 선행 Gate 미통과로 실행 금지

## 고정 순서

1. Gate 0 무결성 마감
2. Gate 1 Canonical View 보정·승인
3. Gate 2 Base Mesh·Material
4. Gate 3 Rig·BlendShape
5. Gate 4 Motion
6. Gate 5 AI 행동·말풍선
7. Gate 6 제품 통합
8. Gate 7 통합 QA
9. Gate 8 Local→Development→Staging→Canary→Production

## 반복 루프

```text
입력 기준 확인
→ 최소 증분 제작
→ 자동·수동 테스트
→ 증거 저장
→ SSOT 비교
→ FAIL 수정
→ 회귀 테스트
→ 승인
→ 상태·문서 갱신
→ 커밋·푸시
→ 다음 Gate
```

## 문서화 규칙

각 증분은 다음 파일 또는 동등한 기록을 남긴다.

- 실행 메타프롬프트
- 입력 파일과 SHA-256
- 제작 결과와 경로
- 자동 테스트 결과
- 수동 검수 체크리스트
- 실패 원인과 수정 내역
- Gate 판정
- 다음 작업
- 커밋 SHA와 PR 번호

## Git 규칙

- 작업 브랜치: `agent/stage8-<gate>-<increment>`
- 커밋: 한 증분당 명확한 목적 하나
- PR: 기본 Draft, Gate 증거와 테스트 결과 포함
- 기존 승인 파일은 덮어쓰지 않고 새 버전으로 추가
- 외형·역할·행동 변경은 v1.1 변경 요청
- 기술 보정은 v1.0.x patch

## 즉시 진행 항목

1. 저장소 Harness 초기화
2. Gate 0 원본 파일 입고 경로와 해시 매니페스트 정의
3. Gate 1 착착이 중립 정면부터 방향별 제작
4. Gate 1 완료 전 Gate 2 차단 유지
5. CapBadge·상표·캐릭터 유사성 검토를 병행 외부 과제로 추적
