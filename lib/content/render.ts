import { marked } from "marked";

marked.setOptions({ gfm: true });

/**
 * Render trusted article Markdown to HTML. Article bodies are authored in-repo
 * (no user input), so injecting the result is safe. Imported only by the server
 * components under app/facts.
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}
