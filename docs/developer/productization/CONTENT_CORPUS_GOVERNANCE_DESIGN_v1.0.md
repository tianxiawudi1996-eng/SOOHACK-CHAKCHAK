# 수학착착 전문 콘텐츠 코퍼스 거버넌스 설계 v1.0

## Goal Framing

대치형 전문 학습에는 문제 수보다 출처·정답·해설·난도·오개념의 신뢰가 중요하다. D80-02는 합법적 사용권을 가진 30,000문항이 완전한 메타데이터와 독립 검수를 갖춘 상태를 목표로 한다.

## 데이터 모델

- `content_license`: 권리자·계약 내부 참조·계약 해시·유효 기간·지역·허용 용도
- `content_import_batch`: 원본 매니페스트와 수락·거절 집계
- `content_problem`: 학년·개념·유형·난도·현재 revision·게시 상태
- `content_problem_revision`: 문제·정답 스키마·풀이 단계·힌트·기술·오개념 태그
- `content_problem_review`: 수학 정확성·권리·언어 검수와 검토 해시
- `content_quality_finding`: 중복·정답·해설·교육과정·난도·권리·언어 결함

## 게시 트랜잭션 게이트

`PUBLISHED` 전환은 PostgreSQL trigger가 다음을 원자적으로 검사한다.

1. 현재 날짜에 유효하고 디지털 학습을 허용한 활성 라이선스
2. 현재 revision의 한국어 기준본 SHA-256 일치
3. 서로 다른 수학 검토자 2명의 승인
4. 권리 검토 승인 1건 이상
5. 미해결 ERROR·CRITICAL 품질 결함 0건

하나라도 실패하면 SQLSTATE `23514`와 `CONTENT_PUBLICATION_GATE_BLOCKED`를 반환한다. 승인·게시된 현재 revision은 UPDATE·DELETE할 수 없고 새 revision으로 교체한다.

## 성능 설계

- 모든 외래키 조회 경로에 인덱스를 둔다.
- 게시 목록은 `(publication_status, grade_code, difficulty, id)` 복합 인덱스와 `PUBLISHED` 부분 인덱스를 사용한다.
- 심층 목록은 OFFSET 대신 마지막 `(status, grade, difficulty, id)`를 사용하는 keyset pagination을 적용한다.
- 대량 적재는 1,000개 단위 batch 또는 검증된 `COPY FROM STDIN`을 사용하고 한 행씩 왕복하지 않는다.
- 미해결 오류와 활성 라이선스는 부분 인덱스로 관리한다.

## 보안·저작권 경계

- 계약서 원문·개인 연락처를 저장하지 않고 내부 참조와 SHA-256만 저장한다.
- 검토자 이름을 추정하지 않고 내부 identity reference만 기록한다.
- 합성 테스트 문항은 30,000문항 목표에 포함하지 않는다.
- 사용권 문서와 검토 결과가 실제로 제공되기 전에는 readiness를 `BLOCKED_EXTERNAL_CONTENT_EVIDENCE`로 유지한다.
