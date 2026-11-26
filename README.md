# 전자교재 판서 엔진 v32 — 공통 로더 및 버전 호환성

- `annotation_external_v32.html`: 기존 교재와 JSON 설정 + 공통 로더 연결 예제.
- `annotation-loader.js`: 고정 버전 로딩(CSS → 설정 → 엔진), SHA-384 SRI, 중복 방지 및 실패 상태 관리. 기존 플러그인과 독립 HTML은 v31 유지.
- `releases/v31/`, `releases/v32/`: 핵심 파일 3종의 고정 릴리스. v32의 엔진 자체는 v31과 동일.
- 최초 교재 연결: 기존 JSON 설정(`external:true`, `pageInk:true`)과 아래 한 줄을 넣는다. 기존 HTML의 위치에 맞게 로더 경로를 조정한다.

```html
<script src="annotation-loader.js" data-yja-release="v32" defer></script>
```

- 롤백: `data-yja-release="v31"`로 변경하고 페이지를 다시 연다. 출처와 교재 ID 유지, 사전 JSON 백업 권장. HTTP(S) 필요; file:// 직접 실행은 기존 v31 독립 HTML 사용. 교차 출처는 CORS 허용 필요. 자동 최신 버전 추적 금지.
- 개발 확인: `node tests/test_loader_v32.cjs`, `python tests/test_loader_browser_v32.py`. 상세 `VALIDATION_v32.md`, `ANNOTATION_STANDARD_v32.md`.
- 실제 운영 배포 보류. 실제 HTTP(S) 시험은 환경 정책으로 차단되어 모의 네트워크/저장 시험과 구분한다.

# 전자교재 판서 엔진 v31 — 외부 연결 및 원본 불변성

- 신규 외부 연결 시험: `annotation_external_v31.html` (`external:true, pageInk:true`).
- 기존 연결 시험: `annotation_course_v31.html`.
- 검증: `VALIDATION_v31.md`, `tests/test_external_v31.py`, `tests/run_v31.sh`.
- 기존 교재와 운영 환경은 변경하지 않음. 외부 모드의 지원 조건과 제한은 검증 문서 참조.

# 전자교재 판서 엔진 v30 — 입력 안정성 및 종합 검증

관리자 전용 시험 플러그인. 실제 WordPress·Sensei LMS·MariaDB·DS920+ 검증 전 운영 설치 금지. PHP 7.4+/WordPress 6.2+ 설계 기준이며 현재 CLI PHP 8.4만 검증했다.

## v30 독립 시험 (현재 개발 버전, 운영 배포 보류)

- `annotation_course_v30.html` 실행. 이전 판서는 먼저 JSON 백업. 같은 저장 키/스키마를 유지하되 브라우저의 출처·파일명별 저장소 분리를 주의한다.
- 접촉 중 포인터 캡처 상실과 실제 입력 취소를 분리한다. 유효한 정상 종료에서 한 번만 저장한다. 기존 UI·CSS·도형·출력·복구 동작 유지.
- 신규 재현 시험 v29 8/12 → v30 12/12. 기존 459/459, 출력·복구 24/24, 반복 입력 700/700(단독 5회, 동시 2회), 반복 검증 항목 49/49. 정적 불변성 6/6. 실제 와콤, 물리 장치 지연, 실제 영구 저장, 운영 서버는 미검증.
- 재시험: `bash tests/run_v30.sh`. 동시 시험: `python tests/test_input_stress_v30.py concurrent_a` 및 `concurrent_b`를 별도 프로세스로 실행. 실제 영구 저장 시험: `python tests/test_persistence_v30.py` (이 환경은 접근 차단).
- 상세: `VALIDATION_v30.md`, `ANNOTATION_STANDARD_v30.md`, `tests/v30/`. GitHub는 버전 관리만 수행한다.

## v29 독립 시험 (이전 버전)

