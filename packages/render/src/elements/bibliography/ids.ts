export function generateBibliographyIdSuffix(label: string, counter: number): string {
  let h = 0x811c9dc5;
  const input = label + counter;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).slice(0, 6);
}
