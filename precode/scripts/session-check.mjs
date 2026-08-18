#!/usr/bin/env node
/**
 * precode session check — SessionStart(startup|clear), plus the `--decline` writer.
 *
 * Two jobs, one file, because they share the same marker path and splitting them
 * would mean two places that must agree on it:
 *
 *   (no args)                  read a SessionStart payload from stdin and, when the
 *                              project has no documentation baseline, hand Claude a
 *                              one-time instruction to ASK the user about it.
 *   --decline <session_id>     record the user's "not now" for this session. The
 *                              write gate reads the same marker, so declining also
 *                              stops the blocking — otherwise "no" would mean nothing.
 *
 * The marker lives in the OS temp directory. A per-session decision has no business
 * being written into the user's project, and nothing here ever touches it.
 *
 * `resume` and `compact` are deliberately ignored: the conversation is already in
 * flight, and re-asking a question the user has answered is worse than not asking.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { declinePath, missingDocs } from "./docs-gate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(HERE, "..", "config", "required-docs.json");
const SELF = path.join(HERE, "session-check.mjs");

/** Only a genuinely fresh conversation gets the question. */
export const ASK_SOURCES = new Set(["startup", "clear"]);

/**
 * @returns {string[] | null} missing core documents, or null when we must stay quiet
 */
export function sessionAdvice({ source, projectRoot, config, fileExists, listRoot, declined = false }) {
  if (!ASK_SOURCES.has(source)) return null;      // resume / compact — conversation continues
  if (!projectRoot) return null;                  // nothing to inspect
  if (declined) return null;                      // already said no this session
  if (fileExists(path.join(projectRoot, config.stateFile))) return null;  // /precode:docs skip

  const missing = missingDocs(config, listRoot);
  return missing.length === 0 ? null : missing;
}

export function contextPayload(missing, sessionId) {
  const decline = `node "${SELF}" --decline ${sessionId}`;
  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `precode: this project has no documentation baseline. Missing: ${missing.join(", ")}.\n\n` +
        `Ask the user ONCE, in their own language, whether to create the project's markdown ` +
        `documentation now. Ask it as a plain question and then wait — do not start generating ` +
        `anything before they answer, and do not raise the subject a second time in this session.\n\n` +
        `- If they agree: use the "mdfile" skill to detect, profile and generate the documents.\n` +
        `- If they decline: run this command once, then drop the subject entirely for the rest ` +
        `of the session unless they bring it up themselves (for example /precode:docs init):\n` +
        `    ${decline}\n` +
        `  It also silences the write gate for this session, so their "no" actually holds.`,
    },
  };
}

/** Records the decline. The only write in the entire plugin, and it lands in temp. */
export function writeDecline(sessionId) {
  const marker = declinePath(sessionId);
  if (!marker) return null;                       // refuse anything that is not a session id
  mkdirSync(path.dirname(marker), { recursive: true });
  writeFileSync(marker, new Date().toISOString() + "\n", "utf8");
  return marker;
}

// ---------------------------------------------------------------- CLI shell

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  // Fail open everywhere: a broken session check must cost a missing question,
  // never a broken session.
  const declineIdx = process.argv.indexOf("--decline");
  if (declineIdx !== -1) {
    try {
      const marker = writeDecline(process.argv[declineIdx + 1]);
      process.stdout.write(marker ? "precode: gate silenced for this session\n" : "precode: invalid session id\n");
    } catch {
      /* ignore */
    }
    process.exit(0);
  }

  let payload;
  let config;
  try {
    payload = JSON.parse((await readStdin()) || "{}");
    config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    process.exit(0);
  }

  const projectRoot = process.env.CLAUDE_PROJECT_DIR || payload.cwd;
  const marker = declinePath(payload?.session_id);

  let missing = null;
  try {
    missing = sessionAdvice({
      source: payload?.source,
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
      declined: marker ? existsSync(marker) : false,
    });
  } catch {
    process.exit(0);
  }

  if (missing) process.stdout.write(JSON.stringify(contextPayload(missing, payload.session_id)));
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === SELF.toLowerCase()) {
  main();
}
