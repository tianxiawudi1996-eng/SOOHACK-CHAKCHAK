# Phase 22 수동 접근성 검토 패킷

- 상태: `PENDING_PRODUCT_OWNER_REVIEW`
- 자동 QA와 수동 승인은 별개다.
- 검토자는 실제 키보드와 사용하는 스크린리더로 확인한다.

## 고정 검토 URL

- `http://127.0.0.1:4180/?locale=ko`
- `http://127.0.0.1:4180/diagnostic/?locale=ko`
- `http://127.0.0.1:4180/math-learning/?locale=ko`
- `http://127.0.0.1:4180/curriculum/?locale=ko&grade=E4`

## 체크리스트

- [ ] 첫 Tab에서 건너뛰기 링크가 보이고 Enter 후 본문에 초점이 간다.
- [ ] Tab·Shift+Tab 순서가 시각적 읽기 순서와 일치한다.
- [ ] 모든 링크·버튼·선택·입력에 명확한 초점 링이 보인다.
- [ ] 진단 문제와 결과 전환 후 제목이 읽힌다.
- [ ] 공식 수업 단계와 완료 전환 후 제목이 읽힌다.
- [ ] 협업·다음 단계·회상 검사 전환 후 현재 제목이 읽힌다.
- [ ] 키보드 함정과 숨겨진 요소 초점이 없다.
- [ ] 모션 축소 설정에서 불필요한 움직임이 없다.

## 반환 필드

```text
Reviewer identity reference:
Assistive technology:
Browser and version:
Decision: APPROVE | APPROVE_WITH_PATCH | REJECT
Reviewed at:
Comment:
Patch IDs:
Unresolved issue:
```
