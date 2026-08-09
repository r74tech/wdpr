import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export const wdprAliases = {
  "@wdprlib/ast": fileURLToPath(new URL("../../packages/ast/src/index.ts", import.meta.url)),
  "@wdprlib/parser": fileURLToPath(new URL("../../packages/parser/src/index.ts", import.meta.url)),
  "@wdprlib/render": fileURLToPath(new URL("../../packages/render/src/index.ts", import.meta.url)),
  "@wdprlib/runtime": fileURLToPath(
    new URL("../../packages/runtime/src/index.ts", import.meta.url),
  ),
};

export default defineConfig({
  plugins: [cloudflare()],
  resolve: { alias: wdprAliases },
  build: {
    rollupOptions: {
      input: "src/main.ts",
      output: { entryFileNames: "assets/main.js" },
    },
  },
});
