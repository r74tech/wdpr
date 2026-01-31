#!/bin/bash
# Resolve workspace:* and publish packages in dependency order
set -e

PACKAGES=(ast runtime parser render)

for pkg in "${PACKAGES[@]}"; do
  dir="packages/$pkg"

  # Replace workspace:* with actual versions
  node -e "
    const fs = require('fs');
    const pkgPath = '$dir/package.json';
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let changed = false;
    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (!pkg[depType]) continue;
      for (const [name, version] of Object.entries(pkg[depType])) {
        if (version.startsWith('workspace:')) {
          const depPkgName = name.replace('@wdprlib/', '');
          const depPkgPath = 'packages/' + depPkgName + '/package.json';
          try {
            const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
            pkg[depType][name] = depPkg.version;
            changed = true;
            console.log('  ' + name + ': workspace:* -> ' + depPkg.version);
          } catch {}
        }
      }
    }
    if (changed) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }
  "

  echo "Publishing @wdprlib/$pkg..."
  (cd "$dir" && npm publish --access public "$@")

  # Restore original package.json
  git checkout -- "$dir/package.json"
done

echo "Done."
