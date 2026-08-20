import { resume } from "../auth/session.js";
import { findUser, updateUser } from "../db/schema.js";
import { validateEmail } from "../utils/validate.js";

export function getUser(req) {
  const session = resume(req.userId);
  if (!session) return { status: 401 };
  return { status: 200, body: findUser(req.params.id) };
}

export function patchUser(req) {
  const session = resume(req.userId);
  if (!session) return { status: 401 };
  if (req.body.email && !validateEmail(req.body.email)) return { status: 400 };
  return { status: 200, body: updateUser(req.params.id, req.body) };
}