- `annotation_course_v29.html`을 브라우저에서 연다. 이전 파일의 판서는 먼저 JSON으로 백업한다. 브라우저 저장소는 파일명/출처에 따라 분리될 수 있다.
- 출력 → 전체 배경 · 여백 포함 → 미리보기 생성. 절별 출력과 원본만 출력도 유지한다. 내부 스크롤 영역은 화면 상태 그대로이며 외부 리소스 및 미지원 요소는 제한된다.
- 저장 손상 시 오류 원본 백업 → 정상 JSON 불러오기. 원본 별도 보존을 확인하고 복구한다. 이전 오류 보존 레코드가 다르면 안전상 중단한다.
- 신규 24/24, 기존 비반복 검증 459/459. 반복 입력 최초 99/100, 재시험 100/100: 미해결 결함으로 유지. 실제 영구 저장 시험은 브라우저 정책 차단. 상세 `VALIDATION_v29.md`.
- 재시험: `bash tests/run_v29.sh`, `python tests/test_output_recovery_v29.py`, `python tests/test_persistence_v29.py`. 후자는 실제 브라우저 저장소/loopback HTTP 접근 허용 환경 필요. PHP CLI 시험은 모형이며 운영 연동하지 않는다.

## v28 독립 시험 (이전 버전)

- `annotation_course_v28.html`을 브라우저에서 열어 시험한다. 원본 JSON은 먼저 백업한다. 파일명/경로 변경 시 브라우저의 파일별 저장 정책에 따라 기존 저장소가 자동으로 이어지지 않을 수 있다.
- G 자동 도형, I 직선, B 사각형, J 화살표, O 타원. 같은 키로 해제. 기존 P/H/E/V/A/R/L 및 1~4 유지.
- 이동 손잡이 초점에서 방향키로 12px, Shift+방향키로 48px 이동한다. 더보기는 자동으로 첫 항목을 표시한다.
- 결과 및 제한: `VALIDATION_v28.md`, `ANNOTATION_STANDARD_v28.md`, `tests/v28/`. 실제 WordPress·GitHub·NAS 연동 보류. 아래 설치 절차는 이전 시험 환경용 기록이며 현재 운영 설치 지시가 아니다.
- 재시험: `bash tests/run_v28.sh` (Node.js, PHP CLI, Python Playwright 및 `/usr/bin/chromium` 필요). 독립 HTML 저장 시험은 모형 저장소를 사용한다.

## 설치·업데이트·롤백

1. 운영 사이트가 아닌 별도 HTTPS 시험 사이트를 준비한다. WordPress, PHP, DB 버전과 HTTPS 역방향 프록시 설정을 확인한다. WordPress is_ssl()가 true여야 한다.
2. 기존 플러그인 파일과 WordPress DB 전체(판서 테이블 포함), 설정, 필요한 사용자 JSON을 백업하고 복원 시험을 한다.
3. 기존 YJA 플러그인을 비활성화한 뒤 설치용 ZIP을 업로드/교체한다. 동일 폴더명이다. 활성화 후 설정 → 전자교재 판서 시험. 활성화 hook이 테이블을 생성한다. 스키마는 v19와 동일하다.
4. 시험 레슨에 `[yja_annotation lesson="axi-led-pilot" height="850"]`을 삽입한다. 관리자만 사용 가능하다. 공개 수강생 페이지에는 아직 삽입하지 않는다.
5. 관리자 두 계정, 동일 계정 두 브라우저, 로그아웃, nonce 만료, 서버 저장 충돌, 삭제 후 오래된 세션 저장, DB 장애, 최대 8 MiB 요청, CDN/캐시 차단을 직접 시험한다. 신티크 필압 및 장시간 강의도 확인한다.
6. 문제가 있으면 쇼트코드 제거 및 플러그인 비활성화. v19는 v20의 삭제 tombstone을 이해하지 못하므로 단순 다운그레이드하지 않는다. 최신 JSON과 DB를 추가 백업하고 배포 직전 파일 및 DB 백업을 함께 복원한다(이후 변경분은 자동 병합하지 않음). 운영 적용 전 별도 복원 시험 필수.

## 사용 방법

