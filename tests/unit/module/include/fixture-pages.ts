import type { PageRef } from "@wdprlib/ast";
import * as fs from "fs";
import * as path from "path";

const ROOT_DIR = path.join(import.meta.dir, "fixture-pages");

export function createFixturePageFetcher(fixtureName: string): (pageRef: PageRef) => string | null {
  const root = path.join(ROOT_DIR, fixtureName);
  const cache = new Map<string, string | null>();

  return (pageRef) => {
    const filePath = path.join(root, ...toPathSegments(pageRef));
    if (cache.has(filePath)) return cache.get(filePath)!;

    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null;
    cache.set(filePath, content);
    return content;
  };
}

function toPathSegments(pageRef: PageRef): string[] {
  const site = pageRef.site ?? "_local";
  const pageSegments = pageRef.page.split(":");
  const lastPageSegment = pageSegments.pop();
  if (!lastPageSegment) {
    return [site, ".ftml"];
  }

  return [site, ...pageSegments, `${lastPageSegment}.ftml`];
}
