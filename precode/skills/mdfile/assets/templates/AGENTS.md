<!--
AGENTS.md is the tool-neutral instructions file. Claude Code does NOT read it natively —
wire it in one of two ways:

  1. Import it from CLAUDE.md:      @AGENTS.md
  2. Or run /init, which folds existing agent instructions into CLAUDE.md.

Write it here when several agent tools share this repository and you want one source of
truth. If Claude Code is the only tool in play, put the content straight in CLAUDE.md and
skip this file — two files that must agree eventually disagree.
-->

# {{PROJECT_NAME}} — agent instructions

{{WHAT_THIS_PROJECT_IS — one paragraph, derived from the code}}

## Commands

| Task | Command |
| --- | --- |
| Install | `{{INSTALL}}` |
| Run (dev) | `{{DEV}}` |
| Test | `{{TEST}}` |
| Single test | `{{SINGLE_TEST}}` |
| Lint | `{{LINT}}` |
| Build | `{{BUILD}}` |

<!-- Copy these from the project's own scripts or build file. An invented command is
     worse than an absent one: it fails in a way that looks like the agent's mistake. -->

## Project layout

| Path | Contains |
| --- | --- |
| `{{path}}` | {{what lives there}} |

## Conventions

- {{PATTERN_OBSERVED_IN_THE_CODE}}
- {{NAMING_OR_STRUCTURE_RULE}}

## Constraints

- MUST NOT {{FORBIDDEN_THING}} — {{WHAT_BREAKS}}.
- MUST {{REQUIRED_THING}} before {{WHEN}}.

## Things that are not obvious from the code

{{TRAPS — the failure that costs a newcomer an afternoon}}
