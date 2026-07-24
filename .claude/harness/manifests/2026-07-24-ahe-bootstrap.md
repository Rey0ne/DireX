# Change Manifest: AHE Self-Evolution System Bootstrap

| Field | Value |
|-------|-------|
| Manifest ID | 2026-07-24-ahe-bootstrap |
| Created | 2026-07-24T02:40:00Z |
| Session | harness-bootstrap |
| Author | claude-opus-4-8 |
| Status | applied |

---

## Failure Evidence

- **Symptom**: DireX harness had zero automatic observability. Hook scripts referenced in `.claude/settings.json` pointed to non-existent `.cheat-hooks/` scripts. Every SessionStart, PostToolUse, UserPromptSubmit, and SessionEnd event silently failed to log anything.
- **Evidence**: Code exploration revealed 5 configured hooks with `async: true` masking the failures. `harness-events.jsonl` did not exist. Three referenced harness files were missing (`MEMORY.md`, `memory/module-map.md`, `.cheat-hooks/*.sh`).
- **Impact**: No ability to answer "did the last harness change cause this bug?" — every harness modification was untraceable. Session handoff was entirely manual and had drifted to discussing a different project (Cognition-Field).

## Root Cause

- **Primary cause**: The `cheat-on-content` framework's hook scripts were referenced in settings.json but never installed into the DireX project. The cheat-* skills at `C:\Users\ROG\.claude\skills\` implement full AHE for content creation, but the coding harness had no equivalent.
- **Contributing factors**: No automatic health check for harness integrity. Missing files (module-map.md, MEMORY.md) were referenced by 5+ files without validation. Async hook failures are silent by design — no error surfaced.
- **File(s) implicated**: `.claude/settings.json` (hook config), `CLAUDE.md` (missing references), `memory/session-handoff.md` (stale content)

## Predicted Fix

- **Change**: Create the missing `.cheat-hooks/` scripts, harness component index, manifest template, harness-evolve skill, and update CLAUDE.md with AHE observability rules.
- **Expected outcome**:
  1. All 5 hooks execute successfully (no silent failures)
  2. Session metadata, Edit/Write events, and prompts logged to `harness-events.jsonl`
  3. Harness component index provides single source of truth for all harness files
  4. Change manifest discipline enforced before harness edits
  5. CLAUDE.md 第 0.5 步 ensures every new session checks harness health
- **Files to modify**: (see Files Modified below)

## Predicted Regressions

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Hook scripts fail on Windows Git Bash (path/encoding issues) | medium | All scripts use `set +e`, fail-open (exit 0), and use bash parameter expansion instead of sed for path handling |
| `prediction-immutability.sh` blocks legitimate edits | low | MVP is advisory-only for missing manifests; only enforces immutability of already-applied predictions |
| `harness-events.jsonl` grows unbounded | low | Events are small (<200 bytes each), Edit/Write-only filtering keeps volume low. If needed, add log rotation in Phase 2 |
| CLAUDE.md grows too long with AHE section | low | AHE section is ~20 lines — negligible in a 500+ line file |

## Files Modified

- `.cheat-hooks/session-start.sh`: **NEW** — records session metadata to harness-events.jsonl
- `.cheat-hooks/log-event.sh`: **NEW** — logs Edit/Write tool use, prompt lengths, session end
- `.cheat-hooks/prediction-immutability.sh`: **NEW** — enforces manifest discipline, protects applied predictions
- `.claude/harness/index.md`: **NEW** — full harness component catalog (25 healthy, 3 stale, 0 missing, 6 new)
- `.claude/harness/manifests/_TEMPLATE.md`: **NEW** — change manifest template
- `.claude/harness/manifests/2026-07-24-ahe-bootstrap.md`: **NEW** — this manifest
- `.claude/skills/harness-evolve.md`: **NEW** — skill: diagnose → predict → apply → retro → evolve
- `CLAUDE.md`: **EDIT** — added 第 0.5 步 (harness health check) + manifest rule to 核心禁止事项

## Retro

| Date | Session | Verdict | Evidence | Notes |
|------|---------|---------|----------|-------|
| — | — | — | — | pending validation — verify after 2+ sessions that hooks log correctly and no regressions |
