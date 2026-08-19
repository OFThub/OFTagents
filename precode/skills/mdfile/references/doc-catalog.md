# Document catalog — each file and the standard it follows

Consult the relevant entry before writing a document. The structure is not a judgement
call: every file here has a published convention, and following it is what makes the
output recognisable to people who have never seen this project.

---

## README.md

**Standard:** Standard Readme spec · CommonMark

**Section order** (omit what does not apply — never pad):

1. `# Title` — the project name, nothing else
2. One-sentence description directly under the title. What it is, for whom. No marketing.
3. Badges — only if CI or a registry actually exists. Fake badges are worse than none.
4. `## Install` — real commands, copied from the manifest
5. `## Usage` — the smallest complete working example
6. `## Configuration` — environment variables and options, as a table
7. `## Development` — how to run tests and build locally
8. `## Contributing` — one line linking to `CONTRIBUTING.md`
9. `## License` — SPDX identifier and a link

**Rules:** The first screen must answer "what is this and should I keep reading". Any
command shown MUST be one that actually exists in the project's scripts or build file.

---

## CHANGELOG.md

**Standard:** Keep a Changelog 1.1.0 · Semantic Versioning 2.0.0

**Structure:**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ...
```

**Change groups, in this order:** `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

**Rules:** Start at `## [Unreleased]`. NEVER invent past releases — an empty Unreleased
section is honest, a fabricated `## [1.0.0] - 2024-01-01` is a lie in the repository's
permanent record. Dates are `YYYY-MM-DD`. Entries describe user-visible change, not commits.

---

## CLAUDE.md

**Standard:** Claude Code project instructions convention

**Sections:**

1. `# <Project>` — one paragraph on what the project is and its architecture in brief
2. `## Commands` — the real build, test, lint, and run commands, as a table
3. `## Architecture` — the directory map, only directories verified to exist
4. `## Conventions` — patterns actually observed in the code (naming, error handling,
   test layout), not aspirational ones
5. `## Constraints` — what an agent MUST NOT do here (files not to touch, generated
   code, deploy boundaries)

**Rules:** This file is read by every future agent session in the repository, so wrong
content is actively harmful, not merely useless. Derive every claim from the code.
Keep it short — a long CLAUDE.md is skimmed, a focused one is followed.

---

## CONTRIBUTING.md

**Standard:** GitHub community-health profile · Conventional Commits 1.0.0

**Sections:** how to report a bug · how to propose a feature · development setup ·
branch and commit conventions · test requirements before a PR · review expectations ·
Code of Conduct link.

**Rules:** State the commit convention explicitly if the git history shows one. Give the
exact test command a contributor must pass, not "run the tests".

---

## SECURITY.md

**Standard:** GitHub security policy

**Sections:**

1. `## Supported Versions` — a table of version → supported (✅/❌)
2. `## Reporting a Vulnerability` — a **private** channel: GitHub private advisory or an
   email address. Never instruct reporters to open a public issue.
3. Response expectations — acknowledgement window and fix window
4. Disclosure policy — coordinated disclosure timeline

**Rules:** Requires a real contact. If none can be derived, ask for one — a security
policy pointing at a placeholder address is a liability, not a document.

---

## CODE_OF_CONDUCT.md

**Standard:** Contributor Covenant 2.1

**Rules:** Reproduce the covenant text **verbatim**. The only substitution is the
enforcement contact. Do not paraphrase, shorten, or "improve" it — its value comes from
being the identical, recognisable text used across the ecosystem.

---

## ARCHITECTURE.md

**Standard:** arc42 (condensed) · C4 model, context and container levels

**Sections:**

1. `## Overview` — what the system does, in one paragraph
2. `## Context` — external systems, users, and integrations (C4 level 1)
3. `## Components` — the internal pieces and their responsibilities (C4 level 2)
4. `## Directory map` — a table of path → what lives there. This is the section people
   actually come for.
5. `## Key decisions` — links to `docs/adr/`
6. `## Constraints` — technical and organisational limits

**Rules:** Every path named MUST exist. A directory map that has drifted from reality is
worse than absent, because readers trust it. Diagrams: mermaid, or none.

---

## docs/adr/NNNN-title.md

**Standard:** Michael Nygard ADR format

