// Resolve client script path from Vite manifest
// This file is only used in production builds

type ManifestEntry = {
  file: string;
  src?: string;
  isEntry?: boolean;
};

let manifest: Record<string, ManifestEntry> | null = null;

try {
  // @ts-expect-error manifest.json only exists after build
  manifest = await import("../dist/.vite/manifest.json");
} catch {
  // Ignore - manifest doesn't exist during development/typecheck
}

export function getClientScriptPath(): string {
  if (!manifest) {
    throw new Error("Manifest not found - run build first");
  }
  const entry = manifest["src/client/main.ts"];
  if (!entry) {
    throw new Error("Client entry not found in manifest");
  }
  return `/${entry.file}`;
}
