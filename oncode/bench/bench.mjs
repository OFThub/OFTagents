#!/usr/bin/env node
// oncode benchmark - measures what a raw prompt and its ideal-prompt rewrite
// actually cost, by running both through `claude -p --output-format json` and
// reading the real usage numbers back.
//
// This spends money. Nothing here is estimated: every figure in the output comes
// from the CLI's own `usage` block.
//
// Usage:
//   node oncode/bench/bench.mjs --dry-run          print the commands, spend nothing
//   node oncode/bench/bench.mjs --case bugfix      run one case (2 invocations)
//   node oncode/bench/bench.mjs                    run every case
//   node oncode/bench/bench.mjs --model haiku      cheaper, still comparable
//
// Method note: every invocation pays the same fixed harness cost (plugins, skills
// and MCP servers loaded into the cache). That constant is identical in both arms,
// so the honest figure is the DELTA between them, not the absolute total. Both are
// reported.

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASES_PATH = path.join(HERE, "cases.json");
const FIXTURE = path.join(HERE, "fixture");
const RESULTS = path.join(HERE, "results.json");

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(name);

const config = JSON.parse(readFileSync(CASES_PATH, "utf8"));
const model = flag("--model", config.model);
const only = flag("--case", null);
const dryRun = has("--dry-run");

const cases = only ? config.cases.filter((c) => c.id === only) : config.cases;
if (cases.length === 0) {
  console.error(
    `no case named ${JSON.stringify(only)}. Have: ${config.cases.map((c) => c.id).join(", ")}`,
  );
  process.exit(1);
}

function claudeArgs(prompt) {
  return [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--model",
    model,
    "--max-turns",
    String(config.maxTurns),
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    config.allowedTools,
    // Hooks off, MCP off. Not a convenience: with the local hooks live, the
    // precode gate denied every Edit in the fixture (it has no CLAUDE.md), and
    // oncode's own UserPromptSubmit hook injected "apply ideal-prompt" into the
    // RAW arm too. Both arms then measured how long each one argued with a gate
    // instead of doing the task. A benchmark of a prompt must see only the prompt.
    "--settings",
    '{"disableAllHooks":true}',
    "--strict-mcp-config",
  ];
}

// Each arm gets an untouched copy: the bugfix arm edits files, and a second run
// against an already-fixed tree would measure nothing.
function freshWorkspace(caseId, arm) {
  const dir = mkdtempSync(path.join(os.tmpdir(), `oncode-bench-${caseId}-${arm}-`));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

function cleanup(dir) {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
  } catch (error) {
    // Windows holds a handle for a moment after the child exits. A workspace we
    // cannot delete is litter, never a reason to lose the measurement.
    console.error("  (cleanup skipped: " + dir + ")");
  }
}

// Objective success check, so "cheaper" can never just mean "did less".
function verify(cwd, command) {
  if (!command) return null;
  const [bin, ...rest] = command.split(" ");
  // Resolve "node" to this very interpreter: no shell, so nothing is concatenated
  // unescaped, and there is no PATHEXT lookup to fail on Windows.
  const exe = bin === "node" ? process.execPath : bin;
  const r = spawnSync(exe, rest, { cwd, encoding: "utf8", shell: false });
  // A launch failure is NOT a failing test. Reporting it as one would quietly
  // turn "the harness could not run the check" into "the agent did not fix it".
  if (r.error || r.status === null) {
    return { ok: null, why: "verifier could not run: " + (r.error?.message ?? "no exit status") };
  }
  const tail = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-6).join("\n");
  return { ok: r.status === 0, why: tail };
}

