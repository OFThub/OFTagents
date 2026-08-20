import { issueToken, isExpired, refreshToken } from "./token.js";

const sessions = new Map();

export function login(userId, now = Date.now()) {
  const token = issueToken(userId, now);
  sessions.set(userId, token);
  return token;
}

export function resume(userId, now = Date.now()) {
  const token = sessions.get(userId);
  if (!token) return null;
  if (!isExpired(token, now)) return token;
  const next = refreshToken(token, now);
  if (next) sessions.set(userId, next);
  return next;
}

export function logout(userId) {
  sessions.delete(userId);
}
