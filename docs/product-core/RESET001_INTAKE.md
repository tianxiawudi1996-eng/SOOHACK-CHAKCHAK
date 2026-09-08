# RESET-001 정본 편입 규격

## 원본

`C:\Users\ddedi\Documents\Math Memory Tutor\reference\alg-eq-001\`

사용자가 확인한 RESET-001 합성 학습 흐름의 실제 로컬 파일을 원본으로 한다.

## 대상

`D:\project\SOOHACK CHACKCHACK\reference\alg-eq-001\`

## 금지

- GitHub의 기존 분수 Lesson을 RESET-001로 이름만 변경하지 않는다.
- ChatGPT 기억을 이용해 `index.html`을 재생성하지 않는다.
- 파일명이 같은 후보를 원본으로 간주하지 않는다.
- 복사 중 HTML/CSS/JS를 자동 포맷팅하거나 인코딩 변환하지 않는다.

## M1 수용 기준

- [ ] source에 `index.html` 존재
- [ ] source 전체 파일 목록 기록
- [ ] source 파일별 SHA-256 계산
- [ ] target으로 원본 바이트 복사
- [ ] source와 target 상대경로 집합 동일
- [ ] 파일별 SHA-256 100% 일치
- [ ] localhost HTTP로 실행
- [ ] 1440px / 768px / 390px 화면 확인
- [ ] 콘솔 치명 오류 0
- [ ] 필수 asset 404 0
- [ ] 시작→정답→오답→힌트→재시도→완료 흐름 확인
- [ ] GitHub 커밋·푸시
- [ ] `docs/product-core/STATUS.json` M1을 VERIFIED로 갱신

## 검토 산출물

- `reference/alg-eq-001/**` — 원본
- `docs/product-core/evidence/RESET001_SHA256.json`
- `docs/product-core/evidence/RESET001_VISUAL_QA.md`
- 커밋 SHA

## 다음 단계

M1 VERIFIED 이후에만 RESET-001과 현재 `client/math-learning`을 비교하여 ALG-EQ-001 정식 Product Lesson을 구현한다.