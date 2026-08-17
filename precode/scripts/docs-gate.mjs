#!/usr/bin/env node
/**
 * precode documentation gate — PreToolUse(Write|Edit)
 *
 * Denies the first code write into a project that has no documentation baseline,
 * and points Claude at the `mdfile` skill to create one. Once the baseline exists
 * the gate never fires again.
 *
 * Shape: a pure `decide()` plus a thin CLI shell. The filesystem is injected so
 * the test can exercise every branch without touching disk or spawning a process.
 *
 * The gate NEVER writes. A read-only check must not have side effects, and it has
 * no business creating directories inside the user's project.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(HERE, "..", "config", "required-docs.json");

/** Windows compares paths case-insensitively; POSIX does not. */
function samePath(a, b) {
  const norm = (p) =>
    process.platform === "win32" ? path.resolve(p).toLowerCase() : path.resolve(p);
  return norm(a) === norm(b);
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  // Empty means identical; a leading ".." or an absolute result means it escaped.
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * @param {object}   o
 * @param {string}   o.filePath     absolute path the tool wants to write
 * @param {string}   o.projectRoot  absolute project root
 * @param {object}   o.config       parsed required-docs.json
 * @param {(p: string) => boolean} o.fileExists
 * @param {() => string[]}         o.listRoot  entry names directly under projectRoot
 * @returns {{allow: true, reason: string} | {allow: false, missing: string[]}}
 */
export function decide({ filePath, projectRoot, config, fileExists, listRoot }) {
  // Nothing to judge — fail open rather than guess.
  if (!filePath || !projectRoot) return { allow: true, reason: "no-target" };

  const base = path.basename(filePath);
  const ext = path.extname(base).toLowerCase();

  // 1. Documents and bootstrap manifests are never blocked.
  //    Without the .md allowance the gate blocks the very files it demands,
  //    and the project can never satisfy it. This branch is the deadlock guard.
  if (config.allowExtensions.includes(ext)) return { allow: true, reason: "doc-file" };
  if (config.allowFilenames.some((n) => n.toLowerCase() === base.toLowerCase())) {
    return { allow: true, reason: "bootstrap-manifest" };
  }

  // 2. Scratchpads, temp dirs and anything outside the project are not our business.
  if (!isInside(path.resolve(filePath), path.resolve(projectRoot))) {
    return { allow: true, reason: "outside-project" };
  }

  // 3. Explicit user opt-out via `/precode:docs skip`.
  if (fileExists(path.join(projectRoot, config.stateFile))) {
    return { allow: true, reason: "opted-out" };
  }

  // 4. The actual check. One readdir beats N stats, and lowercasing makes it
  //    behave the same on Linux as it already does on Windows.
  const present = new Set(listRoot().map((n) => n.toLowerCase()));
  const missing = config.core.filter((doc) => !present.has(doc.toLowerCase()));

  return missing.length === 0 ? { allow: true, reason: "docs-complete" } : { allow: false, missing };
}

export function denyPayload(missing) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        `precode: this project has no documentation baseline. Missing: ${missing.join(", ")}. ` +
        `Invoke the "mdfile" skill to generate the project's markdown documentation, then retry this write. ` +
        `To bypass permanently for this project: /precode:docs skip`,
    },
  };
}

// ---------------------------------------------------------------- CLI shell

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  // Every failure path below exits 0 (allow). A broken gate must never brick a
  // session — the cost of a missed check is a doc-less project, the cost of a
  // stuck gate is an unusable Claude Code.
  let payload;
  let config;
  try {
    payload = JSON.parse((await readStdin()) || "{}");
    config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    process.exit(0);
  }

  const projectRoot = process.env.CLAUDE_PROJECT_DIR || payload.cwd;
  const filePath = payload?.tool_input?.file_path;

  const verdict = decide({
    filePath,
    projectRoot,
    config,
    fileExists: (p) => existsSync(p),
    listRoot: () => {
      try {
        return readdirSync(projectRoot);
      } catch {
        return [];
      }
    },
  });

  // The decision travels in the JSON body, not the exit code: exit 0 either way.
  if (!verdict.allow) process.stdout.write(JSON.stringify(denyPayload(verdict.missing)));
  process.exit(0);
}

// Run only when executed directly, so the test can import decide() cleanly.
if (process.argv[1] && samePath(process.argv[1], fileURLToPath(import.meta.url))) {
  main();
}
