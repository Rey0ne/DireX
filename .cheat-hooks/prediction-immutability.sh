#!/usr/bin/env bash
# prediction-immutability.sh — AHE PreToolUse hook for Edit|Write
# Checks whether target file is a harness component.
# If so: warns if no change manifest exists (advisory for MVP).
# If manifest exists with Status=applied: blocks edits to prediction sections.
# Sync execution, 3s timeout. Exit 0=allow, 1=block.

set +e

TOOL_INPUT="${CLAUDE_TOOL_INPUT:-{}}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Extract file_path from JSON tool input (minimal — handles both Edit and Write)
FILE_PATH=$(echo "$TOOL_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

if [ -z "$FILE_PATH" ]; then
    # Could not parse file_path — fail open (don't block legitimate edits)
    exit 0
fi

# ── Check: is this a harness file? ──

HARNESS_FILE=0

# Normalize path (handle Windows backslashes → forward slashes, strip ./ prefix)
NORMALIZED=$(echo "$FILE_PATH" | tr '\\' '/' 2>/dev/null || echo "$FILE_PATH")
NORMALIZED="${NORMALIZED#./}"

case "$NORMALIZED" in
    CLAUDE.md|CLAUDE-backend.md|CLAUDE-frontend.md|CLAUDE-contract.md)
        HARNESS_FILE=1 ;;
    memory/*.md|memory/*/*.md)
        HARNESS_FILE=1 ;;
    .claude/settings.json|.claude/settings.local.json)
        HARNESS_FILE=1 ;;
    .claude/skills/*.md|.claude/skills/*/*.md)
        HARNESS_FILE=1 ;;
    .claude/harness/*.md|.claude/harness/*/*.md)
        HARNESS_FILE=1 ;;
    .cheat-hooks/*.sh)
        HARNESS_FILE=1 ;;
    .claude/agents/*.md|.claude/agents/*/*.md)
        HARNESS_FILE=1 ;;
    *)
        # Also check if it starts with .claude/harness/manifests/
        case "$NORMALIZED" in
            .claude/harness/manifests/*.md)
                HARNESS_FILE=1 ;;
        esac
        ;;
esac

if [ "$HARNESS_FILE" -eq 0 ]; then
    # Not a harness file — allow
    exit 0
fi

# ── Check for change manifest ──

MANIFEST_DIR="$PROJECT_DIR/.claude/harness/manifests"

if [ ! -d "$MANIFEST_DIR" ]; then
    # No manifest directory exists yet — warn but allow (MVP advisory mode)
    echo "AHE: ⚠️  '$FILE_PATH' is a harness component. No change manifests directory found." >&2
    echo "AHE: Consider creating .claude/harness/manifests/ with a manifest before editing harness files." >&2
    exit 0
fi

# Find most recent manifest that mentions this file
MATCHING_MANIFEST=""
for m in "$MANIFEST_DIR"/*.md; do
    [ -f "$m" ] || continue
    # Skip template
    [ "$(basename "$m")" = "_TEMPLATE.md" ] && continue
    if grep -q "$NORMALIZED" "$m" 2>/dev/null; then
        MATCHING_MANIFEST="$m"
        # Keep last one found (most recent by glob order)
    fi
done

if [ -z "$MATCHING_MANIFEST" ]; then
    # No manifest for this file — warn but allow (MVP advisory mode)
    echo "AHE: ⚠️  '$FILE_PATH' is a harness component but has no change manifest." >&2
    echo "AHE: Create one at: .claude/harness/manifests/$(date +%Y-%m-%d)-<slug>.md" >&2
    echo "AHE: (Advisory only — edit allowed. This will become mandatory in Phase 2.)" >&2
    exit 0
fi

# ── Check: is manifest status "applied" and is this edit touching predictions? ──

MANIFEST_NAME=$(basename "$MATCHING_MANIFEST")
# Manifest uses markdown table: | Status | applied | or YAML: Status: applied
STATUS=$(grep -iE "\|.*Status.*\||^Status:" "$MATCHING_MANIFEST" 2>/dev/null | head -1)

if echo "$STATUS" | grep -qi "applied\|verified"; then
    # Check if the edit appears to modify prediction sections
    OLD_STRING=$(echo "$TOOL_INPUT" | sed -n 's/.*"old_string"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

    # Simple heuristic: if old_string contains prediction-section markers
    if echo "$OLD_STRING" | grep -qi "Predicted Fix\|Predicted Regressions\|predicted_fix\|predicted_regression"; then
        echo "AHE: ❌ IMMUTABILITY VIOLATION. Manifest '$MANIFEST_NAME' has Status=$STATUS." >&2
        echo "AHE: The 'Predicted Fix' and 'Predicted Regressions' sections are frozen once applied." >&2
        echo "AHE: Add your findings to the '## Retro' section instead (append-only)." >&2
        echo "AHE: If the prediction was wrong, create a NEW manifest — never edit the old one." >&2
        exit 1
    fi
fi

# All checks passed
exit 0