function runArm(testCase, arm) {
  const prompt = testCase[arm];
  const cwd = freshWorkspace(testCase.id, arm);

  if (dryRun) {
    console.log(`\n[dry-run] ${testCase.id}/${arm} in ${cwd}`);
    console.log(
      `  claude ${claudeArgs(prompt)
        .map((a) => (a.includes(" ") ? JSON.stringify(a) : a))
        .join(" ")}`,
    );
    cleanup(cwd);
    return null;
  }

  const started = Date.now();
  let parsed;
  try {
    const stdout = execFileSync("claude", claudeArgs(prompt), {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    parsed = JSON.parse(stdout);
  } catch (error) {
    const detail = `${String(error.stderr ?? "")}${String(error.stdout ?? "")}`.trim().slice(-400);
    console.error(`  ${testCase.id}/${arm} FAILED: ${String(error.message).slice(0, 120)}`);
    if (detail) console.error(`    ${detail.replace(/\n/g, "\n    ")}`);
    cleanup(cwd);
    return { caseId: testCase.id, arm, error: true, detail };
  }

  const u = parsed.usage ?? {};
  const inputTokens =
    (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);

  const row = {
    caseId: testCase.id,
    arm,
    promptChars: prompt.length,
    inputTokens,
    freshInputTokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
    outputTokens: u.output_tokens ?? 0,
    numTurns: parsed.num_turns ?? null,
    costUsd: parsed.total_cost_usd ?? null,
    terminalReason: parsed.terminal_reason ?? null,
    // Recorded because a silently blocked tool once made both arms look like
    // failures for the same reason, and nothing in the output said so.
    permissionDenials: (parsed.permission_denials ?? []).map((d) => d.tool_name),
    resultText: String(parsed.result ?? "").slice(0, 600),
    wallMs: Date.now() - started,
    verify: verify(cwd, testCase.verify),
  };

  cleanup(cwd);
  console.log(
    `  ${testCase.id}/${arm.padEnd(5)} in=${row.inputTokens} out=${row.outputTokens} ` +
      `turns=${row.numTurns} $${(row.costUsd ?? 0).toFixed(4)}` +
      (row.verify === null ? "" : ` verified=${row.verify.ok === null ? "UNKNOWN" : row.verify.ok ? "PASS" : "FAIL"}`),
  );
  return row;
}

const runs = [];
for (const testCase of cases) {
  console.log(`\n== ${testCase.id} ==`);
  for (const arm of ["raw", "ideal"]) {
    const row = runArm(testCase, arm);
    if (row) runs.push(row);
  }
}

if (dryRun) {
  console.log("\ndry run complete, nothing was spent.");
  process.exit(0);
}

const results = { model, generatedAt: new Date().toISOString(), maxTurns: config.maxTurns, runs };
writeFileSync(RESULTS, JSON.stringify(results, null, 2) + "\n", "utf8");

// --- markdown table, ready to paste into the README ------------------------

// delta is ideal - raw, so a negative number is a saving. Signs are printed
// explicitly: an earlier version rendered "-" + a negative and produced "--173073",
// which read as a saving while actually being a 35% increase.
const signed = (n) => (n > 0 ? `+${n}` : String(n));
const pct = (raw, ideal) => (raw === 0 ? "-" : `${ideal > raw ? "+" : ""}${Math.round(((ideal - raw) / raw) * 100)}%`);
const get = (id, arm) => runs.find((r) => r.caseId === id && r.arm === arm && !r.error);

console.log(`\n\n### Measured with \`${model}\`, ${results.generatedAt.slice(0, 10)}\n`);
console.log("| Case | Arm | Prompt chars | Input tokens | Output tokens | Turns | Cost | Task done |");
console.log("|---|---|---:|---:|---:|---:|---:|---|");
for (const testCase of cases) {
  for (const arm of ["raw", "ideal"]) {
    const r = get(testCase.id, arm);
    if (!r) continue;
    const done = !r.verify ? "-" : r.verify.ok === null ? "?" : r.verify.ok ? "yes" : "**no**";
    console.log(
      `| ${testCase.id} | ${arm} | ${r.promptChars} | ${r.inputTokens} | ${r.outputTokens} | ` +
        `${r.numTurns} | $${r.costUsd.toFixed(4)} | ${done} |`,
    );
  }
  const a = get(testCase.id, "raw");
  const b = get(testCase.id, "ideal");
  if (a && b) {
    console.log(
      `| **${testCase.id}** | **delta** | ${signed(b.promptChars - a.promptChars)} | ` +
        `**${signed(b.inputTokens - a.inputTokens)}** (${pct(a.inputTokens, b.inputTokens)}) | ` +
        `**${signed(b.outputTokens - a.outputTokens)}** (${pct(a.outputTokens, b.outputTokens)}) | ` +
        `${signed(b.numTurns - a.numTurns)} | **${b.costUsd >= a.costUsd ? "+" : "-"}$${Math.abs(a.costUsd - b.costUsd).toFixed(4)}** | |`,
    );
  }
}

// Only cases where BOTH arms completed may be summed. An earlier run lost one
// ideal arm to a crash and still printed a total, comparing 3 raw runs against
// 2 ideal ones - a "saving" that was really a missing measurement.
const complete = cases.filter((c) => get(c.id, "raw") && get(c.id, "ideal")).map((c) => c.id);
const dropped = cases.map((c) => c.id).filter((id) => !complete.includes(id));
const sum = (arm, key) =>
  runs
    .filter((r) => r.arm === arm && !r.error && complete.includes(r.caseId))
    .reduce((n, r) => n + (r[key] ?? 0), 0);

console.log(
  `\nTotals over ${complete.length} complete pair(s) [${complete.join(", ")}] - ` +
    `input ${sum("raw", "inputTokens")} -> ${sum("ideal", "inputTokens")}, ` +
    `output ${sum("raw", "outputTokens")} -> ${sum("ideal", "outputTokens")}, ` +
    `cost $${sum("raw", "costUsd").toFixed(4)} -> $${sum("ideal", "costUsd").toFixed(4)}`,
);
if (dropped.length) console.log(`EXCLUDED (an arm did not complete): ${dropped.join(", ")}`);

const denied = runs.filter((r) => r.permissionDenials?.length);
if (denied.length) {
  console.log(`\nWARNING - tools were denied, these numbers measure the block, not the task:`);
  for (const r of denied) console.log(`  ${r.caseId}/${r.arm}: ${r.permissionDenials.join(", ")}`);
}
console.log(`\nRaw numbers written to ${path.relative(process.cwd(), RESULTS)}`);
