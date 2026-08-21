# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-08-20

### Fixed

- `--review`, `--advise` and `--auto` were documented in `ideal-prompt/SKILL.md` and the
  README but were never handled by `runFlags`, so all three answered "unknown flag". The
  flag surface is now derived from `config.modes` instead of being kept by hand in two
  places, and a test calls every advertised flag to prove none falls through.
- `oncode` had no `commands/` directory, so the documented escape hatch
  `/oncode:ideal-prompt --close` relied entirely on the skill name resolving as a slash
  command. Both switches now ship a thin command that forwards to the script.

### Changed

- `ideal-prompt` is loaded lazily. The hook injection carries the three triage checks
  (`triageDirective`) instead of ordering a skill load, so a prompt that is already
  anchored, bounded and verifiable never opens the ~2400-token `SKILL.md`. The injection
  grows ~19 tokens per prompt in exchange; break-even is around 125 optimised prompts in a
  session, and a prompt that fails triage pays both. An expected gain, not a guaranteed one.
- `mdfile`'s targeted mode moved to `references/targeted-mode.md`. It is dead weight on
  every ordinary invocation, and `SKILL.md` shrank from 10,331 to 8,759 characters.
- The combined `UserPromptSubmit` injection budget moved 560 -> 640 characters to fit the
  triage line; the measured worst case is 619.
- `precode`'s `SessionStart` injection gained a ceiling (`CONTEXT_BUDGET_CHARS`, 1000) and a
  test. It fires once per conversation, so this guards against growth rather than saving
  tokens today.
- Both plugins are 0.2.0. They were both 0.1.0 while shipping materially different content
  from the 0.1.0 already in the plugin cache, which made the version number meaningless.

### Added

- `runFlags` takes an injectable writer, so the whole flag surface is testable without
  touching the disk - the same dependency-injection rule the rest of the module follows.

## [0.1.0] - 2026-08-19

### Added

- `oftagents` marketplace catalog with relative plugin sources.
- `precode` plugin 0.1.0 — `PreToolUse` gate on `Write|Edit` that denies the first code
  write into a project with no documentation baseline.
- `mdfile` skill — detects missing documentation, profiles the project before asking
  anything, and generates each document against its published standard.
- `SessionStart` check — on a fresh conversation in an undocumented project, precode asks
  the user **once** whether to create the baseline. Declining silences both the question and
  the gate for that session; the marker lives in the OS temp directory, never in the project.
  Fires only on `startup` and `clear`: re-asking after `resume` or `compact` would repeat a
  question the user already answered.
- `/precode:docs` command with `check`, `init`, `later`, `skip` and `unskip`.
- Shared `config/required-docs.json` so the gate and the skill can never disagree about
  which documents are required.
- Document templates for the core, open-source and complex tiers.
- `oncode` plugin 0.1.0 — `UserPromptSubmit` hook plus the `ideal-prompt` skill, which
  rewrites a submitted prompt into the form Claude Code executes with the fewest tokens.
  The prompt's own length is not the target: the trajectory it causes is. Rules are grouped
  by the surface they cut — trajectory (15k-120k), structure (2k-20k), and output (5k-40k at
  ~5x the input price).
- `lean-reply` skill — the output-side counterpart, on the surface that costs ~5x the input
  rate and is resent on every later turn. Answer first, no preamble, cite `path:line` instead
  of pasting code already written to a file. It never overrides an explicit request or an
  active output style, and it carries a completeness floor: failures, assumptions, risks and
  skipped scope are never dropped to save words.
- Second, independent switch in the shared state file (`replyOpen`), shipped open. The two
  switches run through one `UserPromptSubmit` hook and one Node process rather than two.
- `replyDirective` in `config/prompt-rules.json` — the operative rule travels inside the
  hook injection instead of pointing at the skill file, because loading ~1.5k tokens of
  `SKILL.md` on every prompt would cost more than the skill saves.
- A persistent switch for `ideal-prompt`: `--open` routes every later prompt through the
  skill, `--close` stops it until reopened. Three output modes — `--review`, `--advise`,
  `--auto` — and `--language` for the language of generated code artifacts. State lives in
  the user's Claude home, never in the project.
- Context-pressure measurement: the hook stats the transcript file and suggests `/compact`
  or `/clear` past a threshold. It never runs either — a hook cannot execute a slash command,
  and compaction is destructive.
- Shared `oncode/config/prompt-rules.json` so the hook and the skill can never disagree
  about modes, bypasses or thresholds.
- `ideal-prompt` now ships **open**: after install, every non-bypassed prompt is routed
  through the skill. `/oncode:ideal-prompt --close` opts out and the choice persists across
  sessions. The shipped default is `defaultOpen` in the config, not a constant in the code.
- A missing or corrupt state file now falls back to that configured default instead of being
  treated as closed. Only an explicit boolean counts as a decision, so `--close` survives while
  a truncated file no longer silently disables the feature. The process-level fail-safe is
  unchanged: if the script throws, the hook exits 0 and the prompt passes untouched.
- `oncode/bench/` - a measurement harness that runs a raw prompt and its ideal-prompt
  rewrite through `claude -p --output-format json` and reads the real `usage` numbers back,
  against a fixture with a planted bug and an objective pass/fail check. Measured on Sonnet 5:
  output tokens -64%, turns 36 -> 14, cost -28% across three cases, with both bugfix arms
  verified as actually fixing the bug.
- The benchmark runs with hooks and MCP disabled. With them live, this repository's own
  plugins invalidated the measurement: the `precode` gate denied every `Edit` in the fixture,
  and `oncode`'s own `UserPromptSubmit` hook injected its instruction into the raw arm too.
  `permission_denials` is now recorded per run and surfaced as a warning.
- Nine further templates: `SUPPORT.md`, `GOVERNANCE.md`, `LICENSE.md`, `AGENTS.md`,
  `.github/copilot-instructions.md`, and the Claude Code native set — `CLAUDE.local.md`,
  `MEMORY.md`, `SKILL.md` and `.claude/rules/<topic>.md`. 21 templates in total.
- Targeted mode for `mdfile`: `--CODE_OF_CONDUCT`, `--security`, `--RULES testing` and so
  on operate on a single document, creating it when absent and **improving rather than
  overwriting** it when present. Names resolve through one table in `doc-catalog.md`,
  case-insensitively and ignoring `-`, `_` and a trailing `.md`.
- Community health files for the repository itself, generated by `mdfile`:
  `CONTRIBUTING.md`, `SECURITY.md` (with a threat model), `CODE_OF_CONDUCT.md`, and
  `.github/` issue and pull request templates.
- Unit suite for the gate (`node:test`, no framework, filesystem injected).
