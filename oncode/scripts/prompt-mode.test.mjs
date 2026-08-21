// Unit tests: node:test only, no framework, no disk.
// Run: node oncode/scripts/prompt-mode.test.mjs

import assert from "node:assert/strict";
import test from "node:test";

import {
  MODE_HINT,
  flagList,
  runFlags,
  contextPressure,
  defaultState,
  hookPayload,
  injectionText,
  loadConfig,
  normalizeLanguage,
  promptOf,
  readState,
  shouldOptimize,
  shouldShapeReply,
  statePath,
} from "./prompt-mode.mjs";

// The real config, so a broken or renamed field fails here rather than in production.
const config = loadConfig();
const open = (over = {}) => ({ ...defaultState(config), open: true, ...over });
const closed = (over = {}) => ({ ...defaultState(config), open: false, ...over });

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
  const verdict = shouldOptimize({ prompt: "fix the login bug", state: closed(), config });
  assert.equal(verdict.optimize, false);
  assert.equal(verdict.reason, "closed");
});

test("the shipped default is open, and it comes from config rather than the code", () => {
  assert.equal(config.defaultOpen, true);
  assert.equal(defaultState(config).open, true);
  // Flipping the shipped default must be a config edit, not a code edit.
  assert.equal(defaultState({ ...config, defaultOpen: false }).open, false);
});

