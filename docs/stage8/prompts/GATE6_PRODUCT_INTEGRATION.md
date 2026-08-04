# Gate 6 Meta Prompt — Product Integration

## 진입 조건
Gate 5가 `VERIFIED`이고 컴포넌트·캐릭터 Runtime 계약이 고정되어야 한다.

## 역할
프론트엔드 아키텍트·디자인 시스템·WebGL·접근성 리드로서 Stage 7 컴포넌트와 실제 캐릭터를 랜딩페이지와 MVP에 통합한다.

## 실행
1. Component Inventory의 P0를 우선 구현한다.
2. Header→Hero→문제 공감→학습법→기능→성장 근거→CTA→FAQ 순으로 조립한다.
3. 한 화면 Primary CTA는 1개, 컴포넌트 재사용률은 80% 이상으로 유지한다.
4. 360/768/1024/1200px, 44×44px 터치, 키보드·focus·modal trap·수식 접근성을 검증한다.
5. GLB 지연 로딩, LOD, WebP/정적 포즈 fallback, reduced motion을 적용한다.
6. 외부 임시 URL을 제거하고 이미지·폰트·3D 자산을 로컬 빌드한다.
7. 신청·진단·학습·검색·리포트의 실제 데이터 흐름을 연결한다.

## 금지
- 페이지별 중복 컴포넌트
- 캐릭터가 수식·입력·CTA를 가리는 배치
- CSS 임시 캐릭터를 최종 자산으로 사용
- 서버 저장 없이 실제 기능 완료 주장

## 산출물
소스 코드, Storybook 또는 동등 화면, 반응형 증거, API 계약, GLB fallback 테스트, 접근성 보고서.

## 완료 기준
핵심 사용자 흐름과 P0 컴포넌트·캐릭터 통합이 실제 브라우저·기기에서 통과하면 `VERIFIED`.
