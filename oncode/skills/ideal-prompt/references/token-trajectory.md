# Token trajectory - the cost model behind every rule

## Why prompt length is the wrong target

| Surface | Size | Price | Cut by |
|---|---|---|---|
| The prompt itself | 50-500 tokens | input | almost nothing worth doing |
| **Trajectory** - the reading, searching and correcting the prompt causes | 15k-120k | input | group A |
| **Structure** - adherence, rework, cache hits | 2k-20k | input | group B |
| **Output** - the text the model produces | 5k-40k | **~5x input**, and resent every turn | group C |

Halving a 200-token prompt saves 100 tokens. Removing one unbounded exploration saves
15,000-60,000. The ratio is why this skill never optimises for brevity.

## Group A - trajectory

### A1 Anchor to paths

```
before  fix the login bug
after   src/auth/token.ts: refresh fails after session timeout. Fix it.
```
Removes the search phase: 15k-60k of reads become one targeted read.

### A2 Bound the scope, positively

```
before  don't touch the database schema, don't change other modules, don't add deps
after   Touch only src/auth/. Use existing dependencies.
```
Shorter, and it states a boundary the model can check itself against rather than a list of
things to keep in mind.

### A3 Attach a verifiable check

```
before  fix it and make sure it works
after   Verify with: npm test -- auth
```
The most valuable single line in most prompts. Without a check, "looks done" is the only
stop signal and every mistake waits for the user to notice - and each correction round
resends the entire conversation.

### A4 Route bulk reading to a subagent

```
before  read through the codebase and tell me how auth works
after   Use a subagent to trace the auth flow and report the entry points only.
```
20k of exploration trace becomes a 1-2k summary in the main context.

### A5 Point at an existing pattern

```
before  add a calendar widget that looks like our other widgets
after   Follow the pattern in src/widgets/HotDogWidget.tsx to add a calendar widget.
```
Replaces a description the model must guess at with a file it can read once.

### A6 One topic

Two unrelated tasks in one prompt means both run against a context polluted by the other.
Split them, and use `/clear` between them.

### A7 Choose mode and model

| Situation | Choice |
|---|---|
| The diff fits in one sentence | Skip plan mode - planning is overhead here |
| Approach unclear, several files, unfamiliar code | Plan mode earns its cost |
| Mechanical, repetitive work | Haiku 4.5 (~5x cheaper input than Opus) |
| Ordinary implementation | Sonnet 5 |
| Architecture, deep reasoning | Opus 5 |
| No reasoning required | Low effort - thinking is billed as output |

## Group B - structure

### B1 XML scaffolding, conditionally

Anthropic's context-engineering guidance recommends separating a prompt into sections with
XML tags or Markdown headers. The recommendation assumes a prompt with sections.

```
loses money   <instructions>fix the typo in README.md</instructions>
              12 tokens of content wrapped in 8 tokens of tags

earns it      a 400-character request carrying background, a rule list and pasted data,
              where the model would otherwise have to guess where each part ends
```

Apply only when the prompt exceeds `structureThresholdChars` **and** genuinely has several
components. The threshold lives in the config, not here.

### B2 Frame positively

```
before  Do not guess. Do not hallucinate. Do not invent APIs.
after   Base the answer on the files you read; say "unverified" where you did not.
```
Shorter, and it removes the failure mode instead of naming it. Negative instructions put
the forbidden thing in the model's attention.

### B3 Long content first, the question last

Put pasted logs, files and specifications at the top, the actual question at the bottom.
Two effects: the model reads the material before the request, and a stable long prefix can
be cached - content that changes at the *front* of the context invalidates the cache for
everything after it.

### B4 Cut the filler

"Could you please help me with", "thanks in advance", the restated background the model
already has. Words that carry no constraint carry no value.

### B5 Examples only when format consistency is critical

An example costs real tokens every time. Include 2-3 short, varied ones when the output
must match a shape exactly. Include none when it must not.

## Group C - output

Output is billed at roughly 5x input **and** joins the conversation, so it is resent as
input on every later turn. An unbounded answer is charged twice.

```
before  explain how the auth system works
after   Explain the auth flow in at most 8 bullets. No preamble, no summary.
```

See `prompt-shapes.md` for the default constraint per task type.

## /clear vs /compact

They are not interchangeable, and the wrong choice either loses work or lets context grow.

| Situation | Command | Why |
|---|---|---|
| Moving to an unrelated task | `/clear` | Nothing from the previous task is worth carrying |
| The same long task continues | `/compact <focus>` | The decisions and file states must survive |
| Corrected the same issue more than twice | `/clear` and rewrite the prompt | The context is polluted with failed approaches |

The hook only ever **suggests** these. A hook cannot run a slash command, and compaction is
destructive - firing it at the wrong moment discards work in progress.

## Anti-patterns - things this skill refuses to do

| Anti-pattern | Why it is wrong here |
|---|---|
| LLMLingua-style prompt compression | Built for RAG and chat pipelines. It compresses the 200-token surface and leaves the 40,000-token one untouched |
| Appending security / performance / accessibility sections by reflex | Violates invariant 1: those lines buy nothing on a task with no such dimension |
| Rewriting into a "professional" register | Style is not a token surface. It adds words and changes nothing |
| Scanning the repo to detect the comment language | 5 file reads cost 3-5k, more than the saving. Read it from the file being edited, which is already open |
| Narrowing the task to make it cheaper | Violates invariant 2. The cheapest prompt that solves the wrong problem is worth nothing |
| Inventing a precise saving figure | Estimates are ranges. A fabricated number is worse than no number |
