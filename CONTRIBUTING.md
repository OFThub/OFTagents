# Contributing to OFTagents

Thanks for taking the time to contribute.

OFTagents is a Claude Code plugin marketplace. The root `.claude-plugin/marketplace.json`
is a catalog; each plugin lives in its own top-level folder and is wired into the catalog
by a relative `source`.

## Reporting a bug

Open an issue using the bug report template. Include reproduction steps, what you
expected, what happened, and your environment. A reproduction beats a description.

For security vulnerabilities, do **not** open an issue — see [SECURITY.md](SECURITY.md).

## Proposing a change

Open an issue describing the problem before writing code. Agreeing on the problem first
saves a rejected pull request later.

## Development setup

There is no build step and no dependency install: plugins are interpreted files, and the
scripts use Node built-ins only.

```bash
git clone https://github.com/OFThub/OFTagents.git
cd OFTagents
node precode/scripts/docs-gate.test.mjs
```

To try your changes inside Claude Code, add the working copy as a local marketplace:

```
/plugin marketplace add C:\Projects\OFTagents
/plugin install precode@oftagents
```

**Hooks load only at session start.** After changing anything under `hooks/` or `scripts/`,
restart Claude Code before testing — otherwise you are exercising the previously cached
version and will draw the wrong conclusion.

## Branch and commit conventions

Branch from `main`.

Commit subjects in this repository are short imperative sentences, capitalised, with no
type prefix — this project does **not** use Conventional Commits:

```
Add session-scoped docs gate and prompt
Clarify template placeholders; ignore personal docs
Update README
```

Match that style rather than introducing a second one.

## Before opening a pull request

- [ ] `node precode/scripts/docs-gate.test.mjs` passes
- [ ] New behaviour has a test — the suite uses `node:test`, no framework, no disk access
- [ ] Every JSON file still parses (`marketplace.json`, `plugin.json`, `required-docs.json`, `hooks.json`)
- [ ] `CHANGELOG.md` updated under `## [Unreleased]`
- [ ] Documentation updated if behaviour changed
- [ ] No unrelated changes in the diff

There is no linter or formatter in this repository; match the surrounding style by hand.

## Rules that must not be broken

These are not style preferences. Breaking one of them can make a user's project
permanently unwritable, which is the worst failure this plugin can produce.

| Rule | What happens if you break it |
| --- | --- |
| Never remove `.md` from `allowExtensions` in `precode/config/required-docs.json` | The gate blocks the very documents it demands, and the project can never satisfy it. A test named *deadlock guard* protects this. |
| Never hardcode the required-document list into `docs-gate.mjs` | A second list drifts from the first, and a drifted gate cannot be satisfied. |
| Keep the gate fail-open — never exit `2` | A broken gate would make Claude Code unusable rather than merely unguarded. |
| The gate must not write anything into the user's project | A read-only check has no business creating files. Session state belongs in the OS temp directory. |
| Use `${CLAUDE_PLUGIN_ROOT}` for every in-plugin path | Absolute paths break on every machine but yours. |

## Adding a plugin to the marketplace

1. Create a top-level folder: `OFTagents/<plugin-name>/`
2. Add `<plugin-name>/.claude-plugin/plugin.json` with at least `name`, plus `version`
   and `description`.
3. Register it in the `plugins` array of `.claude-plugin/marketplace.json` with a
   relative `"source": "./<plugin-name>"`.

Components (`commands/`, `skills/`, `hooks/`, `agents/`) live at the plugin root, not
inside `.claude-plugin/` — that folder holds the manifest and nothing else.

## Review

OFTagents is maintained by one person, so review is best-effort rather than same-day.
Pull requests that add a dependency, embed an absolute path, or duplicate a rule that
already lives in `config/required-docs.json` will be sent back.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating you
agree to uphold it.
