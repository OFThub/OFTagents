# Testing

## Layers

| Layer | Location | What it covers |
| --- | --- | --- |
| Unit | `{{path}}` | {{scope}} |
| Integration | `{{path}}` | {{scope}} |
| End-to-end | `{{path}}` | {{scope}} |

<!-- Only layers that actually exist. Delete the rest. -->

## Running tests

```bash
{{ALL_TESTS_COMMAND}}
```

Single test:

```bash
{{SINGLE_TEST_COMMAND}}
```

<!--
The single-test command is the thing every contributor looks up and the thing
most testing docs forget. Do not omit it.
-->

With coverage:

```bash
{{COVERAGE_COMMAND}}
```

## What CI runs

{{CI_PIPELINE_STEPS}} — see `{{CI_CONFIG_PATH}}`.

## Expectations

- New behaviour ships with a test.
- {{COVERAGE_BAR_IF_ANY}}
- A failing test is fixed or deleted, never skipped silently.

## Adding a test

{{WHERE_TO_PUT_IT_AND_NAMING_CONVENTION}}
