#!/usr/bin/env node
/**
 * Run: node scripts/docs-gate.test.mjs
 *
 * No framework, no fixtures, no disk. The filesystem is faked through the two
 * functions decide() takes, so every branch is reachable and the suite is
 * deterministic on any platform.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { decide, declinePath, denyPayload } from "./docs-gate.mjs";
import { CONTEXT_BUDGET_CHARS, contextPayload, sessionAdvice } from "./session-check.mjs";

const ROOT = path.resolve("/proj");

const config = {
  core: ["README.md", "CLAUDE.md", "CHANGELOG.md"],
  allowExtensions: [".md", ".markdown"],
  allowFilenames: ["LICENSE", "package.json"],
  stateFile: ".claude/precode.json",
};

/** @param {string[]} rootEntries @param {string[]} otherFiles */
function fakeFs(rootEntries = [], otherFiles = []) {
  const files = new Set(otherFiles.map((f) => path.resolve(ROOT, f)));
  return {
    listRoot: () => rootEntries,
    fileExists: (p) => files.has(path.resolve(p)),
  };
}

const at = (p) => path.join(ROOT, p);

test("blocks a code write when the project has no docs", () => {
  const v = decide({ filePath: at("src/app.js"), projectRoot: ROOT, config, ...fakeFs([]) });
  assert.equal(v.allow, false);
  assert.deepEqual(v.missing, ["README.md", "CLAUDE.md", "CHANGELOG.md"]);
});

test("reports only the docs that are actually missing", () => {
  const v = decide({
    filePath: at("src/app.js"),
    projectRoot: ROOT,
    config,
    ...fakeFs(["README.md", "src"]),
  });
  assert.equal(v.allow, false);
  assert.deepEqual(v.missing, ["CLAUDE.md", "CHANGELOG.md"]);
});

test("never blocks a .md write — this is the deadlock guard", () => {
  // If this fails the gate blocks the very documents it demands and the
  // project can never satisfy it.
  for (const f of ["README.md", "docs/adr/0001-x.md", "notes.MARKDOWN"]) {
    const v = decide({ filePath: at(f), projectRoot: ROOT, config, ...fakeFs([]) });
    assert.equal(v.allow, true, `${f} must be allowed`);
  }
});

test("never blocks a bootstrap manifest, so the skill has something to profile", () => {
  for (const f of ["package.json", "LICENSE"]) {
    const v = decide({ filePath: at(f), projectRoot: ROOT, config, ...fakeFs([]) });
    assert.equal(v.allow, true, `${f} must be allowed`);
  }
});

test("matches allowed filenames case-insensitively", () => {
  const v = decide({ filePath: at("license"), projectRoot: ROOT, config, ...fakeFs([]) });
  assert.equal(v.allow, true);
});

test("allows once the full core set is present", () => {
  const v = decide({
    filePath: at("src/app.js"),
    projectRoot: ROOT,
    config,
    ...fakeFs(["README.md", "CLAUDE.md", "CHANGELOG.md"]),
  });
  assert.equal(v.allow, true);
  assert.equal(v.reason, "docs-complete");
});

test("core check is case-insensitive, so Linux behaves like Windows", () => {
  const v = decide({
    filePath: at("src/app.js"),
    projectRoot: ROOT,
    config,
    ...fakeFs(["readme.md", "claude.md", "changelog.md"]),
  });
  assert.equal(v.allow, true);
});

test("honours the opt-out state file", () => {
  const v = decide({
    filePath: at("src/app.js"),
    projectRoot: ROOT,
    config,
    ...fakeFs([], [".claude/precode.json"]),
  });
  assert.equal(v.allow, true);
  assert.equal(v.reason, "opted-out");
});

test("ignores writes outside the project — scratchpads are not its business", () => {
  const v = decide({
    filePath: path.resolve("/tmp/scratch/app.js"),
    projectRoot: ROOT,
    config,
    ...fakeFs([]),
  });
  assert.equal(v.allow, true);
  assert.equal(v.reason, "outside-project");
});

test("fails open when the payload carries no target", () => {
  const cases = [
    { filePath: undefined, projectRoot: ROOT },
    { filePath: at("a.js"), projectRoot: undefined },
  ];
  for (const args of cases) {
    assert.equal(decide({ ...args, config, ...fakeFs([]) }).allow, true);
  }
});

test("deny payload carries the shape Claude Code expects", () => {
  const p = denyPayload(["README.md"]).hookSpecificOutput;
  assert.equal(p.hookEventName, "PreToolUse");
  assert.equal(p.permissionDecision, "deny");
  assert.match(p.permissionDecisionReason, /README\.md/);
  assert.match(p.permissionDecisionReason, /mdfile/);
  assert.match(p.permissionDecisionReason, /precode:docs skip/);
});

