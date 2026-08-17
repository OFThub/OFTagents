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
import { decide, denyPayload } from "./docs-gate.mjs";

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
