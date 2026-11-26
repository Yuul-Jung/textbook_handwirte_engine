# 전자교재 판서 엔진

현재 기준: v28 (독립 판서 엔진).

- 실행: `annotation_course_v28.html`을 브라우저에서 열기.
- 핵심 원본 소스: `yja-annotation-pilot/lesson/annotation/` (JS, CSS, 설정).
- 제작 규칙: `ANNOTATION_STANDARD_v28.md`.
- 검증 기록: `VALIDATION_v28.md`.
- 원본 패키지 안내: `docs/README_v28_original.md` (전체 ZIP 기준, 이 저장소에 없는 경로도 포함).

현재 등록 범위는 독립 HTML, 핵심 소스 3개, 규칙 및 검증 문서이다. 전체 ZIP의 서버 PHP, 서버 동기화 코드, 자동 시험 코드·로그·이미지는 아직 미등록이다. 원본 ZIP을 별도 보존한다.

## 개발 원칙

- 신규 기능보다 기존 기능 완성도, 최소 조작, 데이터 무결성 우선.
- 결함 재현 → 수정 → 회귀 시험 → 커밋 → 원격 확인.
- 실제 와콤, 장시간 필기, 영구 저장, 운영 서버는 미검증. 간헐적 획 누락은 미해결로 관리한다.
- v29: 전체 배경 출력 및 데이터 복구. v30: 종합 적대적 검증.
- GitHub는 버전 관리용. WordPress·NAS 연동 및 GitHub Pages 운영 배포 보류.
