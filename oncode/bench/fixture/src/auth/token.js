const TOKEN_TTL_MS = 15 * 60 * 1000;

export function issueToken(userId, now = Date.now()) {
  return { userId, issuedAt: now, expiresAt: now + TOKEN_TTL_MS };
}

export function isExpired(token, now = Date.now()) {
  return token.expiresAt <= now;
}

// BUG: when the token has already expired this returns null instead of
// issuing a fresh one, so a user who idles past the TTL can never refresh.
export function refreshToken(token, now = Date.now()) {
  if (isExpired(token, now)) return null;
  return issueToken(token.userId, now);
}
