#!/usr/bin/env bash
# Run in a disposable copy if preserving historical preview PNG/fixture bytes matters.
set -u
cd "$(dirname "$0")/.."
out=tests/v28/recheck; mkdir -p "$out"; failed=0
run(){ local n=$1;shift; "$@" > "$out/$n.log" 2>&1; local rc=$?; echo "$rc" > "$out/$n.exit"; printf '%s %s\n' "$n" "$rc"; if ((rc)); then failed=1; fi; }
for f in tests/*.cjs; do if [[ $f == tests/test_state.cjs ]]; then run test_state bash -c 'cd tests && node test_state.cjs'; else run "$(basename "$f" .cjs)" node "$f"; fi; done
run test_plugin php tests/test_plugin.php
run test_server php tests/test_server.php
for f in tests/test_{shape_ui,highlight_ui,page_ink,ux_v24,adversarial_v25,coordinates_v26,restore_v26,wp_frame,server_browser,input_v27,access_v28,standalone_v28}.py; do run "$(basename "$f" .py)_browser" python "$f"; done
for n in 1 2 3; do run "stress_$n" python tests/test_input_stress_v28.py "recheck_$n"; done
run js_syntax node --check yja-annotation-pilot/lesson/annotation/annotation.js
run php_syntax php -l yja-annotation-pilot/yja-annotation-pilot.php
exit "$failed"
