# 제한적 운영 확대 비실행 계획 런북 v1.0

Phase 60 승인 결과에 SHA-256으로 결속된 비실행 계획을 관리한다. 대상은 승인된 내부 성인 직원이며 합성 데이터만 사용한다.

수학착착 로컬 정책은 로케일 8개, 로케일당 최대 8요청, 총 64요청, 최대 60분, 동시성 2, 자동 재시도 0이다. 원문 보존은 0일, 참조 메타데이터는 최대 30일이다. 이 수치는 OpenAI 의무 수치가 아니다.

14개 통제에는 model/prompt pin, 내부 audience, 합성 데이터, 식별자 금지, 원문 미보존, 모니터링·안전 escalation·삭제·incident·kill switch·rollback·flag OFF·학생/공개 트래픽 차단이 포함된다.

통제 14/14와 승인된 60분 이하 실행창이 있어야 단일 제품 책임자 검토를 요청한다. 승인돼도 비발송 execution handoff만 생성하며 실행 권한은 false다.

현재 Phase 60은 차단 상태이고 통제 0/14, 실행창 `PENDING_EXTERNAL`, review `NOT_REQUESTED`, 실행·dispatch·provider·flag 변경·학생/공개 트래픽은 false다.
