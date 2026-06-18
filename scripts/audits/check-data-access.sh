#!/usr/bin/env bash
# Phase 1C — Batch A audit script (official Gate)
# Counts direct Supabase client usage inside UI layers (src/components, src/pages)
# and createClient() outside src/integrations/**.
# Uses multiline-aware Python regex (NOT single-line rg) to catch:
#     supabase
#       .from('x')
# A hit is "justified" only when the same line or the immediately preceding line
# carries the marker `// repo-exception: <category>` AND the file appears in
# docs/architecture/data-orchestration-batchA.md exceptions table.
# Exits non-zero on any unjustified hit.

set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

python3 - <<'PY'
import os, re, sys, glob

ROOTS = ['src/components', 'src/pages']
INTEGRATIONS = 'src/integrations'
DOC = 'docs/architecture/data-orchestration-batchA.md'

# Multiline-aware pattern: supabase  .  from|rpc|storage|channel  (  or  .
METHOD_PAT = re.compile(r'supabase\s*\.\s*(from|rpc|storage|channel)\s*[\(\.]', re.MULTILINE | re.DOTALL)
CC_PAT = re.compile(r'\bcreateClient\s*\(')
EXC_MARKER = re.compile(r'//\s*repo-exception\s*:\s*(\w+)')

# Allowed exception categories (closed list)
ALLOWED = {'auth', 'realtime', 'storage', 'edge'}

# Build approved-exception file set from the doc (if present)
approved = set()
if os.path.exists(DOC):
    with open(DOC) as f:
        for line in f:
            m = re.match(r'\|\s*`([^`]+\.(?:tsx?|jsx?))`\s*\|.*Exception', line)
            if m:
                approved.add(m.group(1))

def iter_files(root, exts=('.ts','.tsx','.js','.jsx')):
    for dirpath, _, files in os.walk(root):
        for fn in files:
            if fn.endswith(exts):
                yield os.path.join(dirpath, fn)

unjustified = []
exceptions_used = []

def line_of(text, pos):
    return text.count('\n', 0, pos) + 1

def is_justified(text, pos, fpath):
    # Look at the matched line AND the line before it for the marker.
    ln = line_of(text, pos)
    lines = text.split('\n')
    window = '\n'.join(lines[max(0, ln-2):ln])
    m = EXC_MARKER.search(window)
    if not m:
        return False, None
    cat = m.group(1).lower()
    if cat not in ALLOWED:
        return False, cat
    if fpath not in approved:
        return False, cat
    return True, cat

for root in ROOTS:
    if not os.path.isdir(root):
        continue
    for fpath in iter_files(root):
        try:
            text = open(fpath, encoding='utf-8').read()
        except Exception:
            continue
        for m in METHOD_PAT.finditer(text):
            ok, cat = is_justified(text, m.start(), fpath)
            entry = (fpath, line_of(text, m.start()), 'supabase.' + m.group(1))
            if ok:
                exceptions_used.append((*entry, cat))
            else:
                unjustified.append(entry)

# createClient outside src/integrations
for root in ROOTS + ['src/lib', 'src/hooks']:
    if not os.path.isdir(root): continue
    for fpath in iter_files(root):
        if fpath.startswith(INTEGRATIONS + os.sep): continue
        try: text = open(fpath, encoding='utf-8').read()
        except: continue
        for m in CC_PAT.finditer(text):
            unjustified.append((fpath, line_of(text, m.start()), 'createClient'))

print(f"Roots scanned: {ROOTS}")
print(f"Approved exception files from doc: {len(approved)}")
print(f"Justified exception hits: {len(exceptions_used)}")
print(f"Unjustified hits: {len(unjustified)}")
if unjustified:
    print("\nUNJUSTIFIED DIRECT DATA-ACCESS HITS:")
    from collections import defaultdict
    by_file = defaultdict(list)
    for f, ln, kind in unjustified:
        by_file[f].append((ln, kind))
    for f in sorted(by_file):
        for ln, kind in by_file[f]:
            print(f"  {f}:{ln}  {kind}")
    sys.exit(1)
print("\nOK: zero unjustified direct data-access hits.")
PY
