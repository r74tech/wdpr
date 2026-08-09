import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { wdprAliases } from "./vite.config.ts";

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, "migrations")),
        },
      },
    }),
  ],
  resolve: { alias: wdprAliases },
  test: {
    deps: {
      optimizer: {
        ssr: { enabled: true, include: ["@wdprlib/render > sanitize-html"] },
      },
    },
    include: ["test/worker.integration.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
  },
}));
