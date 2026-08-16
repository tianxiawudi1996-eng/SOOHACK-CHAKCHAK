# Phase 48 AI 튜터 품질·안전 평가 완료 보고서

## 목표와 결과

착착이·공식이 튜터 출력의 품질을 느낌으로 판단하지 않고, 재현 가능한 합성 골든 데이터와 적대적 후보로 평가하는 로컬 하네스를 구축했다.

현재 상태는 `AUTO_VERIFIED_LOCAL_AI_EVAL_HUMAN_CALIBRATION_AND_EXTERNAL_MODEL_BLOCKED`다. 로컬 안전 기준선은 통과했지만 외부 모델 품질과 사람 검토를 승인한 상태는 아니다.

## 산출물

- `developer/evals/tutor-golden-cases.v1.json`: 8개 언어 × 4개 상황, 적대적 후보 9개
- `developer/src/agent/tutor-safety.mjs`: 하드 게이트와 실패 분류
- `developer/src/agent/tutor-evaluator.mjs`: 골든·적대적 평가 실행기
- `scripts/productization/run_ai_tutor_evals_phase48.mjs`: 결과와 데이터셋 해시 생성
- `scripts/productization/validate_ai_tutor_evals_phase48.mjs`: Phase 감사
- `docs/productization/evidence/PHASE_48_AI_TUTOR_EVAL_RESULTS.json`: 자동 결과
- `docs/productization/evidence/PHASE_48_HUMAN_CALIBRATION_REGISTER.json`: 사람 교정 대기 대장

## 강화된 런타임 게이트

Phase 47 커널에 다음 실패를 추가로 차단했다.

1. 모든 분수형 숫자 정답 직접 노출
2. 이메일·전화번호·UUID 재출력
3. 모욕·비난 표현
4. 착착이와 공식이의 동일 문구 출력
5. 요청 로케일과 다른 언어
6. 서버 outcome과 다른 다음 행동
7. 추가 필드 또는 잘못된 스키마

게이트 실패 시 생성 결과를 폐기하고 `RULE_FALLBACK`으로 전환한다. AI가 서버 채점이나 학습 단계 전이를 바꾸는 권한은 여전히 없다.

## 검증 결과

- 합성 골든: 32/32 PASS
- 적대적 후보: 9/9 차단
- 필수 로케일: 8/8
- 학습 상황: 4/4
- 전체 단위 테스트: 155/155 PASS
- Phase 47 회귀 감사: PASS
- Phase 48 결과·해시 감사: PASS
- `git diff --check`: PASS
- 외부 모델 실호출: 0회
- 사람 교정: 0/1

## 사실·가정·미결정

사실: 로컬 fallback과 적대적 fixture에 대한 결정론적 게이트는 모두 통과했다.

가정: 언어 문자·핵심어 신호는 잘못된 언어를 빠르게 막는 1차 필터로만 유효하다.

미결정: 원어민 자연스러움, 학년별 설명 난이도, 교육적 유용성, 외부 모델 변동성·지연·비용은 실제 모델 반복 실행과 전문가 라벨이 필요하다.

## 다음 Phase

Phase 49는 승인 전 운영 제어를 구축한다. 모델·프롬프트·데이터셋 버전 고정, 기능 플래그, 비용·지연 예산, 회로 차단기, 안전 실패율 모니터링, 롤백 조건을 정의하고 로컬 시뮬레이션한다.
