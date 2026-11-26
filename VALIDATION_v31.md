# v31 품질 검증 — 외부 교재 연결 및 원본 불변성

## 결과
- 원격 기준 main: `8b294e077c4e801800c7bbd710be3a94ab984665` (v30).
- 동일 Chromium 합성 외부 교재 시험: v30 16/25 → v31 25/25. 원본 HTML, CSS 구조 선택자, 본문·주변 요소의 위치/크기, 코드 복사 핸들러, 목차 링크, 폼, 상세 접기, 스크롤, 페이지/절/백지 판서, 설정 오류 시 비활성화, 중복 초기화 검증.
- 전체 25개 실행 프로그램, 527/527 검증 항목 (기존 일반 회귀 495, 신규 외부 시험 25, 혼합 입력 7). 반복 입력 100/100획(마우스 50, CDP 모의 펜 50)은 7항목에 포함되어 있어 중복 합산하지 않는다. JS 2개 및 PHP 문법 검사 별도 통과.
- 순차 전체 실행은 실행 시간 제한으로 중단되어 완료된 13개 프로그램을 보존하고 나머지 12개를 개별 그룹으로 실행했다. 최종 25개 종료 코드 모두 0. `tests/v31/regression/*.log`, `*.exit`, `tests/v31/baseline.log`, `tests/v31/stress_metrics.json`.

## 수정 범위
- `annotation-config.js`: `external:true` 및 `pageInk:true` 설정에 대해 기존 유효성 검사 후 원본 host/anchor 속성을 추가하지 않고 설정 script 객체에 검증된 참조를 보관한다.
- `annotation.js`: 외부 모드에서 기존 host의 class/attribute/children을 변경하지 않는다. 백지·임시 출력 공간은 본문 외부에서 관리하고 페이지 오버레이를 사용한다. 원래 절 ID를 앵커로 사용한다. 읽기 모드에서 본문 단축키 가로채지 않음(도구 모음 자체에 포커스가 있을 때 제외). 입력 컨트롤 보호 범위 확장. 중복 초기화 및 지원하지 않는 body/root 좌표 환경 차단. 기존 설정/스키마/키/CSS 유지.
- 기존 방식은 유지한다. 외부 모드는 명시적으로 선택한다. 예제 `annotation_external_v31.html`; `annotation_course_v31.html`은 기존 방식 호환 시험본이다.

## 제한 및 미검증
- 본문 하위 트리 불변성은 합성 교재에서 검증했으며 전체 document DOM 무변경을 보장하는 것은 아니다. 도구 모음/레이어/백지는 body에 추가되므로 body 직계 자식 구조에 의존하는 CSS, 전역 스타일/이벤트 충돌, SPA의 본문 교체, 임의 외부 웹페이지는 별도 검증이 필요하다. 외부 모드에서는 body/root의 position, transform, perspective, filter, contain, will-change, zoom을 제한한다.
- 합성 코드 복사 핸들러 검증은 실제 시스템 클립보드 권한 시험과 다르다. 실제 물리 와콤, 장시간 필기, 영구 저장, PDF 인쇄, Firefox/Safari, 운영 GitHub Pages/WordPress/NAS는 미검증. 모의 저장소 및 PHP/WP/SQL 모의 시험을 운영 환경 검증으로 간주하지 않는다.
- 기존 실제 교재 및 운영 환경은 변경하지 않았다. v32 공통 로더/호환성 검증 후 운영 연동 여부를 판단한다.
