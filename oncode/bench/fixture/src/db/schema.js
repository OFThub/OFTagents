const users = new Map();
const posts = [];

export function findUser(id) { return users.get(id) ?? null; }
export function updateUser(id, patch) {
  const next = { ...(users.get(id) ?? { id }), ...patch };
  users.set(id, next);
  return next;
}
export function listPosts(page, size = 20) {
  return posts.slice((page - 1) * size, page * size);
}
export function insertPost(post) {
  const row = { id: posts.length + 1, ...post };
  posts.push(row);
  return row;
}
