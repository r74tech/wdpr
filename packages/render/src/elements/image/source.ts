import type { ImageSource } from "@wdprlib/ast";

export function getFilenameFromSource(source: ImageSource): string {
  switch (source.type) {
    case "url": {
      const slashIndex = source.data.lastIndexOf("/");
      return slashIndex === -1 ? source.data : source.data.slice(slashIndex + 1);
    }
    case "file1":
      return source.data.file;
    case "file2":
      return source.data.file;
    case "file3":
      return source.data.file;
  }
}
