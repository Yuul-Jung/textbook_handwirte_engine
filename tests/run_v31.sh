#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
out=tests/v31/regression; mkdir -p "$out"
run(){ local n=$1;shift; "$@" > "$out/$n.log" 2>&1; local rc=$?; echo "$rc" > "$out/$n.exit"; printf '%s %s\n' "$n" "$rc"; }
for f in tests/*.cjs; do if [[ $f == tests/test_state.cjs ]]; then run test_state bash -c 'cd tests && node test_state.cjs'; else run "$(basename "$f" .cjs)" node "$f"; fi; done
run test_plugin php tests/test_plugin.php
run test_server php tests/test_server.php
for f in tests/test_{shape_ui,highlight_ui,page_ink,ux_v24,adversarial_v25,coordinates_v26,restore_v26,wp_frame,server_browser,input_v27,access_v28,standalone_v31,output_recovery_v30,capture_v30,external_v31}.py; do run "$(basename "$f" .py)_browser" python "$f"; done
for i in {1..1}; do run stress_$i python tests/test_input_stress_v30.py "$i"; done
run js_syntax node --check yja-annotation-pilot/lesson/annotation/annotation.js
if grep -Lx 0 "$out"/*.exit | grep -q .; then exit 1; fi
