<!--
Lives at `.github/copilot-instructions.md`. GitHub Copilot reads it natively; Claude Code
does not, but `/init` will scan it and fold its content into CLAUDE.md.

Generate this only when the repository actually uses Copilot. Otherwise it becomes a
third copy of the same instructions, drifting quietly away from the other two.
-->

# Copilot instructions — {{PROJECT_NAME}}

{{WHAT_THIS_PROJECT_IS — one paragraph}}

## Stack

{{LANGUAGES_FRAMEWORKS_AND_VERSIONS — derived from the manifest, not assumed}}

## Conventions to follow

- {{PATTERN_OBSERVED_IN_THE_CODE}}
- Match the surrounding file's style: {{NAMING}}, {{ERROR_HANDLING}}, {{TEST_LOCATION}}.

## Do not

- {{FORBIDDEN_THING}} — {{WHAT_BREAKS}}.
- Add dependencies without {{APPROVAL_RULE}}.

## Testing

Tests live in `{{TEST_PATH}}` and run with `{{TEST_COMMAND}}`. New behaviour needs a test.
