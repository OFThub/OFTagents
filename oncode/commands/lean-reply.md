---
name: lean-reply
description: Control the lean-reply switch, which keeps replies dense instead of long. Usage: /oncode:lean-reply [--open|--close|--status]
---

# /oncode:lean-reply

Argument: `$ARGUMENTS` (defaults to `--status`).

| Given | Run |
|---|---|
| `--open` | `node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --reply-open` |
| `--close` | `node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --reply-close` |
| `--status`, or nothing | `node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --status` |
| anything else | Report the valid options and stop. Do not guess |

The script's own flags are namespaced (`--reply-open`) because one script drives both
switches; this command maps the user-facing `--open` / `--close` onto them. Report what
the script printed and stop — there is nothing else to do in this command.

**This command is the off-switch.** It must keep working when the directive is active,
so it forwards and reports, nothing more.
