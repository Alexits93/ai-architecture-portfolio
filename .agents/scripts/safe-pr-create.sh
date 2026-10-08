#!/bin/bash
# Deterministic PR Creation Safeguard
set -e

BODY_FILE=$1
if [ -z "$BODY_FILE" ]; then
  echo "Usage: bash .agents/scripts/safe-pr-create.sh <body-file> [additional gh pr create args...]"
  exit 1
fi

if [ ! -f "$BODY_FILE" ]; then
  echo "ERROR: Body file '$BODY_FILE' does not exist."
  exit 1
fi

BODY=$(cat "$BODY_FILE")

# 1. Traceability Check (Linked Tickets)
if ! echo "$BODY" | grep -Eqi "(Closes|Fixes|Resolves)\s+#[0-9]+"; then
  echo "SAFEGUARD BLOCKED: PR body must contain a valid issue link (e.g., 'Closes #123'). Found:"
  echo "$BODY"
  exit 1
fi

# 2. Template Artifacts Check
if echo "$BODY" | grep -q '<!-- A concise explanation'; then
  echo "SAFEGUARD BLOCKED: PR body still contains HTML comments from the template. Please remove them."
  exit 1
fi

# 3. Pre-Merge Checklist Verification
if ! echo "$BODY" | grep -q '\[x\] Tests passed' && ! echo "$BODY" | grep -q '\[x\] FSD / Architectural boundaries respected'; then
  echo "SAFEGUARD BLOCKED: PR body must complete the Pre-Merge Checklist (e.g., check '[x] Tests passed')."
  exit 1
fi

# 4. Metacognition & Risks Verification
if ! echo "$BODY" | grep -q "## Unverified Risks & Metacognition"; then
  echo "SAFEGUARD BLOCKED: PR body is missing the '## Unverified Risks & Metacognition' section."
  exit 1
fi

if echo "$BODY" | grep -A 5 "## Unverified Risks & Metacognition" | grep -Eqi "\-\s+(None|N/A|Nothing|100%|TBD|)$"; then
  echo "SAFEGUARD BLOCKED: Metacognition failure. You claimed no risks or left the section blank. You MUST explicitly list the 15-20% unknowns (e.g., a11y, cross-browser quirks)."
  exit 1
fi

echo "Safeguard passed! Creating PR..."
gh pr create --body-file "$BODY_FILE" "${@:2}"
