# Testing

## Layers

| Layer | Location | What it covers |
| --- | --- | --- |
| Unit | `precode/scripts/docs-gate.test.mjs` | The gate's decision logic: `decide()`, `missingDocs()`, `declinePath()`, `denyPayload()`, and the session question. 18 cases. |
| Unit | `oncode/scripts/prompt-mode.test.mjs` | The prompt rewriter's rule application and output shape. 25 cases. |

There are no integration or end-to-end layers, and adding them would mean driving the Claude
Code runtime itself. Instead, both suites test the pure functions directly and pass the
filesystem in as an argument (`fileExists`, `listRoot`), so **no test touches the disk**.
That is what keeps them fast and keeps them honest on both Windows and Linux.

## Running tests

All tests:

```bash
node precode/scripts/docs-gate.test.mjs
node oncode/scripts/prompt-mode.test.mjs
```

A single test, by name:

```bash
node --test-name-pattern="deadlock guard" precode/scripts/docs-gate.test.mjs
```

The pattern is a regular expression matched against the test's name, so any distinctive
fragment works — `"case-insensitively"`, `"fails open"`, `"opt-out"`.

With coverage:

```bash
node --experimental-test-coverage precode/scripts/docs-gate.test.mjs
```

Current measured coverage is 74% of lines and 94% of branches for `docs-gate.mjs`. The
uncovered lines are the CLI shell — stdin parsing and process exit — not the decision logic.
`session-check.mjs` sits lower for the same reason: its I/O half is deliberately untested,
its logic half is not.

## What CI runs

Nothing. This repository has no `.github/workflows/`, and the test suites are run locally.

Both suites use only the Node standard library (`node:test`, `node:assert`) and need no
install step, so adding CI is a single workflow file running the two commands above with no
`npm install` in front of them. Until that exists, **run the tests before pushing** — nothing
else will.

## Expectations

- New behaviour MUST ship with a test. There is no framework to configure and no fixture to
  build; the cost of adding one is a few lines.
- Tests MUST NOT touch the disk. Pass the filesystem in through the `fileExists` and
  `listRoot` parameters, as the existing cases do.
- The deadlock-guard test MUST NOT be deleted or weakened. It is the only thing standing
  between a config edit and a project that cannot write the documents its own gate demands.
- A failing test is fixed or deleted, never skipped silently.
- Coverage is not gated on a number. A decision branch left untested is the problem worth
  catching, and 74% of lines with 94% of branches already says where the gaps are.

## Adding a test

Append a `test(...)` call to the suite for the plugin you changed. Name it as a sentence
stating the behaviour, matching the existing style:

```js
test("never blocks a .md write — this is the deadlock guard", () => {
  // ...
});
```

Names are the filter for `--test-name-pattern` and the failure message a future contributor
reads first, so `"honours the opt-out state file"` earns its length over `"test opt-out"`.
Build the config and filesystem inline in the test rather than reaching for a shared fixture.
