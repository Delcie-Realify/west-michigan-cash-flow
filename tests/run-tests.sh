#!/bin/sh
# Runs all tests with JavaScriptCore (built into every Mac - no installs needed).
# Usage (from anywhere):  sh "tests/run-tests.sh"
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
status=0

echo "== Cash-flow engine =="
"$JSC" data/assumptions.js data/millage.js js/cashflow.js tests/cashflow.test.js || status=1

echo "== MLS data adapter + HUD rents =="
"$JSC" data/hud-rents.js data/mock-listings.js js/reso-adapter.js tests/reso-adapter.test.js || status=1

exit $status
