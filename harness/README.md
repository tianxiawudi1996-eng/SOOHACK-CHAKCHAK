# Stage 8 Harness

이 하네스는 Stage 8을 증거 기반 Gate 순서로 통제한다. 현재 상태의 기계 판정 단일 정본은 `harness/status.json`이다.

## 현재 상태

- Gate 0~7: `VERIFIED`
- Gate 5: `VERIFIED`, 제품 책임자 승인 1/1
- Gate 6: 제품화 Phase 5~8 매핑·반응형 4/4·정적 품질·불변 RC `VERIFIED`
- Gate 7: 명령 14/14·단위 336/336·통합 61/61·브라우저 접근성 6/6 `VERIFIED`
- Gate 8: 로컬 배포·Health·Smoke·Rollback `VERIFIED`, Cloudflare 프런트엔드와 fail-closed API 브리지 `DEPLOYED`, 공급자 인증·대상·push 권한과 `development` 보호 Environment(main 전용) `VERIFIED`, 불변 배포 커밋과 외부 API·PostgreSQL 미구성으로 `BLOCKED`
- 외부 배포·제품 출시: 승인되지 않음

고정 RC SHA-256: `3ff96ece71a86e8e61c5fdd22d0073ae365620f7bfb0500f86a03bd178a544dd`

## 검증 명령

```powershell
python scripts/harness/audit_stage8.py
node scripts/harness/audit_gate6_product_integration.mjs
node scripts/harness/audit_gate7_release_candidate.mjs
npm.cmd run gate8:external:preflight
node scripts/harness/audit_gate8_deployment.mjs
python scripts/harness/validate_harness.py
node scripts/productization/validate_status_alignment.mjs
git diff --check
```

Gate 6 증거 매핑은 `docs/stage8/evidence/gate6/GATE6_PRODUCT_INTEGRATION_EVIDENCE_MAP_v1.0.json`, Gate 7 QA는 `docs/stage8/evidence/gate7/GATE7_RELEASE_BLOCKING_QA_v1.0.json`, Gate 8 로컬 배포는 `docs/stage8/evidence/gate8/GATE8_LOCAL_DEPLOYMENT_QA_v1.0.json`, 외부 공급자 사전점검은 `docs/stage8/evidence/gate8/GATE8_EXTERNAL_DEPLOYMENT_PREFLIGHT_v1.0.json`에 고정한다. 공식 캐릭터 기준은 `docs/stage8/evidence/ACTIVE_CHARACTER_REFERENCE_REGISTER_v1.0.json`을 따른다.

민감한 복구 코드·Secret·개인 연락처는 읽거나 증거에 포함하지 않는다.
