import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const dirty =
  execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], {
    cwd: root,
    encoding: "utf8",
  }).length > 0;

for (const name of ["ast", "parser", "render", "decompiler", "runtime"]) {
  const pkg = `@wdprlib/${name}`;
  const manifest = JSON.parse(readFileSync(new URL(`packages/${name}/package.json`, root)));
  const expected = { version: manifest.version, sha, dirty };
  const esm = (await import(pkg)).buildInfo;
  const cjs = require(pkg).buildInfo;
  assert.match(require.resolve(pkg), /[/\\]dist[/\\]index\.cjs$/);
  assert.deepEqual(esm, expected);
  assert.deepEqual(cjs, expected);
  assert.ok(Object.isFrozen(esm));
  assert.ok(Object.isFrozen(cjs));
  const bun = JSON.parse(
    execFileSync(
      "bun",
      [
        "-e",
        `
    import { buildInfo } from ${JSON.stringify(pkg)};
    if (!Object.isFrozen(buildInfo)) throw new Error("Mutable buildInfo");
    console.log(JSON.stringify(buildInfo));
  `,
      ],
      { cwd: root, encoding: "utf8" },
    ),
  );
  assert.deepEqual(bun, expected);
}

console.log("Build information: ESM, CommonJS and Bun passed for all packages");
