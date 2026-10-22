import "server-only";

const ALLOWED = new Set(["p", "b", "i", "u", "strong", "em", "ol", "ul", "li", "br", "div", "span", "h1", "h2", "h3", "h4"]);

// Contract clauses are authored in a small rich-text editor and shown on the
// public sign page, so keep only basic formatting tags and drop every attribute.
export function sanitizeHtml(html: string | null | undefined): string | null {
  if (html == null) return null;
  const cleaned = html
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (tag, name: string) => {
      const lower = name.toLowerCase();
      if (!ALLOWED.has(lower)) return "";
      return tag.startsWith("</") ? `</${lower}>` : `<${lower}>`;
    });
  return cleaned.trim() || null;
}

export function textToHtml(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${esc(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
