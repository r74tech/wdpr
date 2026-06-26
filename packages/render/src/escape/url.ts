export function isDangerousUrl(value: string): boolean {
  const normalized = value.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, "");
  return /^(javascript|data|vbscript):/i.test(normalized);
}
