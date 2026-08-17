# Contributing to {{PROJECT_NAME}}

Thanks for taking the time to contribute.

## Reporting a bug

Open an issue using the bug report template. Include reproduction steps, what you
expected, what happened, and your environment. A reproduction beats a description.

For security vulnerabilities, do **not** open an issue — see [SECURITY.md](SECURITY.md).

## Proposing a change

Open an issue describing the problem before writing code. Agreeing on the problem first
saves a rejected pull request later.

## Development setup

```bash
{{CLONE_COMMAND}}
{{INSTALL_COMMAND}}
{{TEST_COMMAND}}
```

## Branch and commit conventions

Branch from `{{DEFAULT_BRANCH}}`. Name branches `{{BRANCH_PATTERN}}`.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
feat(scope): add the thing
fix(scope): stop the thing crashing
docs(scope): explain the thing
```

<!-- If the git history shows a different convention, document that one instead. -->

## Before opening a pull request

- [ ] `{{TEST_COMMAND}}` passes
- [ ] `{{LINT_COMMAND}}` passes
- [ ] New behaviour has a test
- [ ] Documentation updated if behaviour changed
- [ ] `CHANGELOG.md` updated under `## [Unreleased]`
- [ ] No unrelated changes in the diff

## Review

{{WHAT_A_CONTRIBUTOR_SHOULD_EXPECT — who reviews, rough turnaround, what gets rejected}}

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating you
agree to uphold it.