- 서버 저장: 명시적으로 저장한다. 초기 로드 후에만 활성화된다. 미저장 판서는 별도 JSON으로 백업한다.
- 서버 불러오기: 서버 데이터로 교체한다. 변경 사항이 있으면 확인을 요구한다.
- 서버 JSON 내보내기: 확정된 서버 기록만 다운로드한다. 현재 화면의 미저장 판서는 엔진의 기존 내보내기로 백업한다.
- 서버 판서 삭제: 확인 후 저장 버전을 증가시키며 내용은 null로 교체한다. 화면의 판서와 취소/복원 이력도 비운다. 삭제 응답 전 추가 입력이 있으면 화면은 보존하고 서버 저장을 잠근다. 다른 탭/백업/DB 로그의 사본을 지우지는 않는다. 서버 기록이 없는 경우 비활성화된다.
- 세션 만료: 서버에서 401/403이 반환되면 모든 서버 버튼 잠금. 기존 내보내기로 JSON 백업하고 로그인 후 새로고침/가져오기한다. 자동 재로그인·계정 전환 감지 없음.
- DB 충돌: 409 반환. 현재 판서 JSON 백업 후 서버 불러오기. 자동 병합 없음.

## 운영 경계

- 서버 저장은 기본 인증 교재에만 적용. 사용자 ID는 WP 세션에서 취득한다. 다른 사용자 판서를 조회/삭제하는 API는 제공하지 않는다. 관리자만 허용한다. 실제 수강 권한 연동은 다음 설계 단계.
- API와 프레임은 HTTPS/권한/nonce 및 no-store 보호를 적용한다. CDN, 캐시 플러그인, 프록시에서 `admin-post.php?action=yja_annotation_frame`, `admin-ajax.php?action=yja_annotation_sync`, 시험 레슨 URL을 캐시에서 제외한다. 캐시된 응답에서 개인정보가 재사용되지 않는지 실제 검증한다. 번들 정적 교재 자체는 공개 파일이다.
- 한 교재/계정 최대 요청 8 MiB, 4,000획, 150,000점, 20백지. 서버 요청률 제한은 아직 미구현. 운영 전 웹서버/PHP/DB 요청 크기, 동시 접속과 사용자별 총량, 백업 보존 기간을 설정한다.
- 계정 삭제 시 WP deleted_user hook으로 해당 사용자의 행 삭제를 시도한다. 실패 여부를 운영에서 별도 감사한다. 백업/로그/다른 세션의 사본은 별도 관리. WP 개인정보 내보내기/삭제 도구 통합은 미구현. 비활성화/제거는 판서 테이블을 보존한다.
- 기존 v19 저장 스키마와 키 유지. 멀티사이트 미지원/미검증. 원격 GitHub 교재·NAS 설정은 변경하지 않았다.

## 재현

```bash
find yja-annotation-pilot -name '*.php' -exec php -l {} \;
find yja-annotation-pilot -name '*.js' -exec node --check {} \;
php tests/test_plugin.php
php tests/test_server.php
(cd tests; for f in test_*.cjs; do node "$f" || exit 1; done)
python tests/test_wp_frame.py
python tests/test_server_browser.py
```

모의 WP/SQL 및 Chromium 브라우저 모형 시험. 실환경 합격을 의미하지 않는다. 상세: VALIDATION_v20.md.

## v21 수정판 — 전체 페이지 판서
1. 기존 v20의 더보기에서 JSON 내보내기를 먼저 실행한다.
2. 별도 폴더에 v21 설치 ZIP을 풀고 `yja-annotation-pilot/lesson/index.html`을 브라우저로 연다. 또는 `annotation_course_v21.html` 단일 파일을 연다.
3. 펜 선택 후 `전체 판서` 버튼이 활성화된 상태에서 회색 여백과 절 사이를 그린다. 해당 버튼을 누르면 `절별 판서`로 전환된다.
4. 기존 JSON은 v21에서 불러올 수 있도록 기존 스키마를 유지했으나 파일 경로 변경에 따른 자동 이전은 보장되지 않는다. v21의 신규 페이지 앵커는 v20에서 열리지 않는다.
5. NAS 설치/운영 적용은 아직 하지 않는다. 절별 출력은 여백을 제외하므로 전체 판서는 JSON도 함께 보관한다.

## v22 사용법
자동 도형 버튼 선택 → 한 번에 네모 또는 선을 그리고 펜을 뗌. 축 정렬을 켜면 수평/수직 근처의 선이 정확히 정렬됨. 펜 버튼은 일반 필기, 직선/사각형 버튼은 드래그로 직접 생성. 보정 취소는 취소 버튼 1회. 기존 판서는 JSON으로 먼저 백업 권장. 실제 운영 사이트에 설치하기 전 시험할 것.

