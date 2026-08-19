#!/usr/bin/env node
// oncode — the ideal-prompt switch and the UserPromptSubmit entry point.
//
// Shape follows precode/scripts/docs-gate.mjs: pure functions are exported, a thin
// CLI shell sits at the bottom. Every dependency that touches the outside world
// (state text, file size) is injected, so the tests run without a disk.
//
// Fail-open here is the INVERSE of precode's. precode fails open by allowing the
// write; oncode fails open by NOT optimizing. A broken optimizer must keep its
// hands off the user's prompts.

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(HERE, "..", "config", "prompt-rules.json");

// What each mode tells the model to do once the skill has rewritten the prompt.
// The mode *list* lives in the config; this map only supplies wording. A test
// asserts every configured mode has an entry, so the two cannot drift apart.
export const MODE_HINT = {
  review: "Show the rewrite + rationale, get approval, then execute.",
  advise: "Show the rewrite and stop. Do not execute.",
  auto: "Rewrite silently and execute. Skip the rationale.",
};

export function loadConfig(readFile = () => readFileSync(CONFIG_PATH, "utf8")) {
  return JSON.parse(readFile());
}

export function statePath(homedir, config) {
  return path.join(homedir, ...config.stateDir.split("/"), "state.json");
}

// The official plugin-dev doc names this field `user_prompt`; working hooks show
// `prompt`. Reading both closes the question without betting on either.
export const promptOf = (payload) => payload?.prompt ?? payload?.user_prompt ?? "";

export function defaultState(config) {
  return {
    open: false,
    mode: config.defaultMode,
    language: config.defaultCodeLanguage,
    lastWarnBytes: 0,
  };
}

// A language tag is external input used to steer generated code. Validate it and
// refuse what does not match — never coerce it to something nearby.
export function normalizeLanguage(value, config) {
  if (typeof value !== "string") return null;
  return new RegExp(config.languagePattern).test(value) ? value : null;
}

// Pure: takes the file's text, never the file. Anything unparseable degrades to
// the default state, whose `open` is false — a corrupt state file must not leave
// the switch stuck on.
export function readState(raw, config) {
  const fallback = defaultState(config);
  if (typeof raw !== "string" || raw.trim() === "") return fallback;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;

  const lastWarnBytes =
    Number.isInteger(parsed.lastWarnBytes) && parsed.lastWarnBytes >= 0 ? parsed.lastWarnBytes : 0;

  return {
    open: parsed.open === true,
    mode: config.modes.includes(parsed.mode) ? parsed.mode : fallback.mode,
    language: normalizeLanguage(parsed.language, config) ?? fallback.language,
    lastWarnBytes,
  };
}

export function writeState(next, config, homedir = os.homedir()) {
  const target = statePath(homedir, config);
  mkdirSync(path.dirname(target), { recursive: true });
  const body = { ...next, at: new Date().toISOString() };
  writeFileSync(target, JSON.stringify(body, null, 2) + "\n", "utf8");
  return target;
}

// The switch-off deadlock guard lives in step 2. Without the "/" bypass the
// `/oncode:ideal-prompt --close` command would itself be captured for rewriting,
// and the switch could never be turned off again. Same class of bug as precode's
// `.md` allowlist, and it is pinned by a test of the same name.
export function shouldOptimize({ prompt, state, config }) {
  if (!state?.open) return { optimize: false, reason: "closed" };

  const text = typeof prompt === "string" ? prompt.trim() : "";
  if (text === "") return { optimize: false, reason: "empty" };

  for (const prefix of config.bypassPrefixes) {
    if (text.startsWith(prefix)) {
      const reason =
        prefix === "/" ? "slash-command" : prefix === "!" ? "bash-passthrough" : "bypass-prefix";
      return { optimize: false, reason };
    }
  }

  if (config.bypassExact.includes(text.toLowerCase())) {
    return { optimize: false, reason: "confirmation" };
  }

  return { optimize: true, reason: "optimize" };
}

