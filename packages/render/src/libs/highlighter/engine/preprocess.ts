/**
 * Preprocess source code the same way Text_Highlighter's HTML renderer does.
 */
export function preprocessHighlightInput(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/^$/gm, " ")
    .replace(/\t/g, "    ")
    .replace(/\s+$/, "");
}
