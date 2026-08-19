// Unit tests: node:test only, no framework, no disk.
// Run: node oncode/scripts/prompt-mode.test.mjs

import assert from "node:assert/strict";
import test from "node:test";

import {
  MODE_HINT,
  contextPressure,
  defaultState,
  hookPayload,
  injectionText,
  loadConfig,
  normalizeLanguage,
  promptOf,
  readState,
  shouldOptimize,
  statePath,
} from "./prompt-mode.mjs";

// The real config, so a broken or renamed field fails here rather than in production.
const config = loadConfig();
const open = (over = {}) => ({ ...defaultState(config), open: true, ...over });

// --- the switch must always be closable ------------------------------------

test("switch-off deadlock guard: the --close command itself is never optimized", () => {
  // Without the "/" bypass this prompt would be captured for rewriting and the
  // switch could never be turned off again. Mirrors precode's `.md` deadlock guard.
  const verdict = shouldOptimize({
    prompt: "/oncode:ideal-prompt --close",
    state: open(),
    config,
  });
  assert.equal(verdict.optimize, false);
  assert.equal(verdict.reason, "slash-command");
});

test("every slash command is bypassed, not just oncode's own", () => {
  for (const prompt of ["/clear", "/compact focus on the API", "/precode:docs check"]) {
    assert.equal(shouldOptimize({ prompt, state: open(), config }).optimize, false, prompt);
  }
});

// --- the switch ------------------------------------------------------------

test("closed: the hook stays silent", () => {
  const verdict = shouldOptimize({ prompt: "fix the login bug", state: defaultState(config), config });
  assert.equal(verdict.optimize, false);
  assert.equal(verdict.reason, "closed");
});

test("open: a normal prompt is routed to the skill", () => {
  const verdict = shouldOptimize({ prompt: "fix the login bug", state: open(), config });
  assert.equal(verdict.optimize, true);
});

test("bash passthrough is bypassed", () => {
  const verdict = shouldOptimize({ prompt: "!ls -la", state: open(), config });
  assert.equal(verdict.reason, "bash-passthrough");
});

test("confirmation turns are bypassed, case and padding insensitive", () => {
  for (const prompt of ["evet", "  Devam  ", "YES", "n", "2"]) {
    const verdict = shouldOptimize({ prompt, state: open(), config });
    assert.equal(verdict.optimize, false, prompt);
    assert.equal(verdict.reason, "confirmation", prompt);
  }
});

test("an empty prompt is not optimized", () => {
  assert.equal(shouldOptimize({ prompt: "   ", state: open(), config }).optimize, false);
  assert.equal(shouldOptimize({ prompt: null, state: open(), config }).optimize, false);
});

// --- payload field ---------------------------------------------------------

test("promptOf reads both documented and observed field names", () => {
  assert.equal(promptOf({ prompt: "a" }), "a");
  assert.equal(promptOf({ user_prompt: "b" }), "b");
  assert.equal(promptOf({}), "");
  assert.equal(promptOf(null), "");
});

// --- state -----------------------------------------------------------------

test("corrupt state is treated as closed, never as open", () => {
  for (const raw of ["", "   ", "{not json", "null", "[]", '"a string"', undefined, 42]) {
    assert.equal(readState(raw, config).open, false, String(raw));
  }
});

test("a state file claiming a bogus mode falls back, it is not coerced to something near", () => {
  const state = readState(JSON.stringify({ open: true, mode: "revieww" }), config);
  assert.equal(state.mode, config.defaultMode);
  assert.equal(state.open, true);
});

test("mode, language and lastWarnBytes round-trip through the state text", () => {
  const raw = JSON.stringify({ open: true, mode: "auto", language: "tr", lastWarnBytes: 4000000 });
  assert.deepEqual(readState(raw, config), {
    open: true,
    mode: "auto",
    language: "tr",
    lastWarnBytes: 4000000,
  });
});

test("a negative or fractional lastWarnBytes degrades to 0", () => {
  assert.equal(readState(JSON.stringify({ lastWarnBytes: -5 }), config).lastWarnBytes, 0);
  assert.equal(readState(JSON.stringify({ lastWarnBytes: 1.5 }), config).lastWarnBytes, 0);
});

test("statePath stays under the home directory and splits the configured segments", () => {
  const target = statePath("/home/u", config);
  assert.ok(target.includes("oncode"));
  assert.ok(target.endsWith("state.json"));
  assert.ok(!target.includes(config.stateDir)); // joined per segment, not pasted raw
});

