---
name: ideal-prompt
description: This skill should be used when the user asks to "optimize my prompt", "improve this prompt", "make this prompt cheaper", "reduce token usage", "write a better prompt for", "bu prompt'u iyilestir", when the user runs /oncode:ideal-prompt with or without flags, or when the oncode UserPromptSubmit hook reports that the ideal-prompt switch is open. Rewrites a submitted prompt into the form Claude Code executes with the fewest tokens - anchored to real paths, bounded in scope, verifiable, and output-capped - without changing the user's intent or scope.
version: 0.1.0
---

# ideal-prompt - rewrite the prompt for the cheapest correct trajectory

A prompt costs 50-500 tokens. The execution it triggers costs 20,000-200,000. Optimising
the prompt's own length is therefore the wrong surface. What matters is the **trajectory**:
what the prompt makes the agent do.

An ideal prompt is not shorter. It is **more bounded**.

Read `${CLAUDE_PLUGIN_ROOT}/config/prompt-rules.json` first. It is the single source of
truth for modes, bypasses, thresholds and the prompt language; the hook in
`scripts/prompt-mode.mjs` reads the same file. Never restate those values from memory - the
two copies would drift and the switch would stop behaving as configured.

## How this skill gets reached

| Route | What it means |
|---|---|
| The `UserPromptSubmit` hook injected a line saying the switch is OPEN | Optimise the message that arrived with it, then follow the mode named in the injection |
| The user ran `/oncode:ideal-prompt <text>` | Optimise that text, regardless of the switch |
| The user ran `/oncode:ideal-prompt --<flag>` | Flag handling only. Go to step 0 and stop |

## Step 0 - flags come first

If `$ARGUMENTS` begins with a flag, run the script, report what it printed, and **stop**.
Do not optimise anything in this branch.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --status
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --open --mode review
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --close
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --mode advise
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --language tr
```

| Flag | Effect |
|---|---|
| `--open [--mode <m>]` | Every later prompt is routed here until `--close` |
| `--close` | Prompts pass through untouched until `--open` |
| `--review` / `--advise` / `--auto` | Shorthand for `--mode <m>` |
| `--language <auto\|en\|tr\|...>` | Language of generated code artifacts. Not the prompt language |
| `--status` | Report the switch without changing it |

The script refuses an invalid mode or language rather than repairing it. Report the refusal
verbatim; do not guess what the user meant.

## Step 1 - triage, and exit cheaply

Optimising an already-good prompt is a net loss. Check three things:

1. **Anchored** - does it name a real file, directory or symbol?
2. **Bounded** - is it clear what must not change?
3. **Verifiable** - is there a command that returns pass or fail?

All three present: say "already ideal, proceeding" in one line and run the task as asked.
Most prompts that reach this skill while the switch is open end here. That is the design,
not a failure.

## Step 2 - name the waste

Identify which sink this prompt opens. Only the sinks you can actually name get fixed.

| Sink | Typical cost |
|---|---|
| Unbounded exploration ("look at the codebase") | 15k-60k |
| A correction round (each one resends the whole conversation) | grows with the session |
| Unbounded output (no format constraint) | 5k-40k, at ~5x the input price |
| Noisy command output (permanent in context) | 2k-20k |
| Multi-topic prompt (poisons the context for both topics) | 2x |

## Step 3 - apply the rules

Rules are grouped by the surface they cut. Consult `references/token-trajectory.md` for the
before/after pair behind each one.

### Group A - trajectory (input, 15k-120k)

| # | Rule |
|---|---|
| A1 | **Anchor to paths.** "the codebase" becomes a real file, directory or symbol. The single biggest lever |
| A2 | **Bound the scope, positively.** `Touch only src/auth/`, not `Don't touch anything else` |
| A3 | **Attach a verifiable check.** A command returning pass/fail. This is what kills the correction round |
| A4 | **Route bulk reading to a subagent.** Returns a 1-2k summary instead of a 20k trace |
| A5 | **Point at an existing pattern.** Name the file that already does it rather than describing the design |
| A6 | **One topic.** Split a multi-topic prompt into separate prompts |
| A7 | **Choose mode and model.** Skip plan mode when the diff fits in one sentence. Mechanical work to Haiku 4.5, implementation to Sonnet 5, architecture to Opus 5. Low effort when no reasoning is required |

