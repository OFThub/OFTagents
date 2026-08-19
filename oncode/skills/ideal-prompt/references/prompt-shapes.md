# Prompt shapes - the B1 skeleton and the C1 defaults

## B1 - the XML skeleton

Use only when the prompt exceeds `structureThresholdChars` **and** carries several distinct
components. Below that, a plain sentence is cheaper and just as clear.

Section order matters: long material first, the request last (rule B3).

```xml
<context>
Framework, version, conventions the model cannot infer. One or two lines.
</context>

<input>
The pasted file, log or specification. The bulky part goes here, near the top.
</input>

<instructions>
The task, as positive statements. Scope bound. Verification command.
</instructions>

<output_format>
Concrete shape: length, structure, style.
</output_format>
```

Drop any section that would be empty. An empty tag pair is 8 tokens buying nothing.

Tag names are not sacred - `<background>`, `<data>`, `<task>` work identically. What matters
is that the boundaries are unambiguous and the names are consistent within one prompt.

## C1 - default output constraint by task type

When the user did not state an output format, add the one that fits. Every entry here
exists because the unconstrained version of that task reliably overruns.

| Task type | Default constraint |
|---|---|
| Bug fix | "Show the diff and the test output. No narration." |
| Feature work | "Report the files changed and the verification command's result." |
| Exploration / "how does X work" | "At most N bullets. Name the file and line for each." |
| Code review | "Findings only, most severe first. Skip style preferences." |
| Architecture / design | "The decision and its rationale. At most 3 alternatives, one line each." |
| Refactor | "Summarise what moved where. Confirm the tests still pass." |
| Research / comparison | "A table. One row per option, columns named up front." |
| Data extraction | "The requested fields only, as JSON. No prose." |
| Yes/no or single fact | "Answer directly in one sentence." |
| Documentation | "The document itself. No commentary about writing it." |

Two constraints apply to every task type (rules C2 and C3):

```
No preamble, no closing summary.
```

## Worked example

```
raw       can you please take a look at our authentication and tell me
          everything that might be wrong with it? thanks!

optimized Review the auth flow in src/auth/ for correctness and security.

          Report findings only, most severe first, with file:line for each.
          Skip style preferences. No preamble, no closing summary.
          Use a subagent for the file reading and report the findings only.
```

What changed, and what each change bought:

| Change | Rule | Surface cut |
|---|---|---|
| "our authentication" became `src/auth/` | A1 | A - removes the search phase |
| Bulk reading moved to a subagent | A4 | A - 20k trace becomes a 1-2k summary |
| "everything that might be wrong" became severity-ordered findings | C1 | C - bounds an otherwise open-ended answer |
| Courtesy removed | B4 | prompt - marginal, but free |
| No XML scaffolding added | B1 | would have cost 8 tokens for nothing at this size |

The prompt grew by about 20 tokens. The trajectory shrank by an estimated 20k-50k.