## v23 사용법 — 형광펜 도형
형광펜 → 자동 도형(자유 획 보정) 또는 직선/사각형(직접 드래그). 축 정렬을 켜면 수평·수직에 가까운 직선을 정확히 정렬한다. 형광펜 버튼을 다시 누르면 자유 모드가 된다. 기존 필기는 JSON으로 백업한다. 실제 WordPress/NAS 운영 적용은 보류한다.

## v24 사용법 — 도형/임시 도구 토글
- 직선, 사각형, 자동 도형, 화살표, 타원을 다시 누르면 해제되고 원래 펜/형광펜 자유 필기로 돌아온다. 도형 색·굵기는 현재 선택한 펜 설정을 따른다.
- 프리셋 1~4는 이전 보정 상태를 끄고 자유 필기로 전환한다. 지우개·포인터·편집·올가미를 재선택하면 최근 자유 필기로 복귀한다.
- Esc: 미완성 획 취소 → 도형/선택/임시 도구 해제 → 더보기 닫기 → 읽기 (현재 상태에 따라). 확정 획은 기존 취소 기능으로 제거한다.
- 기존 v23에서 JSON으로 백업한 후 별도 폴더에서 v24 HTML을 열어 마우스와 와콤을 시험한다. 운영 WordPress에는 아직 설치하지 않는다.
- 재현: `python tests/test_ux_v24.py` 및 `python tests/test_page_ink.py`, `python tests/test_shape_ui.py`, `python tests/test_highlight_ui.py`. 나머지 시험은 위 재현 절차 참조. 상세 결과 및 잔여 품질 게이트는 `VALIDATION_v24.md`.

## v25 최상위 적대적 검증 수정판
- 백지 개폐 시 기존 본문 판서 좌표 기준을 유지하고, 닫으면 원래 스크롤 위치로 돌아온다. 백지는 별도 좌표 영역이다.
- 전체/절별 판서 범위가 달라도 표시된 획은 편집으로 선택할 수 있다. 다중 선택의 좌표 기준은 하나의 앵커로 제한한다.
- Esc 반복 입력은 무시하며 Shift 조합의 문자 단축키를 가로채지 않는다. 마우스 버튼이 풀린 고아 드래그는 취소한다.
- 기존 판서를 JSON으로 백업하고 `annotation_course_v25.html`로 시험한다. 교재 revision과 저장 스키마는 변경하지 않았다. 운영 설치는 보류한다.
- 신규 재현: `python tests/test_adversarial_v25.py` (v25). v24 기준 비교는 같은 시험에 v24 프로젝트 디렉터리를 인자로 지정한다. 상세 `VALIDATION_v25.md`.

## v26 좌표 품질 개선
- 기존 판서를 JSON으로 백업 후 `annotation_course_v26.html`을 로컬 브라우저에서 열어 시험한다. 신규 획은 내용 배치가 그대로인 경우 화면 크기가 바뀌거나 앞쪽 절이 이동해도 해당 절을 따라 이동한다. 실제 재배치 및 내부 스크롤로 대응이 불확실하면 영향을 받는 획만 숨긴다.
- 기존 v25 판서도 원래 배치에서 읽을 수 있으나 새 좌표 추적 정책은 새로 작성하거나 편집 확정한 획에 적용한다. v25로 롤백할 때 신규 -26 판서는 표시되지 않을 수 있다. 원본 백업 보존.
- `python tests/test_coordinates_v26.py`, `python tests/test_restore_v26.py`로 신규 시험 재현. 레거시 예제 payload 포함. 상세 결과와 한계는 VALIDATION_v26.md. 운영 NAS 설치는 보류.

## v27 입력 품질 개선
- `annotation_course_v27.html`을 브라우저에서 열어 자유 펜, 형광펜, 짧은 점, 빠른 지우개, 펜과 마우스 전환을 시험한다. 기존 JSON 백업 권장. 새 버튼은 없다.
- 실행: `node tests/test_input_v27.cjs`, `python tests/test_input_v27.py`, `python tests/test_input_stress_v27.py`. v26 비교는 `python tests/test_input_v27.py /path/to/annotation_engine_v26` (의도된 실패 포함).
- 상세 시험 결과: `VALIDATION_v27.md`, `tests/v27/`. 실제 기기/영구 저장/운영 서버 검증 전 운영 설치 보류.
