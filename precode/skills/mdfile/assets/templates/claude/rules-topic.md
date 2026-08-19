<!--
A single-topic rule file under `.claude/rules/`. The filename is yours to choose and
should name the topic, not the document: `testing.md`, `security.md`, `migrations.md`.

Scope each file to ONE topic. A rules file that covers testing and deployment and
naming gets loaded whole for a question about any of them, and the irrelevant two
thirds crowd out the part that mattered.

Write rules that are checkable. "Write clean code" changes no behaviour; "every new
endpoint MUST have an integration test in tests/api/" does.
-->

# {{TOPIC}}

{{ONE_SENTENCE_SCOPE — when this file applies}}

## Rules

- MUST {{NON_NEGOTIABLE_RULE}}.
- MUST NOT {{FORBIDDEN_THING}} — {{WHAT_BREAKS_IF_YOU_DO}}.
- SHOULD {{STRONG_DEFAULT}}, unless {{JUSTIFIED_EXCEPTION}}.
- MAY {{PERMITTED_OPTION}}.

<!-- RFC 2119 keywords, used deliberately: MUST is enforced, SHOULD is a default with
     a documented escape, MAY is genuinely optional. If everything is MUST, nothing is. -->

## How to do it here

```{{LANGUAGE}}
{{SMALLEST_CORRECT_EXAMPLE_FROM_THIS_CODEBASE}}
```

## Common mistakes

| Mistake | Why it bites | Instead |
| --- | --- | --- |
| {{MISTAKE}} | {{CONSEQUENCE}} | {{CORRECTION}} |

## Where this is enforced

{{ENFORCEMENT — the test, hook, lint rule or review step that catches a violation}}

<!-- A rule with no enforcement point is a wish. Name the check, or say plainly that
     the only enforcement is review. -->
