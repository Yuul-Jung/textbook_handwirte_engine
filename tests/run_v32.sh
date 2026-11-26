#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --check annotation-loader.js
node tests/test_loader_v32.cjs
python tests/test_loader_browser_v32.py
python tests/test_external_v31.py
for f in tests/test_{core,history,shapes,presets,grid,input_v27}.cjs; do node "$f"; done
(cd tests && node test_state.cjs)
python tests/test_capture_v30.py
python tests/test_input_stress_v30.py v32
python tests/test_output_recovery_v30.py
