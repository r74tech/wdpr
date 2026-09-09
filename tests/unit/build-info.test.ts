import { afterEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporary: string[] = [];

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "wdpr-build-info-"));
  temporary.push(root);
  mkdirSync(join(root, "scripts"));
  cpSync(
    new URL("../../scripts/build-info.ts", import.meta.url),
    join(root, "scripts/build-info.ts"),
  );
  for (const name of ["ast", "parser", "render", "decompiler", "runtime"]) {
    mkdirSync(join(root, "packages", name, "src"), { recursive: true });
    writeFileSync(join(root, "packages", name, "package.json"), '{"version":"1.2.3"}');
  }
  writeFileSync(join(root, ".gitignore"), "packages/*/src/build-info.generated.ts\n");
  return root;
}

function run(root: string, command: string[], env = process.env) {
  const result = Bun.spawnSync(command, { cwd: root, env });
  expect(result.exitCode).toBe(0);
  return result.stdout.toString().trim();
}

function generate(root: string, env = process.env) {
  run(root, [process.execPath, "scripts/build-info.ts"], env);
  return JSON.parse(
    run(root, [
      process.execPath,
      "-e",
      `
    import { buildInfo } from "./packages/render/src/build-info.generated.ts";
    console.log(JSON.stringify(buildInfo));
  `,
    ]),
  );
}

test("build metadata distinguishes clean, tracked and untracked changes", () => {
  const root = fixture();
  run(root, ["git", "init", "-q"]);
  run(root, ["git", "add", "."]);
  run(root, [
    "git",
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "fixture",
  ]);
  const sha = run(root, ["git", "rev-parse", "HEAD"]);
  expect(generate(root)).toEqual({ version: "1.2.3", sha, dirty: false });
  expect(generate(root).dirty).toBe(false);
  writeFileSync(join(root, "new.txt"), "untracked");
  expect(generate(root).dirty).toBe(true);
  rmSync(join(root, "new.txt"));
  writeFileSync(join(root, "packages/render/package.json"), '{"version":"1.2.4"}');
  expect(generate(root)).toEqual({ version: "1.2.4", sha, dirty: true });
});

test("missing Git and source archives use unknown Git metadata", () => {
  const root = fixture();
  const expected = { version: "1.2.3", sha: null, dirty: null };
  expect(generate(root)).toEqual(expected);
  expect(generate(root, { ...process.env, PATH: "" })).toEqual(expected);
});
