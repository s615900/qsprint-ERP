// Escapes user text so it can be used inside a case-insensitive Mongo $regex search.
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
