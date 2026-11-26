# 전자교재 판서 단축키 v34 (브라우저 확장 시험판)

기존 GitHub Pages HTML, CSS, JavaScript를 수정하거나 재배포하지 않는다. Chrome/Chromium 확장 프로그램을 한 번 설치한 뒤, `https://yuul-jung.github.io/` 아래의 지원하는 교재에서 **Alt+Shift+Y** 또는 확장 프로그램 아이콘을 눌러 켜고 끈다. NAS 및 WordPress 연동은 보류한다.

## 우분투 설치
1. ZIP 압축을 풀고 `manifest.json`이 있는 폴더를 확인한다.
2. 브라우저에서 `chrome://extensions`를 열고 개발자 모드를 켠다.
3. 압축해제된 확장 프로그램을 로드한다. `manifest.json`이 있는 폴더를 선택한다.
4. `chrome://extensions/shortcuts`에서 단축키를 확인하거나 변경한다.
5. https://yuul-jung.github.io/ai-agent-engineering/ 에서 단축키를 누른다. 재입력하면 판서와 도구가 숨겨지고 읽기 모드로 돌아간다. 기존 필기는 삭제하지 않는다.

## 설계 범위
- 권한은 activeTab, scripting만 사용. 항상 실행되는 content script 및 외부 서버 스크립트 실행은 없음. 지원 호스트는 yuul-jung.github.io로 한정.
- v32 엔진 세 파일은 바이트 단위 그대로 포함. 페이지의 main 및 중첩되지 않은 section[id]를 요구한다. 지원하지 않는 페이지나 기존 엔진이 있는 페이지에는 삽입하지 않는다.
- 페이지 소스는 변경하지 않으며, 실행 중 브라우저 DOM에 판서 오버레이를 생성한다. 끄기는 읽기/숨김 상태로 전환하며 완전한 언마운트가 아니다. 새로고침하면 엔진은 처음부터 꺼진다.
- 판서는 기존 엔진의 브라우저 localStorage에 저장된다(사이트 출처별). URL 경로 및 쿼리와 main HTML 해시로 식별한다. 동적 본문 또는 교재 개정으로 해시가 달라지면 새 기록으로 분리될 수 있으므로 JSON 백업을 권장한다. 기존 내장 엔진에서의 저장 데이터 자동 승계는 보장하지 않는다.
- 출력 대화상자가 열려 있으면 끄기를 보류한다. 단축키 충돌은 브라우저 확장 프로그램 단축키 설정에서 확인한다.

## 검증 범위
`python tests/test_bridge.py` : Chromium에서 브리지 및 핵심 엔진의 실제 UI 동작 시험(모의 저장소/해시 대체 경로 포함). 실제 확장 서비스 워커는 시험 환경에서 시작되지 않아 단축키 등록 및 activeTab/실제 HTTPS/영구 저장/와콤은 미검증이다. 실제 운영에 적용하기 전 위 주소에서 수동 검증한다.
