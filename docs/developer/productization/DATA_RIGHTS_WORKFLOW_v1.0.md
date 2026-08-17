# 수학착착 데이터 권리 요청 흐름 v1.0

## 목적과 법적 경계

학생이 자신의 개인정보에 대해 열람, 구조화된 내보내기, 정정, 삭제, 처리 제한, 동의 철회를 요청할 수 있게 한다. 대한민국 개인정보 포털은 정보주체가 열람·정정·삭제·처리정지를 청구할 수 있으며 전자적 처리 절차를 운영할 수 있다고 안내한다. 국가법령정보센터의 개인정보 보호법과 요구서 서식도 같은 권리 유형과 본인·정당한 대리인 확인을 전제로 한다.

- 공식 참고: https://www.privacy.go.kr/front/contents/cntntsView.do?contsNo=41
- 법령 참고: https://law.go.kr/LSW/lsInfoP.do?lsiSeq=270351
- 공식 요구서 참고: https://www.law.go.kr/LSW/flDownload.do?bylClsCd=200203&flSeq=157859961

이 구현은 권리 요청을 안전하게 접수·추적하는 제품 통제이며 법률 준수 인증이 아니다. 실제 처리 기한, 거절 사유, 통지 방법, 아동·청소년 대리권은 개인정보 보호책임자와 법률 검토를 거쳐 확정한다.

## 요구사항

| ID | 요구사항 | 인수 기준 |
|---|---|---|
| PRIV-26-01 | 학생 본인 요청 접수 | 유효한 학생 세션과 멱등성 키로 6개 요청 유형 중 하나를 `RECEIVED`로 저장한다. |
| PRIV-26-02 | 본인 요청 조회 | 요청자 본인의 목록과 상세만 반환하며 내부 사용자·학생 식별자를 노출하지 않는다. |
| PRIV-26-03 | 상태 이력 | 접수와 상태 변경을 삭제 제한된 별도 이벤트 테이블에 기록한다. |
| PRIV-26-04 | 안전한 취소 | `RECEIVED` 또는 `IDENTITY_VERIFIED` 상태만 요청자가 취소할 수 있다. |
| PRIV-26-05 | 파괴적 처리 분리 | 삭제·동의 철회 요청 접수만으로 원본 학습 데이터를 삭제하거나 동의를 변경하지 않는다. |
| PRIV-26-06 | 보호자 경계 | 관리형 신원 확인, 활성 학부모 연결, 대리권 검증 전에는 보호자 접수 채널을 열지 않는다. |

## 데이터 흐름

```text
학생 세션
→ POST /api/v1/privacy/requests
→ 요청 유형·로케일·멱등성 검증
→ 학생 소유권 검증
→ privacy_request + privacy_request_event 원자 저장
→ 내부 식별자를 제거한 접수 결과
```

## 상태 전이

```text
RECEIVED → IDENTITY_VERIFIED → IN_REVIEW → APPROVED → COMPLETED
    └──────────────→ CANCELLED       └────→ REJECTED
```

- 학생 취소: `RECEIVED`, `IDENTITY_VERIFIED`에서만 허용
- `IN_REVIEW` 이후 결정: 현재 공개 API 범위 밖이며 승인된 운영자 워크플로가 필요
- `COMPLETED`: 실제 이행 증적과 결정 사유가 있어야 하며 현재 API가 자동 생성하지 않음

## API 계약

- `POST /api/v1/privacy/requests`: 학생 본인 요청 접수
- `GET /api/v1/privacy/requests`: 본인 요청 최근 50건
- `GET /api/v1/privacy/requests/{request_id}`: 본인 요청과 상태 이력
- `POST /api/v1/privacy/requests/{request_id}/cancel`: 초기 상태 요청 취소

지원 유형은 `ACCESS`, `EXPORT`, `CORRECTION`, `DELETION`, `PROCESSING_RESTRICTION`, `CONSENT_WITHDRAWAL`이다. 모든 변경 요청은 `Idempotency-Key`가 필요하다.

## 권한·실패·제외 범위

- 다른 학생의 요청은 목록에 포함하지 않고 상세 조회는 404로 처리한다.
- 잘못된 유형·로케일·식별자는 400, 취소 불가능한 상태는 409다.
- 보호자 대리 접수, 운영자 결정·이행, 실제 내보내기 파일 생성, 물리 삭제·법적 보존 분리는 이번 범위에서 제외한다.
- 비밀번호·토큰·답안 원문·문제 원문·연락처는 요청 및 이벤트에 저장하지 않는다.
