# Gate 1 Coordinator Action Request

## Required action

Gate 1의 실제 검토를 시작하려면 다음 다섯 역할에 대해 검토자를 지명해 `COORDINATOR_REVIEWER_NOMINATION_RESPONSE_v1.0.json`을 작성하십시오.

- Character Art Lead
- 3D Technical Art Lead
- UX Brand System Lead
- QA Lead
- Product Owner

각 역할마다 실제 `reviewer_name`, 내부 `reviewer_identity_reference`, 비밀정보가 아닌 `contact_reference`, `conflict_declaration`을 제공해야 합니다. 제출자, 시간대 포함 제출 시각, 검토자 지명 권한을 가리키는 `authorization_reference`도 필요합니다.

## Existing preparation

- Package: `gate1-manual-review-916636d0-9c8061af`
- Review packets: 10/10
- Dispatch drafts: 5/5, all `NOT_SENT`
- Reviewer assignments: 0/5
- Valid approvals: 0/10

## Data handling

- 비밀번호, 토큰, 개인 연락처 원문을 넣지 마십시오.
- 조직 내부에서 실제 사람과 발송 경로를 확인할 수 있는 참조 ID만 사용하십시오.
- nomination은 배정·수신 확인·승인이 아닙니다.
- AI가 빈 필드를 대신 채우지 않습니다.

## Resume condition

유효 nomination 5/5와 authorization_reference가 감사된 후에만 사람이 배정 대장을 갱신하고, 수신 확인을 받은 뒤 승인된 채널로 요청을 전달할 수 있습니다.
