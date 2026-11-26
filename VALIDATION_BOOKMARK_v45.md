# v45 Acrobat-inspired direct text editing

Reference: Adobe Acrobat official documentation — https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/review-documents/add-textbox-comments.html ; https://helpx.adobe.com/acrobat/desktop/edit-documents/edit-text-in-pdfs/add-text.html ; https://helpx.adobe.com/in/acrobat/desktop/share-and-review-documents/manage-comment-preferences/set-textbox-options.html .

- 기존 모달 입력창을 교재 위 인라인 textarea로 대체. T/텍스트, 위치 클릭, 바로 입력, 바깥 클릭 또는 완료/Ctrl+Enter로 확정, Esc/취소로 변경 취소. 입력이 끝나면 편집 모드와 해당 주석 선택 상태로 자동 전환.
- 선택 주석 옆 수정/삭제 버튼. 더블클릭 수정, 박스 내부 드래그 이동, 기존 모서리 핸들 비례 확대/축소, Delete/Backspace 개별 삭제. 빈 기존 주석 확정은 삭제, 빈 신규 입력은 생성하지 않음. 변경 및 삭제는 실행 취소/복원 대상.
- 텍스트 500자/최대 8줄, 자동 줄바꿈, 원문 sourceText 선택 필드 유지, 글꼴 크기 선택, 기존 색상/불투명도 유지. 입력창은 글자 명도에 따른 배경 대비 적용. SVG textContent 사용. 저장 키/스키마 유지. 기존 주석 읽기 가능. 이전 버전은 sourceText를 보존하지 않을 수 있으므로 다운그레이드 전 백업.
- 기존 교재 DOM 변경 없음. 고정 북마클릿 주소, v44 디자인, v42 슬라이딩 유지.
- 로컬 Chromium Playwright 총 75/75: 색상 23, 레이아웃 11, 슬라이딩 15, 직접 주석 26. node --check 통과. 합성 교재, 모의 저장소/필요시 보안 컨텍스트와 해시 사용. 새 코드와 원격 blob SHA 일치.
- 실제 한글 IME(합성 composition 이벤트만 시험), 물리 와콤, NAS, 전체 외부 교재, 출력, 실제 브라우저 영구 저장 및 전체 과거 회귀 시험군 미검증. 글상자 핸들은 비례 확대/축소이며 Acrobat처럼 폭만 바꾸어 원래 글자 크기로 재배치하는 기능은 아직 구현하지 않음. 기존 글자 편집은 한 주석 전체 단위로 처리(부분 글자별 스타일 없음).
- 검증 대상 ed46e1f5259e8ad8cb42b08101e1e28eecaaf4e2. 시험 요약 tests/bookmark-v45.log.