```markdown
# NNNN. <Decision title>

Date: YYYY-MM-DD

## Status
Accepted | Proposed | Deprecated | Superseded by [NNNN](NNNN-other.md)

## Context
The forces at play. What made a decision necessary.

## Decision
What was decided, in active voice: "We will ..."

## Consequences
What becomes easier, and what becomes harder. Both — an ADR listing only
benefits is a sales pitch, not a record.
```

**Rules:** Numbered sequentially from `0001`, zero-padded to four digits. ADRs are
immutable: supersede, never edit. The first ADR conventionally records the decision to
use ADRs at all.

---

## TESTING.md

**Sections:** test layers present (unit/integration/e2e) · how to run each · how to run a
single test · what CI runs · coverage expectations · how to add a new test.

**Rules:** Include the single-test command. It is the one thing every contributor looks
up and the one thing most testing docs omit.

---

## .github/PULL_REQUEST_TEMPLATE.md

Sections: summary · type of change (checkboxes) · how it was tested · checklist (tests
pass, docs updated, no unrelated changes) · linked issue.

Keep it short. A template longer than the average PR gets deleted rather than filled.

---

## .github/ISSUE_TEMPLATE/

`bug_report.md` — YAML frontmatter (`name`, `about`, `title`, `labels`), then: what
happened · what was expected · reproduction steps · environment · logs.

`feature_request.md` — the problem being solved (not the proposed solution) ·
proposed solution · alternatives considered · additional context.

**Rules:** Frontmatter is required, or GitHub will not offer the template.

---

## Normative language

Where a document states a rule, use RFC 2119 keywords — **MUST**, **MUST NOT**,
**SHOULD**, **SHOULD NOT**, **MAY** — and use them only for genuine requirements.
Everywhere else, plain prose. Scattering MUST through descriptive text drains the
keyword of meaning exactly where it is needed.

---

# Targeted mode — name resolution

`--<NAME>` resolves through this table. Matching is case-insensitive and ignores
`-`, `_` and a trailing `.md`, so `--CODE_OF_CONDUCT`, `--code-of-conduct` and
`--coc` all reach the same row.

| `--NAME` and aliases | Written to | Template |
| --- | --- | --- |
| `README` | `README.md` | `README.md` |
| `CLAUDE` | `CLAUDE.md` | `CLAUDE.md` |
| `CLAUDE.local`, `claudelocal`, `local` | `CLAUDE.local.md` | `claude/CLAUDE.local.md` |
| `MEMORY` | `MEMORY.md` | `claude/MEMORY.md` |
| `SKILL` | `.claude/skills/<name>/SKILL.md` | `claude/SKILL.md` |
| `RULES`, `rule` | `.claude/rules/<topic>.md` | `claude/rules-topic.md` |
| `AGENTS` | `AGENTS.md` | `AGENTS.md` |
| `COPILOT`, `copilot-instructions` | `.github/copilot-instructions.md` | `github/copilot-instructions.md` |
| `CHANGELOG` | `CHANGELOG.md` | `CHANGELOG.md` |
| `CONTRIBUTING` | `CONTRIBUTING.md` | `CONTRIBUTING.md` |
| `SECURITY` | `SECURITY.md` | `SECURITY.md` |
| `CODE_OF_CONDUCT`, `coc`, `conduct` | `CODE_OF_CONDUCT.md` | `CODE_OF_CONDUCT.md` |
| `SUPPORT` | `SUPPORT.md` | `SUPPORT.md` |
| `GOVERNANCE` | `GOVERNANCE.md` | `GOVERNANCE.md` |
| `LICENSE`, `licence` | `LICENSE` (or `LICENSE.md` if asked) | `LICENSE.md` |
| `ARCHITECTURE`, `arch` | `ARCHITECTURE.md` | `ARCHITECTURE.md` |
| `TESTING`, `tests` | `TESTING.md` | `TESTING.md` |
| `ADR`, `adr-NNNN` | `docs/adr/NNNN-<slug>.md` | `adr-0001.md` |
| `PR`, `PULL_REQUEST_TEMPLATE` | `.github/PULL_REQUEST_TEMPLATE.md` | `github/PULL_REQUEST_TEMPLATE.md` |
| `ISSUE_TEMPLATE`, `issue` | `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md` | `github/ISSUE_TEMPLATE/` |
| `BUG`, `bug_report` | `.github/ISSUE_TEMPLATE/bug_report.md` | `github/ISSUE_TEMPLATE/bug_report.md` |
| `FEATURE`, `feature_request` | `.github/ISSUE_TEMPLATE/feature_request.md` | `github/ISSUE_TEMPLATE/feature_request.md` |

