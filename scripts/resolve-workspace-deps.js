// Resolve workspace:* dependencies to actual versions before npm publish.
// Called by @semantic-release/exec in the prepare phase.
// Usage: node scripts/resolve-workspace-deps.js [nextVersion]

const fs = require("fs");
const path = require("path");

const nextVersion = process.argv[2];
const pkgPath = path.resolve("package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
let changed = false;

for (const depType of ["dependencies", "devDependencies", "peerDependencies"]) {
  if (!pkg[depType]) continue;
  for (const [name, version] of Object.entries(pkg[depType])) {
    if (!version.startsWith("workspace:")) continue;
    const depName = name.replace("@wdprlib/", "");
    const depPkgPath = path.resolve(__dirname, "..", "packages", depName, "package.json");
    try {
      const depPkg = JSON.parse(fs.readFileSync(depPkgPath, "utf8"));
      pkg[depType][name] = depPkg.version;
      changed = true;
      console.log(`  ${name}: workspace:* -> ${depPkg.version}`);
    } catch {
      // dependency package not found, skip
    }
  }
}

if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}
