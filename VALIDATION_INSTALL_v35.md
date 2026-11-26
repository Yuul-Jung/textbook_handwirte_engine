# v35 사용자 스크립트 설치 경로
- v34 확장 프로그램의 ZIP/압축해제/폴더 지정 대신 공식 스토어의 Tampermonkey를 최초 한 번 설치하고 GitHub Pages의 버전 지정 .user.js 링크를 통해 설치한다.
- 실행 범위: https://yuul-jung.github.io/*, 상위 문서만. 브라우저 스크립트 관리자 권한 GM_addStyle, GM_registerMenuCommand만 사용. 외부 실행 코드 요청 없음. NAS 허용 목록은 아직 적용하지 않았다.
- v34 bridge, CSS, config, core를 그대로 묶고 키보드 및 관리자 메뉴 진입점을 추가했다. 기존 교재 저장소 수정 없음.
- node --check 통과.
- Chromium에서 완성된 사용자 스크립트를 로딩하고 GM API, 저장소 및 필요한 해시 경로를 모의 처리한 UI 시험: 11/11 통과.
```
PASS initial no UI or config
PASS keyboard activation
PASS one UI
PASS host unchanged
PASS stroke saved
PASS keyboard off
PASS original controls
PASS keyboard on again
PASS data unchanged
PASS no duplicate after five cycles
PASS menu fallback off
```
- 실제 Tampermonkey 설치 확인 화면, sandbox 권한 및 동작, HTTPS 응답, 영구 저장, NAS/iframe, 와콤 실사용은 미검증. Chrome은 웹 스토어 외 확장 프로그램 직접 설치를 제한하므로 정식 스토어 등록 전에는 관리자 설치가 필요하다.
- 원본 시험 스크립트 Git blob SHA: d40c4db27a3a780f13ed103741a4e056c5d2bdea.