// ------------------------------------------- session-scoped "not now" (SessionStart)

test("a decline earlier in the session opens the gate", () => {
  const v = decide({ filePath: at("src/app.js"), projectRoot: ROOT, config, declined: true, ...fakeFs([]) });
  assert.equal(v.allow, true);
  assert.equal(v.reason, "declined-this-session");
});

test("without a decline the same write is still blocked — the flag is the only difference", () => {
  const v = decide({ filePath: at("src/app.js"), projectRoot: ROOT, config, ...fakeFs([]) });
  assert.equal(v.allow, false);
});

test("declinePath refuses anything that is not a plain session id", () => {
  for (const bad of ["../../etc/passwd", "a/b", "a\b", "", "x".repeat(129), null, undefined, 42]) {
    assert.equal(declinePath(bad), null, `should refuse ${JSON.stringify(bad)}`);
  }
  const good = declinePath("64a72d38-9773-4a8c-8072-375aef1a9148");
  assert.ok(good && good.endsWith(".declined"));
  assert.ok(good.includes("precode-sessions"));
});

test("asks only on a genuinely fresh conversation", () => {
  const args = { projectRoot: ROOT, config, ...fakeFs([]) };
  assert.deepEqual(sessionAdvice({ ...args, source: "startup" }), ["README.md", "CLAUDE.md", "CHANGELOG.md"]);
  assert.deepEqual(sessionAdvice({ ...args, source: "clear" }), ["README.md", "CLAUDE.md", "CHANGELOG.md"]);
  // Re-asking a question the user already answered is worse than not asking.
  assert.equal(sessionAdvice({ ...args, source: "resume" }), null);
  assert.equal(sessionAdvice({ ...args, source: "compact" }), null);
});

test("stays quiet when there is nothing to ask about", () => {
  const complete = { projectRoot: ROOT, config, source: "startup", ...fakeFs(["README.md", "CLAUDE.md", "CHANGELOG.md"]) };
  assert.equal(sessionAdvice(complete), null);

  const declined = { projectRoot: ROOT, config, source: "startup", declined: true, ...fakeFs([]) };
  assert.equal(sessionAdvice(declined), null);

  const optedOut = { projectRoot: ROOT, config, source: "startup", ...fakeFs([], [".claude/precode.json"]) };
  assert.equal(sessionAdvice(optedOut), null);

  assert.equal(sessionAdvice({ ...declined, projectRoot: undefined, declined: false }), null);
});

test("the session instruction tells Claude to ask once and how to honour a no", () => {
  const c = contextPayload(["README.md"], "sess-123").hookSpecificOutput;
  assert.equal(c.hookEventName, "SessionStart");
  assert.match(c.additionalContext, /README\.md/);
  assert.match(c.additionalContext, /ONCE/);
  assert.match(c.additionalContext, /mdfile/);
  assert.match(c.additionalContext, /--decline sess-123/);
});

test("the gate and the session check agree on what is missing", () => {
  // Two copies of this rule would drift, and a drifted gate can never be satisfied.
  const fs = fakeFs(["README.md"]);
  const fromGate = decide({ filePath: at("a.js"), projectRoot: ROOT, config, ...fs }).missing;
  const fromSession = sessionAdvice({ source: "startup", projectRoot: ROOT, config, ...fs });
  assert.deepEqual(fromGate, fromSession);
  assert.deepEqual(fromGate, ["CLAUDE.md", "CHANGELOG.md"]);
});

test("the SessionStart injection stays inside its budget", () => {
  // Every fresh conversation in an undocumented project pays for this text. It had
  // no ceiling at all until now, while the sibling plugin enforced one - so this is
  // the guard against it growing a paragraph at a time.
  const text = contextPayload(
    ["README.md", "CLAUDE.md", "CHANGELOG.md"],
    "s".repeat(128), // the longest session id declinePath() will accept
  ).hookSpecificOutput.additionalContext;
  assert.ok(
    text.length <= CONTEXT_BUDGET_CHARS,
    `${text.length} > ${CONTEXT_BUDGET_CHARS}`,
  );
});

test("the injection names every missing document, so the count cannot silently truncate", () => {
  const text = contextPayload(["README.md", "CLAUDE.md", "CHANGELOG.md"], "s1")
    .hookSpecificOutput.additionalContext;
  for (const doc of ["README.md", "CLAUDE.md", "CHANGELOG.md"]) {
    assert.ok(text.includes(doc), doc);
  }
});
