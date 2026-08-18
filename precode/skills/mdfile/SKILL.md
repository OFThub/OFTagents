---
name: mdfile
description: This skill should be used when the user asks to "create documentation", "set up a README", "generate a CHANGELOG", "add CONTRIBUTING", "write project docs", "this project has no docs", when the precode gate denies a write with a missing-documentation reason, or when the user agrees to the documentation offer made at session start. Detects which industry-standard markdown documents a project is missing, infers what it can from the project itself, asks only for what cannot be inferred, and generates each file against its published standard.
version: 0.1.0
---

# mdfile — project documentation baseline

Generate the markdown documentation an established project is expected to carry, adapted
to what the project actually is. Infer aggressively, ask sparingly, follow published
standards rather than improvising structure.

Documents are written in **English** regardless of conversation language — `Keep a Changelog`,
`Contributor Covenant` and the GitHub community-health conventions are English artifacts, and
documentation is read by people who did not join the conversation. Ask before deviating.

## How this skill gets reached

Three routes, and they differ in one respect only: whether the user has already agreed.

| Route | Has the user agreed? |
|---|---|
| The session-start question — precode reports a missing baseline and Claude asks once | **Yes.** They said yes. Start at step 1 immediately; do not ask again whether to create documentation. |
| A denied write — the gate refused a code write for missing docs | No. Offer, then proceed on agreement. |
| Direct request or `/precode:docs init` | Yes, implicitly. Start at step 1. |

If the user **declines** the session-start question, do not run this skill and do not bring
documentation up again in that session. Record the decline so the gate honours it:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/session-check.mjs" --decline <session_id>
```

Without that command the gate would still block their first code write, and their "no"
would have meant nothing.

## Workflow

Run all four steps in order. Do not skip step 2 — it is what separates this skill from a
template dump.

### Step 1 — Detect what already exists

Read `${CLAUDE_PLUGIN_ROOT}/config/required-docs.json`. Its `core` array is the authoritative
required set; the gate in `scripts/docs-gate.mjs` reads the same file, so never restate the
list from memory — the two would drift and the gate would stop being satisfiable.

Then scan for existing documentation:
- project root (`README.md`, `CHANGELOG.md`, `CLAUDE.md`, `LICENSE`, …)
- `.github/` (templates, community health files)
- `docs/` (architecture, ADRs, guides)

**Never overwrite an existing document.** If a file exists but is thin, offer to extend it and
say what is missing. Silently replacing someone's README is the one unrecoverable failure here.

### Step 2 — Profile the project before asking anything

Read whichever of these exist and mine them for facts:

| Source | Yields |
|---|---|
| `package.json` | name, description, license, scripts (build/test/dev), dependencies → stack |
| `pyproject.toml` / `requirements.txt` | name, description, Python version, dependencies |
| `go.mod` / `Cargo.toml` / `pom.xml` / `*.csproj` | module name, language version, dependencies |
| `git remote -v` | hosting, org/user, public vs internal |
| `git log -1 --format=%an` | maintainer name for SECURITY/CoC contact |
| existing `LICENSE` | license identifier |
| directory shape | monorepo vs single package, service count, presence of tests |

Derive the stack, the run/build/test commands, and whether the project is public or internal.
Anything derived here is a question not asked.

### Step 3 — Ask only for the gaps

Make **one** `AskUserQuestion` call with at most 4 questions, covering only what step 2 could
not answer. Typical genuine gaps:

- **Audience** — public open source, internal/company, or personal? Drives the whole tier choice.
- **Doc tier** — core only, or the full community-health set? (Offer the recommendation.)
- **License** — only if no `LICENSE` and no `license` field was found.
- **Security contact** — only when generating `SECURITY.md` and no maintainer email is derivable.

Asking for a project name that is sitting in `package.json` destroys the user's trust in the
skill. If step 2 answered it, do not ask it.

### Step 4 — Generate

Consult `references/doc-catalog.md` for the required structure of each document — every file
maps to a published standard, so the shape is not a judgement call. Start from the matching
file in `assets/templates/`, then fill it from the profile.

**No `{{PLACEHOLDER}}` may survive into a generated file.** An unfilled template is worse than
no file: it looks like documentation and carries no information. If a placeholder cannot be
filled from the profile or the user's answers, either ask, or drop that section entirely.

Verify this rather than trusting it — after writing, search the generated files for the
literal `{{`. Any hit means that file is not finished. Search for `{{` alone, never a cased
pattern: placeholders are written in several forms (`{{PROJECT_NAME}}`, `{{path}}`,
`{{WHAT_IT_IS — one paragraph}}`) and a case-sensitive pattern silently misses most of them.

After writing, report what was created and what was deliberately skipped, and mention that the
`precode` gate is now satisfied.

## Which documents to generate

Only the **core** tier is enforced by the gate. Higher tiers are proposed and generated on
agreement — a hard block that also dictates a dozen files would be intolerable.

| Tier | Documents | Generate when |
|---|---|---|
| **Core** | `README.md`, `CLAUDE.md`, `CHANGELOG.md` | always — this is the gate's bar |
| **Open source** | `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md` | public remote, or user says public |
| **Complex** | `ARCHITECTURE.md`, `docs/adr/0001-record-architecture-decisions.md`, `TESTING.md` | multi-service, multi-package, or non-obvious structure |

`CLAUDE.md` is in the core tier on purpose: it is what makes every later agent session in this
repository behave. Write it from the profile — real build/test commands, real conventions
observed in the code — not from generic advice.

## Quality bar

A generated document must be **true about this project**, not true in general.

- Commands must be the project's actual commands, copied from `scripts` or the build file.
- The architecture section must name real directories, verified to exist.
- `CHANGELOG.md` starts at `## [Unreleased]` — never invent release history.
- Prefer omitting a section over filling it with a plausible guess. A short accurate README
  beats a long speculative one.
- Use RFC 2119 keywords (MUST/SHOULD/MAY) where the text is normative, plain prose elsewhere.

## Additional resources

- **`references/doc-catalog.md`** — every document mapped to its published standard, with the
  required section order. Consult before writing each file.
- **`assets/templates/`** — starting skeletons: `README.md`, `CLAUDE.md`, `CHANGELOG.md`,
  `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ARCHITECTURE.md`, `TESTING.md`,
  `adr-0001.md`, and `github/` for the issue and pull request templates.
- **`${CLAUDE_PLUGIN_ROOT}/config/required-docs.json`** — the required set. Shared with the gate.
