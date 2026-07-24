# Change Manifest: <one-line summary>

| Field | Value |
|-------|-------|
| Manifest ID | <YYYY-MM-DD>-<slug> |
| Created | <ISO timestamp> |
| Session | <session-id> |
| Author | <model> |
| Status | proposed |

> **Status lifecycle**: `proposed` → `applied` → `verified` (predictions correct) or `refuted` (predictions wrong)
> **Immutability**: Once `Status: applied`, the Predicted Fix and Predicted Regressions sections are **frozen**.
> **Retro**: Append-only. Never edit existing retro rows — add new ones.

---

## Failure Evidence

<!-- What broke? Be specific. Cite trajectory data, session observations, or user reports. -->

- **Symptom**: <observable failure>
- **Evidence**: <trajectory reference, session N, line X>
- **Impact**: <who/what was affected, how severely>

## Root Cause

<!-- Why did it happen? Trace through dependencies using harness/index.md. -->

- **Primary cause**: <the actual bug/flaw/gap>
- **Contributing factors**: <why it was not caught earlier>
- **File(s) implicated**: <paths>

## Predicted Fix

<!-- What change will resolve the root cause? IMMUTABLE once Status=applied. -->

- **Change**: <concrete description of the edit>
- **Expected outcome**: <what should improve>
- **Files to modify**: <list of paths>

## Predicted Regressions

<!-- What could this break? IMMUTABLE once Status=applied. -->

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| <what could go wrong> | low / medium / high | <how we guard against it> |

## Files Modified

<!-- Actual list of files changed and the specific change. Fill in after applying. -->

- `<path>`: <description of what changed>

---

## Retro

<!-- Fill in after 2+ sessions of use. APPEND-ONLY — never edit existing rows. -->

| Date | Session | Verdict | Evidence | Notes |
|------|---------|---------|----------|-------|
| — | — | — | — | pending validation |
