# Security Policy

## Supported Versions

OFTagents is pre-1.0. Only the latest release receives fixes; there is no backport branch.

| Version | Supported |
| --- | --- |
| `precode` 0.1.x | ✅ |
| earlier | ❌ |

## Reporting a Vulnerability

**Do not open a public issue for a security vulnerability.**

Report privately through GitHub Security Advisories:

<https://github.com/OFThub/OFTagents/security/advisories/new>

Include:

- what the vulnerability is and the impact you believe it has
- steps to reproduce, or a proof of concept
- affected versions
- any mitigation you are aware of

## What to expect

OFTagents is maintained by one person in their own time. These are best-effort targets,
not a contractual SLA:

| Stage | Target |
| --- | --- |
| Acknowledgement | within 7 days |
| Initial assessment | within 14 days |
| Fix or mitigation plan | within 30 days |

If you have not heard back within the acknowledgement window, assume the notification was
missed and open a public issue saying only *"security report awaiting response"* — with no
details — to get attention.

## Threat model

A Claude Code plugin runs with the privileges of the user's editor session, so the
interesting attack surface here is narrow but real:

| Surface | Position |
| --- | --- |
| **Hook scripts** (`docs-gate.mjs`, `session-check.mjs`) | Execute on every `Write`/`Edit` and at session start. They read a JSON payload from stdin that originates outside the plugin. Treat everything in that payload as untrusted. |
| **Session identifiers** | Used to build a file path. `declinePath()` accepts only `[A-Za-z0-9_-]{1,128}` and refuses anything else outright rather than trying to sanitise it. Path traversal via `session_id` is the concrete risk this guards. |
| **Files written** | The gate writes nothing at all. The only write in the plugin is the session decline marker, and it lands in the OS temp directory — never in the user's project. |
| **Network** | None. The plugin makes no network requests and has no dependencies. |
| **Generated documents** | `mdfile` writes Markdown into the user's project. It never overwrites an existing file. |

Reports that demonstrate a path escaping the temp directory, a hook that can be made to
write into an unexpected location, or a way to make the gate exit non-zero in a way that
blocks a session are all in scope.

Out of scope: the gate allowing a write it should have blocked. The gate is fail-open by
design — a broken gate must cost a missed check, never a bricked editor session.

## Disclosure

Coordinated disclosure. Please give 90 days for a fix to ship before publishing details.
Credit is given to reporters unless anonymity is requested.
