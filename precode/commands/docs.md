---
name: docs
description: Inspect, generate, postpone, or opt out of the precode documentation baseline. Usage: /precode:docs [check|init|later|skip|unskip]
---

# /precode:docs

Manual control over the documentation gate. Argument: `$ARGUMENTS` (defaults to `check`).

Read `${CLAUDE_PLUGIN_ROOT}/config/required-docs.json` first — it is the single source of
truth for which documents count as the baseline. Never hardcode the list here.

## `check` (default)

Report status without writing anything:

1. Read the `core` list from the config.
2. Check which of those files exist in the project root (case-insensitive).
3. Check whether the opt-out state file (`stateFile` in the config) exists.
4. Check whether this session was declined — the marker is reported by
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/session-check.mjs" --decline <session_id>`; if the
   gate is open only because of a decline, say so, since it comes back next session.
4. Print a short table: each core document, present or missing; then the resulting
   gate verdict — `open` (writes allowed) or `blocking` (next code write is denied).

Do not generate anything in this mode, even if documents are missing. Report and stop.

## `init`

Invoke the `mdfile` skill and follow it end to end. Use this to generate documentation
deliberately rather than waiting for the gate to trigger.

If every core document already exists, say so and stop — `mdfile` never overwrites
existing documentation, so there would be nothing to do.

## `later`

Silence the gate for **this session only**. Use it when the user declines the question
asked at session start, or asks to be left alone for now.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/session-check.mjs" --decline <session_id>
```

The session id is in the hook payload of the current session. The marker is written to the
OS temp directory, never into the project — a per-session decision is not a repository
decision. Next session the question returns.

After running it, drop the subject: do not re-offer documentation for the rest of the
session unless the user raises it.

## `skip`

Disable the gate permanently for this project.

1. Confirm with the user first. This is the escape hatch from a hard block, and it
   silences the gate for everyone who works in the repository, not just this session.
2. Write the state file named by `stateFile` in the config (create parent directories
   as needed):

```json
{ "status": "skipped", "at": "<current UTC time, ISO 8601>", "reason": "<user's reason, or omit>" }
```

3. Tell the user the file is safe to commit — it is a team-wide decision, and committing
   it stops the gate from firing for their colleagues too.

## `unskip`

Delete the state file so the gate resumes. Confirm before deleting, then report whether
the gate is now open or blocking, using the same check as `check`.
