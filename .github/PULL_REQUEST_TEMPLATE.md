## Summary

<!-- What changes, and why. One or two sentences. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation
- [ ] Refactor / internal

## How this was tested

<!-- The commands you ran and what you observed. "Tests pass" is not a test report.
     If the change touches a hook or a script, say whether you restarted Claude Code
     before testing — hooks load only at session start, and testing without a restart
     exercises the previously cached version. -->

## Checklist

- [ ] `node precode/scripts/docs-gate.test.mjs` passes
- [ ] New behaviour has a test
- [ ] Every JSON file still parses
- [ ] `CHANGELOG.md` updated under `## [Unreleased]`
- [ ] Documentation updated if behaviour changed
- [ ] No unrelated changes in this diff

## Gate safety

<!-- Tick only if this PR touches precode's gate, config, or hooks. -->

- [ ] `.md` is still in `allowExtensions` (removing it deadlocks the gate)
- [ ] The required-document list still lives only in `config/required-docs.json`
- [ ] The gate still exits `0` on every failure path
- [ ] Nothing new is written into the user's project
