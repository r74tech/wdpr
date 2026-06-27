export function isDirectBracketUrl(url: string): boolean {
  return (
    url !== "" && (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://"))
  );
}
