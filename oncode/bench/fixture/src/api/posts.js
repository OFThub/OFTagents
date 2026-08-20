import { resume } from "../auth/session.js";
import { listPosts, insertPost } from "../db/schema.js";
import { slugify } from "../utils/text.js";

export function getPosts(req) {
  return { status: 200, body: listPosts(req.query.page ?? 1) };
}

export function createPost(req) {
  const session = resume(req.userId);
  if (!session) return { status: 401 };
  const slug = slugify(req.body.title);
  return { status: 201, body: insertPost({ ...req.body, slug, author: session.userId }) };
}
