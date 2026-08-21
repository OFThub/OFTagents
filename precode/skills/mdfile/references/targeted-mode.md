# Targeted mode — working on one named document

Reached from `SKILL.md` when the invocation carries an argument like `--CODE_OF_CONDUCT`,
`--security` or `--RULES testing`. Split out of the skill body because it is dead weight
on every ordinary invocation: the tier workflow never needs it.

Work on **that document only**. Skip the tier discussion entirely: the user has already
said which file they mean.

Resolve the name through the *Targeted mode — name resolution* table in
`doc-catalog.md` (this same directory). Matching is case-insensitive and ignores `-`, `_` and a
trailing `.md`. An unknown name is not a silent failure — say what was given, list the
closest rows, and stop.

Then branch on whether the file already exists:

| State | What to do |
|---|---|
| **Missing** | Profile (step 2), then generate it from its template. Ask only what the profile could not answer. |
| **Exists** | **Improve it — never overwrite it.** |

### Improving a document that already exists

1. Read the file in full. It is someone's work, and most of it is probably right.
2. Read that document's entry in `references/doc-catalog.md` and compare: which required
   sections are absent, which are stubs, which claims are now false.
3. Re-profile the project (step 2). Documentation rots because the project moved, so check
   the commands, paths and versions the file names against what is actually there today.
4. Report what you propose — sections to add, claims that no longer hold, placeholders
   still unfilled — and what you are leaving alone, then apply it.
5. Preserve the author's wording wherever it is still true. Rewriting a correct sentence
   into your own phrasing is churn, not improvement, and it buries the real change in the diff.

Never replace a file wholesale in this mode. If the existing document is so far from the
standard that editing is harder than starting over, say so and ask — do not decide it alone.

Four names need a second argument, because the filename is not fixed: `--SKILL <name>`,
`--RULES <topic>`, `--ADR <title>`, `--LICENSE <spdx-id>`. Ask if it was not supplied.