test("with no state file at all, a normal prompt is optimized", () => {
  const verdict = shouldOptimize({ prompt: "fix the login bug", state: readState("", config), config });
  assert.equal(verdict.optimize, true);
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

test("a missing or corrupt state file falls back to the configured default", () => {
  // Unknown is unknown: a truncated file is not evidence that the user ran --close,
  // so it must not silently disable a feature that ships on.
  for (const raw of ["", "   ", "{not json", "null", "[]", '"a string"', undefined, 42]) {
    assert.equal(readState(raw, config).open, config.defaultOpen, String(raw));
  }
  const shutByConfig = { ...config, defaultOpen: false };
  assert.equal(readState("{not json", shutByConfig).open, false);
});

test("an explicit false survives: --close is a decision, not a missing value", () => {
  assert.equal(readState(JSON.stringify({ open: false }), config).open, false);
  assert.equal(readState(JSON.stringify({ open: true }), config).open, true);
  // Anything that is not a boolean is absence, not a decision.
  assert.equal(readState(JSON.stringify({ open: "false" }), config).open, config.defaultOpen);
  assert.equal(readState(JSON.stringify({ mode: "review" }), config).open, config.defaultOpen);
});

test("a state file claiming a bogus mode falls back, it is not coerced to something near", () => {
  const state = readState(JSON.stringify({ open: true, mode: "revieww" }), config);
  assert.equal(state.mode, config.defaultMode);
  assert.equal(state.open, true);
});

test("mode, language and lastWarnBytes round-trip through the state text", () => {
  const raw = JSON.stringify({
    open: true,
    replyOpen: false,
    mode: "auto",
    language: "tr",
    lastWarnBytes: 4000000,
  });
  assert.deepEqual(readState(raw, config), {
    open: true,
    replyOpen: false,
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

// --- lazy loading of the ideal-prompt skill --------------------------------

test("the injection carries the triage test instead of ordering a skill load", () => {
  // The point of the whole exercise: a prompt that passes triage must never cause
  // the ~2400-token SKILL.md to be opened, so the question has to travel inline.
  const text = injectionText(open(), { warn: false }, config, { optimize: true, reply: false });
  assert.ok(text.includes(config.triageDirective));
  assert.match(text, /skip the skill/i);
});

test("the triage directive states both branches, not just the cheap one", () => {
  // Half a rule is worse than none: without the else-branch a prompt that fails
  // triage would be run as written, which is the expensive outcome this guards.
  assert.match(config.triageDirective, /all three/i);
  assert.match(config.triageDirective, /ideal-prompt/);
});

// --- the documented flag surface actually exists ---------------------------

test("every flag the CLI advertises is actually handled", () => {
  // The regression guard for a real defect: --review, --advise and --auto were
  // documented in SKILL.md and the README while runFlags answered "unknown flag"
  // to all three. The writer is injected so this stays a disk-free test.
  const noWrite = () => {};
  const argFor = { "--mode": "review", "--language": "tr" };
  for (const flag of flagList(config)) {
    const argv = argFor[flag] ? [flag, argFor[flag]] : [flag];
    const out = runFlags(argv, open(), config, noWrite);
    assert.ok(!/unknown flag/.test(out), `${flag} fell through: ${out}`);
  }
});

test("a mode shortcut sets exactly that mode", () => {
  for (const mode of config.modes) {
    let written = null;
    const out = runFlags([`--${mode}`], open({ mode: "review" }), config, (next) => (written = next));
    assert.equal(written.mode, mode, mode);
    assert.match(out, new RegExp(mode));
  }
});

test("a flag that really is unknown still says so", () => {
  assert.match(runFlags(["--nope"], open(), config, () => {}), /unknown flag/);
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

// --- lean-reply: the second, independent switch ----------------------------

test("the shipped lean-reply default is open, and it comes from config", () => {
  assert.equal(config.replyDefaultOpen, true);
  assert.equal(defaultState(config).replyOpen, true);
  assert.equal(defaultState({ ...config, replyDefaultOpen: false }).replyOpen, false);
});

test("a state file written before lean-reply existed still opens the reply switch", () => {
  // Absence of the field is not a decision to close it, so it takes the default.
  const legacy = JSON.stringify({ open: true, mode: "advise", language: "tr" });
  assert.equal(readState(legacy, config).replyOpen, config.replyDefaultOpen);
});

test("an explicit replyOpen:false survives, anything non-boolean does not", () => {
  assert.equal(readState(JSON.stringify({ replyOpen: false }), config).replyOpen, false);
  assert.equal(readState(JSON.stringify({ replyOpen: "false" }), config).replyOpen, true);
  assert.equal(readState("{not json", config).replyOpen, config.replyDefaultOpen);
});

test("shouldShapeReply follows its own switch and ignores the prompt one", () => {
  assert.equal(shouldShapeReply({ prompt: "fix it", state: open({ replyOpen: false }) }), false);
  assert.equal(shouldShapeReply({ prompt: "fix it", state: closed({ replyOpen: true }) }), true);
});

test("shouldShapeReply skips only an empty prompt", () => {
  for (const prompt of ["", "   ", null, 42]) {
    assert.equal(shouldShapeReply({ prompt, state: open() }), false, JSON.stringify(prompt));
  }
  assert.equal(shouldShapeReply({ prompt: "fix it", state: open() }), true);
});

test("slash commands and confirmations DO get the reply directive", () => {
  // Deliberate divergence from shouldOptimize, pinned so it is not "tidied up"
  // into sharing the bypass list. The "/" bypass there is a deadlock guard for a
  // rewrite; this directive rewrites nothing, so it cannot eat the --close command.
  // And a bare "evet" is where the model rambles most - it starts the real work.
  for (const prompt of ["/oncode:lean-reply --close", "evet", "!ls -la"]) {
    assert.equal(shouldOptimize({ prompt, state: open(), config }).optimize, false, prompt);
    assert.equal(shouldShapeReply({ prompt, state: open() }), true, prompt);
  }
});

test("with only lean-reply open, the injection is the directive alone", () => {
  const text = injectionText(closed(), { warn: false }, config, { optimize: false, reply: true });
  assert.equal(text, config.replyDirective);
  assert.ok(!text.includes("ideal-prompt"));
});

test("with only ideal-prompt open, the directive is absent", () => {
  const text = injectionText(open(), { warn: false }, config, { optimize: true, reply: false });
  assert.match(text, /ideal-prompt is OPEN/);
  assert.ok(!text.includes(config.replyDirective));
});

test("both switches open: both blocks appear, and the pressure line still lands", () => {
  const text = injectionText(open(), { warn: true, bytes: 3000000 }, config, {
    optimize: true,
    reply: true,
  });
  assert.match(text, /ideal-prompt is OPEN/);
  assert.ok(text.includes(config.replyDirective));
  assert.ok(text.includes("/compact"));
});

test("the combined worst case still fits the injection budget", () => {
  // The regression guard behind raising injectionBudgetChars. Longest mode hint,
  // longest language tag the pattern allows, both switches open, pressure warning on.
  const language = "aa-bbbbbbbb";
  assert.ok(normalizeLanguage(language, config), "the longest legal tag must stay legal");
  for (const mode of config.modes) {
    const text = injectionText(open({ mode, language }), { warn: true, bytes: 999000000 }, config, {
      optimize: true,
      reply: true,
    });
    assert.ok(
      text.length <= config.injectionBudgetChars,
      `${mode}: ${text.length} > ${config.injectionBudgetChars}`,
    );
  }
});

test("the reply directive is self-sufficient and says so", () => {
  // If this ever degrades into "load the lean-reply skill", every prompt pays
  // ~1.5k tokens to read SKILL.md in order to save output tokens - the skill
  // would then cost more than it saves.
  assert.ok(config.replyDirective.length > 0);
  assert.match(config.replyDirective, /do not load the skill/i);
});
