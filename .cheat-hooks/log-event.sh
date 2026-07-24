#!/usr/bin/env bash
# log-event.sh — AHE PostToolUse / UserPromptSubmit / SessionEnd hook
# Appends structured event to harness-events.jsonl
# Async execution — silent failure only
# Args: $1 = event_type (tool_use | user_prompt | session_end)

set +e

EVENT_TYPE="${1:-unknown}"
HARNESS_DIR="${CLAUDE_PROJECT_DIR:-.}/.cheat-hooks"
LOG_FILE="$HARNESS_DIR/harness-events.jsonl"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# On first run, dump env var names for discovery
ENV_DEBUG="$HARNESS_DIR/.env-debug"
if [ ! -f "$ENV_DEBUG" ]; then
    env | grep -i "^CLAUDE_" | sort > "$ENV_DEBUG" 2>/dev/null || true
fi

case "$EVENT_TYPE" in
    tool_use)
        TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
        # Only log Edit and Write — they modify files
        case "$TOOL_NAME" in
            Edit|Write)
                # Extract file_path from JSON tool input (minimal parsing)
                TOOL_INPUT="${CLAUDE_TOOL_INPUT:-{}}"
                FILE_PATH=$(echo "$TOOL_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
                if [ -z "$FILE_PATH" ]; then
                    FILE_PATH="unknown"
                fi
                cat >> "$LOG_FILE" << EOF
{"type":"tool_use","ts":"$TIMESTAMP","tool":"$TOOL_NAME","file":"$FILE_PATH","session_id":"${CLAUDE_SESSION_ID:-}"}
EOF
                ;;
            *)
                # Skip non-Edit/Write tools to keep log lean
                ;;
        esac
        ;;

    user_prompt)
        PROMPT="${CLAUDE_USER_PROMPT:-}"
        PROMPT_LEN=${#PROMPT}
        # Log length only — never log prompt content (privacy + storage)
        cat >> "$LOG_FILE" << EOF
{"type":"user_prompt","ts":"$TIMESTAMP","prompt_len":$PROMPT_LEN,"session_id":"${CLAUDE_SESSION_ID:-}"}
EOF
        ;;

    session_end)
        EXIT_CODE="${1:-0}"
        cat >> "$LOG_FILE" << EOF
{"type":"session_end","ts":"$TIMESTAMP","session_id":"${CLAUDE_SESSION_ID:-}"}
EOF
        # Clean up current-session pointer
        rm -f "$HARNESS_DIR/.current-session" 2>/dev/null || true
        ;;

    *)
        # Unknown event type — log it anyway for debugging
        cat >> "$LOG_FILE" << EOF
{"type":"$EVENT_TYPE","ts":"$TIMESTAMP","session_id":"${CLAUDE_SESSION_ID:-}"}
EOF
        ;;
esac

exit 0
