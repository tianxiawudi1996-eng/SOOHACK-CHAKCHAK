# 외부 연결 사전 수락 계약 v1.0

## 목적

Phase 33 수신 어댑터를 실제 채널에 연결하기 전에 필요한 외부 보안·개인정보·운영 증거를 하나의 불변 패킷으로 정의한다. 패킷 생성은 요구사항 명세일 뿐 구성 제출, 승인, 테스트 또는 연결 허가가 아니다.

## 요구사항 6종

| 통제 | 책임 역할 | 필수 증적 |
|---|---|---|
| 인증서 수명주기 | PKI_OWNER | 인증서 프로필 승인, 철회·회전 런북 |
| 신뢰 저장소 거버넌스 | TRUST_STORE_OWNER | Trust Anchor 매니페스트, 발급자 철회 정책 |
| 서명 키 회전 | KEY_MANAGEMENT_OWNER | 서명 키 정책, 회전 리허설 |
| 접속 허가 | NETWORK_SECURITY_OWNER | 네트워크 변경 승인, 송수신 allowlist |
| 실패 복구 | OPERATIONS_OWNER | 격리·dead-letter 런북, retry·backoff 정책 |
| 운영 수락 | PRODUCT_OWNER | 사전 연결 테스트 보고서, 이중 승인 기록 |

각 요구사항은 개인정보·보안 승인자 모두를 요구한다. 현재 증적 참조·해시·검증 시각은 NULL이고 외부 테스트와 승인 검토는 수행되지 않았다.

## API와 권한

- `POST /api/v1/privacy-operations/intake-adapter-contracts/{id}/connection-acceptance-packets`: `SECURITY_APPROVER` 전용 append-only 생성
- `GET /api/v1/privacy-operations/connection-acceptance-packets/{id}`: 운영 역할 읽기

구성 제출, 승인, 테스트, 연결 경로는 제공하지 않는다. 학생은 조회할 수 없다.

## 저장 금지와 안전 경계

인증서·개인키·Secret·Token·복구 코드를 저장하지 않는다. `credential_material_storage_allowed=false`, `secret_material_storage_allowed=false`, `connection_enablement_allowed=false`, `connection_authorized=false`, `execution_authorized=false`를 DB와 도메인에서 강제한다.

## 무결성

최신 Phase 33 계약과 SHA-256을 검증한다. 과거 어댑터·검증 정책·인계·준비도, 후속 패키지, 만료, 활성 법적 보존을 거부한다. 패킷과 요구사항은 UPDATE/DELETE할 수 없으며 새 리비전만 추가한다.

## 외부 미결정

실제 인증서 프로필·수명·철회 경로, trust anchor, 서명 알고리즘·key ID·회전 주기, allowlist, 테스트 환경, 장애 대응자, 증적 보관소와 최종 승인자는 외부 권한과 관리형 비밀 저장소가 준비된 뒤 결정한다.
