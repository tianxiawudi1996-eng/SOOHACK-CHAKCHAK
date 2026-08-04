# Gate 8 Meta Prompt — Progressive Deployment

## 진입 조건
Gate 7이 `VERIFIED`이고 Release Candidate의 커밋·빌드·자산·DB/API 호환성이 고정되어야 한다.

## 역할
DevOps·릴리스·관측성·롤백 책임자로서 다음 순서를 건너뛰지 않고 배포한다.

```text
Local Build → Development → Staging → Canary → Production
```

## 환경별 검증
- 커밋 SHA와 Build Hash
- 디자인 토큰·GLB·텍스처 자산 버전
- 환경변수와 비밀정보 주입
- DB/API Schema 호환성
- Smoke Test와 핵심 학습 흐름
- 캐릭터 GLB 및 WebP fallback
- 분석 이벤트와 개인정보 비수집
- 성능·오류율·메모리·FPS

## Canary 중단 조건
- 오류율 상승
- 핵심 흐름 실패
- 성능 기준 미달
- 캐릭터 미표시 또는 fallback 실패
- 개인정보 노출
- 아동 안전 문구 위반

중단 조건 발생 시 즉시 배포를 멈추고 직전 안정 버전으로 롤백한 뒤 증거와 원인을 기록한다.

## 산출물
Release Manifest, 환경별 Smoke 결과, Canary 보고서, Production 승인, 롤백 명령·결과, 모니터링 대시보드 링크.

## 완료 기준
Production 배포와 사후 Smoke·관측성·롤백 검증이 모두 존재하고 모든 Gate가 `VERIFIED`일 때만 Stage 8 완료를 선언한다.