Four rows need a second argument because the filename is not fixed —
`SKILL` (skill name), `RULES` (topic), `ADR` (title), and `LICENSE` (which licence).
Ask for it if the invocation did not supply it: `--SKILL pdf-extraction`,
`--RULES testing`, `--ADR "use postgres"`.

A name with no row is not a silent failure. Say which name was given, list the closest
rows, and stop — inventing a document type produces a file no standard backs.

---

# Documents added for the extended set

## SUPPORT.md

GitHub community-health file, surfaced from the issue composer.

Sections: `Getting help` (routing table) · `Before you ask` · `What support is not`.

Its only real job is routing: send questions away from the bug tracker and security
reports away from public issues. Rules: name **real** channels; never promise a response
time nobody intends to meet — an honest "days, not hours" beats a fictional SLA.

## GOVERNANCE.md

Sections: `Roles` · `How decisions are made` · `How changes get merged` ·
`Becoming a maintainer` · `Stepping down and inactivity` · `Changing this document`.

Rule: generate only when more than one person can merge, or an outside party needs to
know how decisions are made. A single-maintainer project needs one honest paragraph, not
a governance structure. The inactivity section is the one people omit and later regret —
a sole maintainer with no documented handover is a project that dies with their inbox.

## LICENSE / LICENSE.md

Reproduce the SPDX text **exactly**. Never reword, summarise, or trim the all-caps
warranty clause — the text is a legal instrument and its value is being identical to
every other copy. Only the year and copyright holder are ever edited.

Conventional filename is `LICENSE` with no extension; GitHub detects `LICENSE.md` too.

Rule: if no licence has been chosen, **ask**. Defaulting to MIT on the user's behalf is
making a legal decision for them.

## CLAUDE.local.md

Personal, machine-local overrides. Claude Code reads it alongside `CLAUDE.md`, and it
wins for that one developer.

Rule: **MUST be gitignored**, and say so when generating it. Committing it pushes one
person's local paths onto the whole team, which is the exact problem the file exists to
prevent. Add the entry to `.gitignore` in the same pass.

## MEMORY.md

Index of persistent memory files, loaded into context every session.

Format: one line per memory — `- [Title](file.md) — hook`.

Rules: it is an **index, never a container** — the memory content lives in its own file.
One fact per file, or recall fires for the wrong one. Hooks must be concrete: "why
deploys run from main, not a tag" is a hook; "deploy notes" is not.

## SKILL.md (skill definition)

Frontmatter: `name` (kebab-case), `description`, optional `version`.

The `description` is the entire discovery mechanism — it is the only part always in
context, and the model decides from it alone whether to load the body. Write it in the
third person and name the phrases a user actually types.

Body: purpose, then a numbered workflow in the imperative, then the quality bar.

Rules: keep the body near 1,500 words. Sometimes-needed detail goes to `references/`,
anything copied into a user's project goes to `assets/`. That split is progressive
disclosure — metadata always in context, `SKILL.md` on trigger, the rest on demand.

## AGENTS.md

Tool-neutral agent instructions. Claude Code does **not** read it natively: import it
with `@AGENTS.md` from `CLAUDE.md`, or let `/init` fold it in.

Sections mirror `CLAUDE.md`: commands, layout, conventions, constraints, non-obvious traps.

Rule: generate it only when several agent tools share the repository. If Claude Code is
the only one, put the content in `CLAUDE.md` — two files that must agree eventually
disagree, and the reader cannot tell which one is stale.

## .github/copilot-instructions.md

Read natively by GitHub Copilot; `/init` also scans it into `CLAUDE.md`.

Sections: stack, conventions to follow, do-not list, testing.

Rule: generate only if the repository actually uses Copilot. Otherwise it is a third
copy of the same instructions, drifting quietly away from the other two.

## .claude/rules/<topic>.md

Free-named, one topic per file: `testing.md`, `security.md`, `migrations.md`.

Sections: scope · `Rules` (RFC 2119) · `How to do it here` · `Common mistakes` ·
`Where this is enforced`.

Rules: scope each file to **one** topic — a mixed file loads whole for a question about
any part of it, and the irrelevant two thirds crowd out what mattered. Rules must be
checkable: "write clean code" changes no behaviour. Name the enforcement point, or say
plainly that only review catches a violation. If everything is MUST, nothing is.
