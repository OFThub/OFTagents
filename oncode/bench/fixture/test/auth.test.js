import assert from "node:assert/strict";
import test from "node:test";
import { issueToken, isExpired, refreshToken } from "../src/auth/token.js";
import { login, resume, logout } from "../src/auth/session.js";

const T0 = 1_000_000;
const HOUR = 60 * 60 * 1000;

test("a fresh token is not expired", () => {
  assert.equal(isExpired(issueToken("u", T0), T0 + 1000), false);
});

test("a token expires after its ttl", () => {
  assert.equal(isExpired(issueToken("u", T0), T0 + HOUR), true);
});

test("refresh works while the token is still live", () => {
  const next = refreshToken(issueToken("u", T0), T0 + 1000);
  assert.ok(next);
  assert.equal(next.userId, "u");
});

test("a session survives an idle period past the ttl", () => {
  login("u", T0);
  const revived = resume("u", T0 + HOUR);
  assert.ok(revived, "resume must issue a new token after the session times out");
  assert.equal(revived.userId, "u");
  logout("u");
});