// --- language --------------------------------------------------------------

test("normalizeLanguage accepts auto and well-formed tags", () => {
  for (const value of ["auto", "en", "tr", "pt-BR", "zh-Hans"]) {
    assert.equal(normalizeLanguage(value, config), value, value);
  }
});

test("normalizeLanguage refuses anything else rather than repairing it", () => {
  const hostile = [
    "; rm -rf /",
    "../../etc/passwd",
    "",
    "EN",
    "english",
    "e",
    "a".repeat(64),
    null,
    undefined,
    42,
    {},
  ];
  for (const value of hostile) {
    assert.equal(normalizeLanguage(value, config), null, JSON.stringify(value));
  }
});

// --- context pressure ------------------------------------------------------

const statTo = (bytes) => () => bytes;

test("no transcript path means no pressure signal, never a warning", () => {
  const r = contextPressure({ payload: {}, state: open(), config, statSize: statTo(9e9) });
  assert.equal(r.warn, false);
});

test("a failing stat never blocks the prompt", () => {
  const r = contextPressure({
    payload: { transcript_path: "/gone.jsonl" },
    state: open(),
    config,
    statSize: () => {
      throw new Error("ENOENT");
    },
  });
  assert.equal(r.warn, false);
});

test("below the threshold is silent, above it warns", () => {
  const payload = { transcript_path: "/t.jsonl" };
  const under = contextPressure({
    payload,
    state: open(),
    config,
    statSize: statTo(config.contextWarnBytes - 1),
  });
  const over = contextPressure({
    payload,
    state: open(),
    config,
    statSize: statTo(config.contextWarnBytes + 1),
  });
  assert.equal(under.warn, false);
  assert.equal(over.warn, true);
});

test("cooldown: the warning does not repeat until the transcript grows another step", () => {
  const payload = { transcript_path: "/t.jsonl" };
  const step = config.contextWarnBytes;
  const warned = open({ lastWarnBytes: 2 * step });

  const soon = contextPressure({ payload, state: warned, config, statSize: statTo(2 * step + 10) });
  assert.equal(soon.warn, false, "must stay quiet right after warning");

  const grown = contextPressure({ payload, state: warned, config, statSize: statTo(3 * step) });
  assert.equal(grown.warn, true, "must warn again after another step of growth");
});

// --- injection budget ------------------------------------------------------

test("every configured mode has hint wording, so the two lists cannot drift", () => {
  for (const mode of config.modes) {
    assert.ok(MODE_HINT[mode], `missing MODE_HINT for ${mode}`);
  }
});

test("the injection stays inside its budget, including the pressure line", () => {
  for (const mode of config.modes) {
    const state = open({ mode, language: "pt-BR" });
    const loud = injectionText(state, { warn: true, bytes: 12345678 }, config);
    assert.ok(
      loud.length <= config.injectionBudgetChars,
      `${mode}: ${loud.length} > ${config.injectionBudgetChars}`,
    );
  }
});

test("the injection names the active mode and its behaviour", () => {
  const text = injectionText(open({ mode: "advise" }), { warn: false }, config);
  assert.match(text, /advise/);
  assert.match(text, /Do not execute/);
});

test("the pressure line appears only when warning, and offers both remedies", () => {
  const quiet = injectionText(open(), { warn: false, bytes: 10 }, config);
  assert.ok(!quiet.includes("/compact"));

  const loud = injectionText(open(), { warn: true, bytes: 3000000 }, config);
  assert.match(loud, /\/compact/);
  assert.match(loud, /\/clear/);
});

test("hookPayload uses the UserPromptSubmit additionalContext protocol", () => {
  const payload = hookPayload(open(), { warn: false }, config);
  assert.equal(payload.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.equal(typeof payload.hookSpecificOutput.additionalContext, "string");
});

// --- configuration is the single source of truth ---------------------------

test("the rules live in config, not in the code", () => {
  assert.ok(config.modes.includes(config.defaultMode));
  assert.equal(config.promptLanguage, "en");
  assert.ok(config.bypassPrefixes.includes("/"), "the deadlock guard depends on this entry");
  assert.ok(Number.isInteger(config.structureThresholdChars));
  assert.ok(Number.isInteger(config.injectionBudgetChars));
  assert.ok(normalizeLanguage(config.defaultCodeLanguage, config));
});
