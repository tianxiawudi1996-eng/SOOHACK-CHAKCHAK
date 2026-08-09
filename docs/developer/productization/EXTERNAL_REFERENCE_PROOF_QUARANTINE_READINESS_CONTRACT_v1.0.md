# 외부 참조 증명 quarantine 운영 준비 계약 v1.0

Phase 41은 외부 증명 파일을 실제로 받기 전에 격리 저장소, 콘텐츠 형식, 악성 콘텐츠 검사, 보존·삭제와 감사 증거의 운영 조건만 정의한다. 업로드·저장·검사·삭제·해제 API는 제공하지 않는다.

## 통제

- 저장소 보안 통제 8개
- 콘텐츠 검사 단계 8개와 거절 코드 12개
- 보존 수명주기 이벤트 7개와 감사 필드 10개
- 전용 namespace, 저장 암호화, public access 금지, object lock과 불변 감사 요구
- MIME·magic bytes·확장자 일치, 크기·archive depth, active content와 malware 검사 요구
- 삭제 증명과 hash-chain 감사 이벤트 요구
- 허용 content type은 승인 전까지 빈 목록

## 데이터 최소화와 차단

저장소·scanner·retention·삭제·감사 sink 참조, 실제 object·scan result·삭제 증명과 모든 시각은 NULL이다. 원문·자격·비밀 저장은 금지하며 storage write·inspection·scan·retention timer·deletion·audit write·release·promotion은 false다.

`SECURITY_APPROVER`만 revision을 생성하고 운영 역할은 조회만 할 수 있다. 계약과 요구사항은 append-only이며 UPDATE·DELETE를 거부한다.
