import type { CodeBlockData } from "@wdprlib/ast";
import { escapeHtml } from "../../escape";
import { highlight } from "../../libs/highlighter";

export function renderCodeContents(data: CodeBlockData): string {
  if (data.language) {
    const highlighted = highlight(data.contents, data.language);
    if (highlighted) {
      return highlighted;
    }
  }

  return renderPlainCode(data.contents);
}

function renderPlainCode(contents: string): string {
  return `<pre><code>${escapeHtml(contents)}</code></pre>`;
}
