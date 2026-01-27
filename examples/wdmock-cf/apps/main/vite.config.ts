import build from "@hono/vite-build/cloudflare-pages";
import devServer from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import { execSync } from "node:child_process";
import { defineConfig } from "vite";

function getGitCommitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig(({ mode, command }) => {
  const gitCommitHash = getGitCommitHash();

  // Client-only build (for static assets)
  if (mode === "client") {
    return {
      build: {
        rollupOptions: {
          input: "src/client/main.ts",
          output: {
            entryFileNames: "static/client.[hash].js",
          },
        },
        outDir: "dist",
        emptyOutDir: false,
        manifest: true,
      },
    };
  }

  // Default: SSR build with Hono
  return {
    define: {
      "import.meta.env.VITE_GIT_COMMIT_HASH": JSON.stringify(gitCommitHash),
    },
    plugins: [
      build({
        entry: "src/index.tsx",
        outputDir: "dist",
      }),
      devServer({
        adapter,
        entry: "src/index.tsx",
        cf:
          command === "serve"
            ? {
                bindings: {
                  FILES_BASE_URL: "http://localhost:8788",
                },
              }
            : undefined,
      }),
    ],
  };
});
