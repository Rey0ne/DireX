#!/usr/bin/env bash
# session-start.sh — AHE SessionStart hook
# Records session metadata to harness-events.jsonl
# Silent failure: never blocks session start (exit 0 on error)

set +e

HARNESS_DIR="${CLAUDE_PROJECT_DIR:-.}/.cheat-hooks"
LOG_FILE="$HARNESS_DIR/harness-events.jsonl"
mkdir -p "$HARNESS_DIR"

# Generate session ID
SESSION_ID="${CLAUDE_SESSION_ID:-unknown-$(date +%s)}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Git context
BRANCH="unknown"
COMMIT="unknown"
if command -v git &>/dev/null; then
    BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null || echo "unknown")
    COMMIT=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --short HEAD 2>/dev/null || echo "unknown")
fi

# Write event
cat >> "$LOG_FILE" << EOF
{"type":"session_start","ts":"$TIMESTAMP","session_id":"$SESSION_ID","branch":"$BRANCH","commit":"$COMMIT"}
EOF

# Also write .current-session pointer for log-event.sh to find
echo "SESSION_FILE=$LOG_FILE" > "$HARNESS_DIR/.current-session"
echo "SESSION_ID=$SESSION_ID" >> "$HARNESS_DIR/.current-session"

exit 0
