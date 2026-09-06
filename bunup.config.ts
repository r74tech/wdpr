import { defineWorkspace } from "bunup";
import { generateBuildInfo } from "./scripts/build-info";

await generateBuildInfo();

export default defineWorkspace([
  {
    name: "ast",
    root: "packages/ast",
    config: {
      entry: "src/index.ts",
      format: ["esm", "cjs"],
      dts: true,
      minify: false,
      clean: true,
    },
  },
  {
    name: "parser",
    root: "packages/parser",
    config: {
      entry: "src/index.ts",
      format: ["esm", "cjs"],
      dts: true,
      minify: false,
      clean: true,
      external: ["@wdprlib/ast"],
    },
  },
  {
    name: "render",
    root: "packages/render",
    config: {
      entry: "src/index.ts",
      format: ["esm", "cjs"],
      dts: true,
      minify: false,
      clean: true,
      external: ["@wdprlib/ast"],
    },
  },
  {
    name: "decompiler",
    root: "packages/decompiler",
    config: {
      entry: "src/index.ts",
      format: ["esm", "cjs"],
      dts: true,
      minify: false,
      clean: true,
      external: ["@wdprlib/ast"],
    },
  },
  {
    name: "runtime",
    root: "packages/runtime",
    config: {
      entry: ["src/index.ts", "src/html-block-script.ts"],
      sourceBase: "src",
      format: ["esm", "cjs"],
      dts: true,
      minify: false,
      clean: true,
      splitting: false,
      external: ["hfmath"],
    },
  },
], {
  target: "browser",
});
