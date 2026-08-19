---
name: Bug report
about: Report something that does not work as documented
title: ''
labels: bug
assignees: ''
---

## What happened

<!-- The actual behaviour. -->

## What you expected

<!-- The behaviour you expected, and where that expectation comes from
     (docs, README, previous version). -->

## Steps to reproduce

1.
2.
3.

<!-- A reproduction beats a description. For gate behaviour, the smallest reproduction
     is usually: an empty directory, the file you asked Claude to write, and what
     happened instead. -->

## Did you restart Claude Code?

<!-- Hooks load only at session start. A change that appears not to take effect is
     usually a session that has not been restarted. -->

- [ ] Yes, the session was restarted after installing or updating the plugin

## Environment

| | |
| --- | --- |
| `precode` version | |
| Claude Code version | |
| OS | |
| `node --version` | |

## Logs or error output

<!-- If the gate is involved, this reproduces its decision outside Claude Code: -->

```bash
echo '{"session_id":"debug","cwd":"/path/to/project","tool_name":"Write","tool_input":{"file_path":"/path/to/project/app.js"}}' \
  | node precode/scripts/docs-gate.mjs
```

```
```
