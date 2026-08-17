# 수학착착 접근성 상호작용 설계 v1.0

## Goal Framing

키보드와 스크린리더를 사용하는 학생·보호자가 마우스 없이 네 핵심 화면을 이동하고, 비동기 화면 전환 뒤에도 현재 위치를 잃지 않게 한다.

## Specification Engineering

모든 화면은 첫 Tab에서 건너뛰기 링크를 제공하고 `main`을 실제 초점 대상으로 삼는다. 진단 문제·결과, 공식 수업 단계·완료, 교육과정 협업·단계·회상 전환은 의미 있는 제목으로 초점을 옮긴다. 일반 텍스트는 4.5:1 이상, 초점 표시는 인접 색상 대비 3:1 이상이어야 한다.

## Context Engineering

대상은 정적 HTML, CSS, 브라우저 JavaScript로 구성된 랜딩·진단·공식 수업·교육과정 화면이다. 공통 스타일은 `client/accessibility/interaction.css`, 대비 계산은 `scripts/productization/accessibility_contrast.mjs`를 사용한다.

## Harness Engineering

정적 검사기는 양수 tabindex·autofocus를 금지하고, 건너뛰기 대상·프로그램 초점·상태 영역·모션 축소·스테이징 복사를 확인한다. 단위 테스트는 WCAG 상대 휘도와 12개 핵심 색상 조합을 검증한다. 자동 QA는 제품 책임자의 키보드·스크린리더 승인을 대신하지 않는다.

## Prompt Engineering

네 화면의 Tab 순서와 전환 후 초점을 감사하고, 공통 고대비 초점 스타일과 reduced-motion 계약을 적용한다. 작은 보조문구 색상을 보정하고 동적 결과는 상태 영역으로 노출한다.

## Workflow Engineering

`기준선 감사 → 초점 대상 정의 → 화면 전환 초점 관리 → 대비 보정 → 정적·단위 검사 → 스테이징 통합 검사 → 실제 키보드 검사 → 수동 검토 대기` 순서다.

## Memory Engineering

초점 이동 대상, 대비 색상 쌍과 계산 결과, 키보드 여정, reduced-motion 정책과 수동 검토 상태를 남긴다. 임시 포커스 추적 로그, 개인 입력값, 추정 승인과 브라우저 저장정보는 남기지 않는다.

## Loop Engineering

각 화면에서 Tab·Shift+Tab·Enter를 반복하고 화면 전환마다 `document.activeElement`가 의미 있는 요소인지 확인한다. 초점 소실·숨겨진 요소 초점·저대비 링·키보드 함정이 하나라도 있으면 수정 후 전체 검사를 반복한다.