// Context pressure, measured for free: one stat() on the transcript, no parsing.
//
// ponytail: the plan called for a turn counter with a cooldown, but the
// UserPromptSubmit payload carries no turn number — counting would mean writing
// state on every single prompt. Transcript size only grows, so warning once per
// further `contextWarnBytes` of growth gives the same cooldown for one syscall
// and a write only when it actually warns.
export function contextPressure({ payload, state, config, statSize }) {
  const target = payload?.transcript_path;
  if (typeof target !== "string" || target === "") return { warn: false, bytes: 0 };

  let bytes;
  try {
    bytes = statSize(target);
  } catch {
    return { warn: false, bytes: 0 }; // a failed measurement never blocks a prompt
  }
  if (!Number.isFinite(bytes) || bytes <= 0) return { warn: false, bytes: 0 };

  const step = config.contextWarnBytes;
  const last = state?.lastWarnBytes ?? 0;
  if (bytes < step || bytes - last < step) return { warn: false, bytes };

  return { warn: true, bytes };
}

// Kept deliberately short: this text is injected on every non-bypassed prompt.
// A "token optimizer" that spends 500 tokens per prompt to save tokens is a net
// loss, so the budget is enforced by config and pinned by a test.
export function injectionText(state, pressure, config) {
  const lines = [
    `oncode: ideal-prompt is OPEN (mode: ${state.mode}, code language: ${state.language}).`,
    `Apply the ideal-prompt skill to the message above before acting on it. ${
      MODE_HINT[state.mode] ?? ""
    }`.trim(),
  ];

  if (pressure?.warn) {
    const mb = Math.round(pressure.bytes / 1e6);
    lines.push(`Transcript is ~${mb}MB — offer /compact <focus> (same task) or /clear (new task).`);
  }

  return lines.join("\n");
}

export function hookPayload(state, pressure, config) {
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: injectionText(state, pressure, config),
    },
  };
}

// ---------------------------------------------------------------------------
// CLI shell
// ---------------------------------------------------------------------------

function loadStateFromDisk(config, homedir = os.homedir()) {
  try {
    return readState(readFileSync(statePath(homedir, config), "utf8"), config);
  } catch {
    return defaultState(config);
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function report(state) {
  const status = state.open ? "OPEN" : "closed";
  return `oncode: ideal-prompt ${status} (mode: ${state.mode}, code language: ${state.language}).`;
}

function runFlags(argv, state, config) {
  const [flag] = argv;

  if (flag === "--status") return report(state);

  if (flag === "--close") {
    writeState({ ...state, open: false }, config);
    return "oncode: ideal-prompt closed. Prompts pass through untouched until --open.";
  }

  if (flag === "--open") {
    const next = { ...state, open: true };
    const at = argv.indexOf("--mode");
    if (at !== -1) {
      const mode = argv[at + 1];
      if (!config.modes.includes(mode)) {
        return `oncode: invalid mode ${JSON.stringify(mode)}. Valid: ${config.modes.join(", ")}`;
      }
      next.mode = mode;
    }
    writeState(next, config);
    return report(next);
  }

  if (flag === "--mode") {
    const mode = argv[1];
    if (!config.modes.includes(mode)) {
      return `oncode: invalid mode ${JSON.stringify(mode)}. Valid: ${config.modes.join(", ")}`;
    }
    const next = { ...state, mode };
    writeState(next, config);
    return report(next);
  }

  if (flag === "--language") {
    const language = normalizeLanguage(argv[1], config);
    if (language === null) {
      return `oncode: invalid language ${JSON.stringify(argv[1])}. Use "auto" or a tag like "en", "tr", "pt-BR".`;
    }
    const next = { ...state, language };
    writeState(next, config);
    return report(next);
  }

  return `oncode: unknown flag ${JSON.stringify(flag)}. Try --open, --close, --mode, --language, --status.`;
}

async function main(argv) {
  const config = loadConfig();
  const state = loadStateFromDisk(config);

  if (argv.length > 0) {
    console.log(runFlags(argv, state, config));
    return;
  }

  const payload = JSON.parse(await readStdin());
  const verdict = shouldOptimize({ prompt: promptOf(payload), state, config });
  if (!verdict.optimize) return; // silent, exit 0

  const pressure = contextPressure({
    payload,
    state,
    config,
    statSize: (target) => statSync(target).size,
  });
  if (pressure.warn) writeState({ ...state, lastWarnBytes: pressure.bytes }, config);

  console.log(JSON.stringify(hookPayload(state, pressure, config)));
}

// Only run the shell when executed directly, so the test can import the module.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  // Any failure exits 0 with no output: the prompt goes through unoptimized.
  main(process.argv.slice(2)).catch(() => {});
}
