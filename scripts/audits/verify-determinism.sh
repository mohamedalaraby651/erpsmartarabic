#!/usr/bin/env bash
# scripts/audits/verify-determinism.sh
# Runs each measurement audit twice and diffs the JSON output byte-for-byte.
# Excludes MANIFEST.json (it contains a timestamp by design).
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

OUT=scripts/audits/output
TMP=scripts/audits/output/.determinism

mkdir -p "$TMP"
rm -rf "$TMP"/* 2>/dev/null || true

run_all() {
  node scripts/audits/snapshot.mjs >/dev/null
  node scripts/audits/dep-graph.mjs >/dev/null
  node scripts/audits/component-inventory.mjs >/dev/null
  node scripts/audits/route-inventory.mjs >/dev/null
  node scripts/audits/data-access-classify.mjs >/dev/null
  node scripts/audits/lint-types-classify.mjs >/dev/null
  node scripts/audits/depcheck-report.mjs >/dev/null
}

echo "[determinism] run #1"
run_all
mkdir -p "$TMP/run1"
cp "$OUT"/*.json "$TMP/run1/" 2>/dev/null

echo "[determinism] run #2"
run_all
mkdir -p "$TMP/run2"
cp "$OUT"/*.json "$TMP/run2/" 2>/dev/null

FAIL=0
for f in snapshot-report.json dependency-report.json component-report.json route-report.json data-access-report.json lint-types-report.json depcheck-report.json; do
  if [ ! -f "$TMP/run1/$f" ] || [ ! -f "$TMP/run2/$f" ]; then
    echo "  MISSING  $f"; FAIL=1; continue
  fi
  H1=$(sha256sum "$TMP/run1/$f" | awk '{print $1}')
  H2=$(sha256sum "$TMP/run2/$f" | awk '{print $1}')
  if [ "$H1" = "$H2" ]; then
    echo "  OK       $f"
  else
    echo "  NON-DET  $f  ($H1 vs $H2)"
    FAIL=1
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo "[determinism] PASS (all audits reproducible)"
  exit 0
else
  echo "[determinism] FAIL — Hard Stop per UX-0 plan"
  exit 1
fi
