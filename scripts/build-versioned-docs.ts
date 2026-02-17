#!/usr/bin/env bun
/**
 * Build versioned API docs for each package using typedoc-plugin-monorepo-versions.
 *
 * Usage:
 *   bun scripts/build-versioned-docs.ts
 */

import { $ } from "bun";
import path from "path";
import fs from "fs";

const PACKAGES = ["ast", "parser", "render", "decompiler", "runtime"];
const ROOT = path.resolve(import.meta.dir, "..");

console.log(`Output: ${path.join(ROOT, "docs")}`);
console.log(`Packages: ${PACKAGES.join(", ")}\n`);

for (const pkg of PACKAGES) {
	const pkgDir = path.join(ROOT, "packages", pkg);
	const configPath = path.join(pkgDir, "typedoc.monorepo.json");

	if (!fs.existsSync(configPath)) {
		console.log(`Skipping ${pkg}: no typedoc.monorepo.json`);
		continue;
	}

	console.log(`Building docs for ${pkg}...`);
	const result =
		await $`bunx typedoc --options ${configPath}`
			.cwd(pkgDir)
			.nothrow();

	if (result.exitCode !== 0) {
		console.error(`Failed to build docs for ${pkg} (exit code ${result.exitCode})`);
	} else {
		console.log(`Done: ${pkg}\n`);
	}
}

console.log("All packages processed.");
