#!/usr/bin/env bun
/**
 * Import docs from existing release tags.
 * Checks out each release tag, builds docs for the corresponding package,
 * then returns to the original branch.
 *
 * Usage:
 *   bun scripts/import-release-docs.ts
 *
 * This is a one-time migration script. Run it to populate versioned docs
 * from existing release history.
 */

import { $ } from "bun";
import path from "path";
import fs from "fs";

const ROOT = path.resolve(import.meta.dir, "..");

// Package name mapping: tag prefix → directory name
const PKG_MAP: Record<string, string> = {
	"@wdprlib/ast": "ast",
	"@wdprlib/parser": "parser",
	"@wdprlib/render": "render",
	"@wdprlib/runtime": "runtime",
};

// Get current branch to return to
const currentBranch = (await $`git rev-parse --abbrev-ref HEAD`.cwd(ROOT).text()).trim();
console.log(`Current branch: ${currentBranch}\n`);

// Get all tags
const tagsRaw = (await $`git tag -l`.cwd(ROOT).text()).trim();
const tags = tagsRaw.split("\n").filter(Boolean);

// Parse tags into package+version pairs
const releases: { tag: string; pkg: string; version: string }[] = [];
for (const tag of tags) {
	for (const [prefix, dir] of Object.entries(PKG_MAP)) {
		if (tag.startsWith(`${prefix}@`)) {
			const version = tag.slice(prefix.length + 1);
			releases.push({ tag, pkg: dir, version });
		}
	}
}

// Sort by package then version
releases.sort((a, b) => a.pkg.localeCompare(b.pkg) || a.version.localeCompare(b.version));

console.log(`Found ${releases.length} release tags:\n`);
for (const r of releases) {
	console.log(`  ${r.tag} → ${r.pkg}@${r.version}`);
}
console.log();

const results: { tag: string; status: string }[] = [];

for (const { tag, pkg, version } of releases) {
	console.log(`--- ${tag} ---`);

	// Checkout the tag
	const checkout = await $`git checkout ${tag} --force`.cwd(ROOT).nothrow().quiet();
	if (checkout.exitCode !== 0) {
		console.error(`  Failed to checkout ${tag}`);
		results.push({ tag, status: "checkout failed" });
		continue;
	}

	// Install dependencies (might differ per tag)
	const install = await $`bun install --frozen-lockfile`.cwd(ROOT).nothrow().quiet();
	if (install.exitCode !== 0) {
		// Try without frozen lockfile
		await $`bun install`.cwd(ROOT).nothrow().quiet();
	}

	const pkgDir = path.join(ROOT, "packages", pkg);

	// Check if source exists at this tag
	if (!fs.existsSync(path.join(pkgDir, "src"))) {
		console.log(`  Skipping: packages/${pkg}/src not found at ${tag}`);
		results.push({ tag, status: "no src" });
		continue;
	}

	// Write the monorepo config (it may not exist at this tag)
	const configContent = JSON.stringify(
		{
			$schema: "https://typedoc.org/schema.json",
			entryPoints: ["src/index.ts"],
			tsconfig: fs.existsSync(path.join(pkgDir, "tsconfig.typedoc.json"))
				? "tsconfig.typedoc.json"
				: "tsconfig.json",
			plugin: ["@r74tech/typedoc-plugin-monorepo-versions"],
			versions: {
				stable: "auto",
				dev: "auto",
				packageFile: "package.json",
				makeRelativeLinks: true,
				monorepo: {
					name: pkg,
					root: "../../docs/api",
				},
			},
		},
		null,
		"\t",
	);
	const configPath = path.join(pkgDir, "typedoc.monorepo.json");
	fs.writeFileSync(configPath, configContent);

	// Build docs
	const build =
		await $`bunx typedoc --options ${configPath}`
			.cwd(pkgDir)
			.nothrow();

	if (build.exitCode !== 0) {
		console.error(`  Build failed for ${tag}`);
		results.push({ tag, status: "build failed" });
	} else {
		console.log(`  Success: ${pkg}@${version}\n`);
		results.push({ tag, status: "ok" });
	}
}

// Return to original branch
await $`git checkout ${currentBranch} --force`.cwd(ROOT);
await $`bun install`.cwd(ROOT).nothrow().quiet();

console.log("\n=== Results ===");
for (const { tag, status } of results) {
	const icon = status === "ok" ? "[OK]" : "[FAIL]";
	console.log(`  ${icon} ${tag}: ${status}`);
}

const ok = results.filter((r) => r.status === "ok").length;
console.log(`\n${ok}/${results.length} tags imported successfully.`);
