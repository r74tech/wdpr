/** Resolve a Wikidot image size preset to its display width in pixels. */
export function getImageSizeWidth(size: string | undefined): number | null {
  switch (size) {
    case "square":
      return 75;
    case "thumbnail":
      return 100;
    case "small":
      return 240;
    case "medium":
      return 500;
    case "medium640":
      return 640;
    case "large":
      return 1024;
    default:
      return null;
  }
}
