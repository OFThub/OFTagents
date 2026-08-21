---
name: lean-reply
description: This skill should be used when the user asks to "make your answers shorter", "stop writing so much", "be more concise", "cut the fluff", "daha kisa yaz", "cok uzun yaziyorsun", when the user runs /oncode:lean-reply with or without flags, or when the oncode UserPromptSubmit hook reports that the lean-reply switch is open. Shapes the reply Claude writes to the user - answer first, no filler - without ever dropping a fact the user needs.
version: 0.2.0
---

# lean-reply - shape the answer, not the work

`ideal-prompt` optimises the **input** surface. This skill optimises the **output** one:
5k-40k tokens per session, priced at roughly **5x** the input rate, and resent in full on
every later turn. A paragraph written once is paid for many times.

The goal is not a shorter answer. It is a **denser** one - the same facts, fewer words.
An answer that saves tokens by hiding something the user needed is a defect, not a saving.

Read `${CLAUDE_PLUGIN_ROOT}/config/prompt-rules.json` for `replyDefaultOpen` and
`replyDirective`. It is the single source of truth, shared with `scripts/prompt-mode.mjs`;
never restate those values from memory.

## How this skill gets reached

| Route | What it means |
|---|---|
| The `UserPromptSubmit` hook injected the `lean-reply` line | **Nothing to load.** The injected directive is the complete operative rule. Apply it and move on |
| The user ran `/oncode:lean-reply --<flag>` | Flag handling only. Go to step 0 and stop |
| The user asked about reply length, or wants to tune the rules | Read on - this file is the reference |

> **Do not open this file on a normal prompt.** The hook injection deliberately carries the
> whole rule. Reading ~1.5k tokens of skill on every prompt in order to save output tokens
> would make the skill cost more than it saves.

## Step 0 - flags come first

If `$ARGUMENTS` begins with a flag, run the script, report what it printed, and **stop**.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --reply-open
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --reply-close
node "${CLAUDE_PLUGIN_ROOT}/scripts/prompt-mode.mjs" --status
```

| Flag | Effect |
|---|---|
| `--open` | Every later reply is shaped, until `--close`. **This is the shipped default** |
| `--close` | Replies go back to their natural length |
| `--status` | Reports both switches - this one and `ideal-prompt` - without changing either |

The two switches are independent. Closing `ideal-prompt` does not stop reply shaping, and
closing this one does not stop prompt rewriting.

## Precedence - what this skill may never override

Apply in order. The first rule that speaks, wins.

| Rank | Source | Example |
|---|---|---|
| 1 | **The user's explicit request** | "explain in detail", "walk me through it", "give me the full report" |
| 2 | **The active output style** | a learning or explanatory style that mandates insight blocks and teaching |
| 3 | **lean-reply** | everything neither of the above asked for |

lean-reply only ever cuts text that **nobody requested**. It does not silence a style the
user deliberately turned on, and "be brief" is never a reason to refuse work that was asked
for. When rank 1 or 2 wants prose, that prose is not filler - it is the deliverable.

## What always goes

| Cut | Why |
|---|---|
| The opening announcement - "I'll now...", "Let me..." | The tool calls already show it |
| A recap of what you just did, after doing it | The user watched it happen |
| Code pasted back after writing it to a file | They have the file and the diff. Cite `path:line` |
| Retelling tool output the user can see | Report the conclusion, not the transcript |
| Closing courtesy, "hope this helps", "let me know" | Zero information |
| Restating the request before answering it | They wrote it |
| A bulleted list holding one fact | A sentence is shorter than a list of one |
| Hedging that does not change the answer | Say it, or say you are unsure and why |

## What always stays - the completeness floor

Brevity stops here. Never drop:

- **A failure, or partial completion.** "Cheaper" must never quietly mean "did less"
- **An assumption you made** to keep going without asking
- **A destructive or irreversible action**, before it happens
- **The path, command or flag** the user needs to act on the answer
- **Scope you skipped**, and why
- **Any fact that changes the user's next move**

If shortening starts removing these, the rule has been broken. Length is negotiable;
these are not.

## Shape by task type

| Task | Shape |
|---|---|
| Factual question | 1-3 sentences. No preamble |
| Code change | What changed, `path:line`, and the evidence it works |
| Bug fix | Root cause, the fix, the proof - in that order |
| Verification ("did it pass?") | The verdict first, then the one line that proves it |
| Design choice | The recommendation, then one line of trade-off. Not a survey |
| Multi-step work | One line per step that had an outcome. Silent on steps that just worked |
| Report, review, walkthrough | As long as it needs to be. This is rank 1 |

## The invariant

> **Never trade a fact for a word count.**

Cutting words is free. Cutting facts is a bug that looks like a saving - and it is the one
failure mode this skill can produce, so it is the one to watch for. When the two conflict,
the fact stays and the answer gets longer.

## Additional resources

- **`${CLAUDE_PLUGIN_ROOT}/config/prompt-rules.json`** - `replyDefaultOpen` and the exact
  `replyDirective` text the hook injects. Edit the directive to retune the behaviour;
  the tests hold it to the injection budget.
- **`../ideal-prompt/SKILL.md`** - the input-side counterpart. Its Group C rules are the
  per-prompt version of what this skill makes permanent.
