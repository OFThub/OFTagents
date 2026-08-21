#!/usr/bin/env node
// oncode — the ideal-prompt and lean-reply switches, and the UserPromptSubmit entry point.
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

// Every flag the CLI answers to, derived rather than written down twice.
//
// The mode shortcuts come from config.modes, so adding a mode to the config gives
// it a working `--<mode>` for free. This exists because the docs once promised
// `--review`, `--advise` and `--auto` while runFlags answered "unknown flag" to
// all three: a hand-kept second list drifted, exactly as this repo's own rule warns.
export const flagList = (config) => [
  "--open",
  "--close",
  "--mode",
  "--language",
  "--status",
  "--reply-open",
  "--reply-close",
  ...config.modes.map((m) => `--${m}`),
];

// The reply switch may ride along with any of these; on its own it is the command.
export const primaryFlags = (config) =>
  flagList(config).filter((f) => f !== "--reply-open" && f !== "--reply-close");

export function statePath(homedir, config) {
  return path.join(homedir, ...config.stateDir.split("/"), "state.json");
}

// The official plugin-dev doc names this field `user_prompt`; working hooks show
// `prompt`. Reading both closes the question without betting on either.
export const promptOf = (payload) => payload?.prompt ?? payload?.user_prompt ?? "";

export function defaultState(config) {
  return {
    // Configured, not hardcoded: flipping the shipped default must not need a
    // code change. Ships open; `--close` is one command away.
    open: config.defaultOpen === true,
    replyOpen: config.replyDefaultOpen === true,
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

// Pure: takes the file's text, never the file.
//
// A missing file and a corrupt file are the same situation: the user's choice is
// unknown, so both fall back to the configured default. Only an explicit boolean
// counts as a decision — someone who ran `--close` keeps it, and a file that was
// merely truncated does not silently disable a feature meant to be on.
//
// The real safety net is elsewhere and unchanged: if this script throws, the hook
// exits 0 with no output and the prompt goes through untouched.
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
    open: typeof parsed.open === "boolean" ? parsed.open : fallback.open,
    // Additive: a state file written before lean-reply existed has no such field,
    // which is absence, not a decision, so it takes the configured default.
    replyOpen: typeof parsed.replyOpen === "boolean" ? parsed.replyOpen : fallback.replyOpen,
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

// The reply switch. Deliberately does NOT share shouldOptimize's bypasses.
//
// The "/" bypass there is a deadlock guard: without it the `--close` command
// itself would be rewritten and the switch could never be turned off again.
// Nothing like that applies here - this directive shapes the answer and never
// touches the prompt, so there is no command it can swallow.
//
// A bare "evet" is skipped there and kept here for the same reason in reverse:
// a confirmation is usually what kicks off the real work and the write-up that
// follows it, which is exactly where the model rambles. Passing on those to save
// ~60 tokens would give up most of the saving.
export function shouldShapeReply({ prompt, state }) {
  if (!state?.replyOpen) return false;
  return typeof prompt === "string" && prompt.trim() !== "";
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
// `parts` names which switches are open. They are independent: either block can
// appear alone, and when both are closed the caller never reaches this function.
export function injectionText(state, pressure, config, parts = { optimize: true, reply: false }) {
  const lines = [];

  if (parts.optimize) {
    lines.push(
      `oncode: ideal-prompt is OPEN (mode: ${state.mode}, code language: ${state.language}).`,
      // Lazy load. The triage test is ~20 tokens; the skill it guards is ~2400, and
      // the skill's own text says most prompts that reach it end at exactly this
      // test. Carrying the question here means the file is opened only by a prompt
      // that actually needs rewriting. Break-even is ~125 optimized prompts in one
      // session, and a prompt that fails triage pays both - an expected gain, not a
      // guaranteed one.
      `${config.triageDirective} ${MODE_HINT[state.mode] ?? ""}`.trim(),
    );
  }

  // The whole rule travels inside this string on purpose. Pointing at lean-reply's
  // SKILL.md instead would make the model read ~1.5k tokens on EVERY prompt in
  // order to save output tokens - the skill would burn more than it saves.
  if (parts.reply) lines.push(config.replyDirective);

  if (pressure?.warn && lines.length > 0) {
    const mb = Math.round(pressure.bytes / 1e6);
    lines.push(`Transcript is ~${mb}MB — offer /compact <focus> (same task) or /clear (new task).`);
  }

  return lines.join("\n");
}

export function hookPayload(state, pressure, config, parts) {
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: injectionText(state, pressure, config, parts),
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
  const ideal = state.open ? "OPEN" : "closed";
  const reply = state.replyOpen ? "OPEN" : "closed";
  return (
    `oncode: ideal-prompt ${ideal} (mode: ${state.mode}, code language: ${state.language})` +
    ` | lean-reply ${reply}.`
  );
}

export function runFlags(argv, state, config, write = writeState) {
  // The two switches are independent, so `--open --reply-open` has to set both.
  // Reading the reply flag from anywhere in argv - rather than only from argv[0] -
  // is a longer branch than the rest, but silently dropping a flag the user typed
  // is the worse outcome. Last occurrence wins, as CLI flags normally do.
  const replyFlags = argv.filter((a) => a === "--reply-open" || a === "--reply-close");
  const working = replyFlags.length
    ? { ...state, replyOpen: replyFlags[replyFlags.length - 1] === "--reply-open" }
    : state;

  const [flag] = argv;

  // A reply flag on its own is the whole command; otherwise it rides along with
  // the primary flag below and is written by that branch.
  if (replyFlags.length && !primaryFlags(config).includes(flag)) {
    write(working, config);
    return report(working);
  }

  if (flag === "--status") return report(working);

  if (flag === "--close") {
    write({ ...working, open: false }, config);
    return "oncode: ideal-prompt closed. Prompts pass through untouched until --open.";
  }

  if (flag === "--open") {
    const next = { ...working, open: true };
    const at = argv.indexOf("--mode");
    if (at !== -1) {
      const mode = argv[at + 1];
      if (!config.modes.includes(mode)) {
        return `oncode: invalid mode ${JSON.stringify(mode)}. Valid: ${config.modes.join(", ")}`;
      }
      next.mode = mode;
    }
    write(next, config);
    return report(next);
  }

  // `--review` is `--mode review`. Derived from config.modes, so a new mode gets
  // its shortcut automatically and the flag table can never fall behind the code.
  const shorthand = config.modes.find((m) => flag === `--${m}`);
  if (shorthand) {
    const next = { ...working, mode: shorthand };
    write(next, config);
    return report(next);
  }

  if (flag === "--mode") {
    const mode = argv[1];
    if (!config.modes.includes(mode)) {
      return `oncode: invalid mode ${JSON.stringify(mode)}. Valid: ${config.modes.join(", ")}`;
    }
    const next = { ...working, mode };
    write(next, config);
    return report(next);
  }

  if (flag === "--language") {
    const language = normalizeLanguage(argv[1], config);
    if (language === null) {
      return `oncode: invalid language ${JSON.stringify(argv[1])}. Use "auto" or a tag like "en", "tr", "pt-BR".`;
    }
    const next = { ...working, language };
    write(next, config);
    return report(next);
  }

  return `oncode: unknown flag ${JSON.stringify(flag)}. Try: ${flagList(config).join(", ")}.`;
}

async function main(argv) {
  const config = loadConfig();
  const state = loadStateFromDisk(config);

  if (argv.length > 0) {
    console.log(runFlags(argv, state, config));
    return;
  }

  const payload = JSON.parse(await readStdin());
  const prompt = promptOf(payload);
  const verdict = shouldOptimize({ prompt, state, config });
  const reply = shouldShapeReply({ prompt, state });
  if (!verdict.optimize && !reply) return; // both switches closed: silent, exit 0

  const pressure = contextPressure({
    payload,
    state,
    config,
    statSize: (target) => statSync(target).size,
  });
  if (pressure.warn) writeState({ ...state, lastWarnBytes: pressure.bytes }, config);

  const parts = { optimize: verdict.optimize, reply };
  console.log(JSON.stringify(hookPayload(state, pressure, config, parts)));
}

// Only run the shell when executed directly, so the test can import the module.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  // Any failure exits 0 with no output: the prompt goes through unoptimized.
  main(process.argv.slice(2)).catch(() => {});
}
