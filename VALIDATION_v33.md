# v33 — 독립 웹 시험 배포 검증

기준: main v32 `0795d774b91631f0bd0722c82eb05673252d4e8b`.
엔진·CSS·연결 설정·로더는 변경하지 않았다. 별도 시험 페이지와 롤백 페이지, 정적 배포용 파일, 시험 코드만 추가했다. 운영 교재 및 NAS/WordPress 변경 없음.

| 시험 | 결과 |
|---|---:|
| 로컬 실제 HTTP 파일 응답/경로/바이트/MIME/SHA-384 및 404 | 10/10 |
| Node 모의 로더 회귀 | 30/30 |
| Chromium 실제 엔진 + 모의 리소스 전달/저장 회귀 | 14/14 |
| 합계 (서로 다른 검증 항목) | 54/54 |

브라우저의 실제 HTTP 접속은 `net::ERR_BLOCKED_BY_ADMINISTRATOR`로 차단되었다. 로컬 HTTP 10건은 Python HTTP 클라이언트로 실제 서버에서 받은 바이트와 응답을 검사한 것이며 브라우저 SRI 집행이나 영구 저장 검증이 아니다. 이전 v32의 모의 브라우저 시험을 재실행한 결과도 별도로 표시했다. 실제 GitHub Pages 활성화 상태와 HTTPS 배포 확인은 별도 게이트이며 이 보고서에서는 통과로 판정하지 않는다.

실제 브라우저 시험 코드 `tests/test_pages_v33.py`를 추가했다. 실제 웹 연결이 가능한 환경에서 `python tests/test_pages_v33.py https://Yuul-Jung.github.io/textbook_handwirte_engine/`로 실행한다. Playwright 및 Chromium 설치 필요. 시험은 새 브라우저 컨텍스트에서 진행하며, 마지막 시험에서만 응답을 의도적으로 변조한다. 브라우저 시험 코드의 실행 성공은 아직 미검증이다.

로컬 웹 시험: 프로젝트 루트에서 `python -m http.server 8000 --bind 127.0.0.1` 실행 후 `http://127.0.0.1:8000/pages-test-v33/` 접속. `rollback.html`은 같은 출처의 저장 데이터 복원 시험용이다. 실제 와콤, 영구 저장, PDF 인쇄, 외부 CSS 충돌, NAS/WordPress 운영 환경도 미검증이다.

로그: `tests/v33/`.
