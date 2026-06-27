export function isValidCssColorFunction(color: string): boolean {
  const fnMatch = color.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (!fnMatch) {
    return false;
  }

  const fn = fnMatch[1]!;
  const args = fnMatch[2]!
    .split(",")
    .map((s) => s.trim())
    .join(",");

  if (fn.startsWith("rgb")) {
    return /^\d{1,3},\d{1,3},\d{1,3}(,(0|1|0?\.\d+))?$/.test(args);
  }

  return /^\d{1,3},\d{1,3}%,\d{1,3}%(,(0|1|0?\.\d+))?$/.test(args);
}
