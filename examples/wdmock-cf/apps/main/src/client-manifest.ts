// Resolve client script path from Vite manifest
// This file is only used in production builds

type ManifestEntry = {
  file: string;
  src?: string;
  isEntry?: boolean;
};

type Manifest = Record<string, ManifestEntry>;

// @ts-expect-error manifest.json only exists after client build
import manifest from "../dist/.vite/manifest.json" with { type: "json" };

export function getClientScriptPath(): string {
  const m = manifest as Manifest;
  const entry = m["src/client/main.ts"];
  if (!entry) {
    throw new Error("Client entry not found in manifest");
  }
  return `/${entry.file}`;
}
