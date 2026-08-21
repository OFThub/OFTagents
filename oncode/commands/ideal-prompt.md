---
name: ideal-prompt
description: Control the ideal-prompt switch, or optimize one prompt on demand. Usage: /oncode:ideal-prompt [--open|--close|--review|--advise|--auto|--mode <m>|--language <tag>|--status] or /oncode:ideal-prompt <prompt text>
---

# /oncode:ideal-prompt

Argument: `$ARGUMENTS`.

## When `$ARGUMENTS` starts with `--`

Pass it straight through and report what the script printed, verbatim. Do not
interpret, repair, or guess at a rejected value.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" $ARGUMENTS
```

The script is the single authority on which flags exist — it derives the list from
`config/prompt-rules.json`, so never restate the flags from memory here.

**This command is the off-switch.** `--close` must work even when the switch is open
and everything else is misbehaving, so this file does nothing but forward the argument.

## When `$ARGUMENTS` is empty

Run `--status` and report it.

## Otherwise

`$ARGUMENTS` is prompt text. Use the `ideal-prompt` skill to optimize it, regardless of
whether the switch is open.
