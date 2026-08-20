export function slugify(title) {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function truncate(text, max = 120) {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}