### Group B - structure (input: adherence, rework, cache)

| # | Rule |
|---|---|
| B1 | **XML scaffolding, conditionally.** Only when the prompt exceeds `structureThresholdChars` **and** carries several components (context + instruction + data): separate them with `<context>`, `<instructions>`, `<input>`, `<output_format>`. On a one-line request, do not - a tag pair is ~8 tokens of pure overhead and loses money |
| B2 | **Frame positively.** "Do Y" instead of "Don't do X": shorter, and a negative instruction points attention at the very thing it forbids |
| B3 | **Long content first, the question last.** Anthropic's explicit guidance, and a stable long prefix can be cached while content that changes at the front invalidates the cache |
| B4 | **Cut the filler.** Courtesy, repetition, irrelevant background. Every word carrying no meaning goes |
| B5 | **Examples only when format consistency is critical.** Then 2-3 short and varied ones. Otherwise none - examples are expensive |

### Group C - output (~5x the input price, resent every turn)

| # | Rule |
|---|---|
| C1 | **Constrain the output concretely** - length, style, structure. If the user did not specify one, add the constraint that suits the task type (`references/prompt-shapes.md`) |
| C2 | **Forbid the intro and the outro.** No meta-commentary, no restated summary, no "hope this helps" |
| C3 | **Ask for a direct answer on single-step tasks.** If no explanation was requested, none should be produced |

### Group D - language

| # | Rule |
|---|---|
| D1 | **Write the optimized prompt in English** - `promptLanguage` in the config. Tokenizer efficiency, and it matches the surface of the codebase (paths, symbols, test names) |
| D2 | **Code artifacts follow `--language`.** `auto` means the language of the file being edited, English when the file gives no signal. Decide this **at write time**, never by scanning the repo for it |

## The two invariants

> **1. Every line added must pay for itself.** It has to remove a tool call, a correction
> round, or output tokens. If it does not, delete the line.
>
> **2. Intent and scope never change.** Only the wording and the structure get clearer. If
> the task was narrowed, say so explicitly in the report.

Invariant 1 is what separates this skill from a prompt beautifier. Reflexively appending
security, performance and accessibility sections to every prompt violates it: those lines
buy nothing on a task that has no security, performance or accessibility dimension.

Invariant 2 is the only protection against silent scope drift. A cheaper prompt that solves
a different problem is worth nothing.

## Translation guard - the limit of D1

Translation that loses meaning is not performed. Carry these through **verbatim**:

| Carried as-is | Why |
|---|---|
| Pasted error text, log lines, stack traces | Translated, they no longer match `grep` - which makes the fix impossible |
| File paths, symbol names, commands, branch names | Already language-neutral |
| A user phrase given in quotes | It is evidence of intent, not material to reinterpret |
| User-facing UI strings and domain terms | The product's language, not the prompt's |

When in doubt, leave it in the user's language. Not translating something is cheaper than
translating it wrongly.

## Step 4 - report

State, in the user's language:

- the prompt before and after
- which surface was cut (A / B / C) and which sink was closed
- the estimated saving **as a range** - never invent a precise number
- an explicit warning if the task was narrowed

The optimized prompt is in English; the explanation around it is in the user's language.
The saving lives in the prompt, the cost lives with the human, and the two are kept apart.

## Step 5 - act on the mode

| Mode | Behaviour |
|---|---|
| `review` | Show the rewrite and the rationale, get approval, then execute |
| `advise` | Show the rewrite and stop. Execute nothing |
| `auto` | Execute the rewritten prompt directly, without printing a rationale |

## Context pressure

The hook measures the transcript size and may append a line suggesting compaction. It never
runs a slash command - a hook cannot, and compaction is destructive. Offer, do not perform:

- **`/clear`** when moving to an unrelated task
- **`/compact <focus>`** when the same long task continues

Confusing the two either loses work or lets the context keep growing.

## Additional resources

- **`references/token-trajectory.md`** - the cost model, a before/after pair for every rule,
  the `/clear` vs `/compact` distinction, and the anti-patterns worth refusing.
- **`references/prompt-shapes.md`** - the XML skeleton for B1 and the default output
  constraint per task type for C1.
- **`${CLAUDE_PLUGIN_ROOT}/config/prompt-rules.json`** - modes, bypasses, thresholds.
  Shared with the hook.
