---
name: {{skill-name-in-kebab-case}}
description: This skill should be used when {{CONCRETE_TRIGGERS — the phrases a user actually types, in third person}}. {{WHAT_IT_DOES — one sentence}}.
version: 0.1.0
---

<!--
The frontmatter `description` is the whole discovery mechanism. It is the ONLY part
always in context, and the model decides from it alone whether to load this file.

  * Third person ("This skill should be used when…"), never "Use me to…".
  * Name the phrases a user really types. "create documentation", "set up a README"
    beats "documentation-related tasks".
  * State what it does, not how good it is.

A skill nobody triggers is a skill that does not exist. Spend the effort here.
-->

# {{skill-name}} — {{ONE_LINE_PURPOSE}}

{{WHAT_THIS_SKILL_PRODUCES — two or three sentences, imperative and concrete}}

## Workflow

Run these steps in order.

### Step 1 — {{STEP_NAME}}

{{WHAT_TO_DO — imperative. Name real files, real commands.}}

### Step 2 — {{STEP_NAME}}

{{WHAT_TO_DO}}

<!--
Keep this file lean — roughly 1,500 words. It is loaded in full every time the skill
triggers, so detail that is only sometimes needed belongs in `references/`, and
anything meant to be copied into the user's project belongs in `assets/`.

That split is progressive disclosure: metadata always in context, SKILL.md on
trigger, references and assets only on demand.
-->

## Quality bar

{{WHAT_MAKES_THE_OUTPUT_CORRECT — the checks that must hold before this is done}}

## Additional resources

- **`references/{{FILE}}.md`** — {{WHAT_IS_IN_IT_AND_WHEN_TO_READ_IT}}
- **`assets/{{PATH}}`** — {{WHAT_IT_IS_FOR}}
