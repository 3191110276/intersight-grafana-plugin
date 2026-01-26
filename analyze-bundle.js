const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, 'dist', 'bundle-stats.json');
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

// Find the main module
const mainModule = stats.assets.find(a => a.name === 'module.js');
console.log('\n=== Bundle Size Analysis ===\n');
console.log(`Total bundle size: ${(mainModule.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Recommended limit: 0.24 MB`);
console.log(`Over limit by: ${((mainModule.size / 1024 / 1024) - 0.24).toFixed(2)} MB\n`);

// Get module breakdown
const modules = [];
stats.modules.forEach(module => {
  if (module.name && module.size) {
    modules.push({
      name: module.name,
      size: module.size,
      sizeMB: (module.size / 1024 / 1024).toFixed(3)
    });
  }
});

// Sort by size
modules.sort((a, b) => b.size - a.size);

// Group by package
const packageSizes = {};
modules.forEach(mod => {
  let packageName = 'src';

  if (mod.name.includes('node_modules')) {
    const match = mod.name.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    if (match) {
      packageName = match[1];
    }
  }

  if (!packageSizes[packageName]) {
    packageSizes[packageName] = 0;
  }
  packageSizes[packageName] += mod.size;
});

// Convert to array and sort
const packageArray = Object.entries(packageSizes)
  .map(([name, size]) => ({
    name,
    size,
    sizeMB: (size / 1024 / 1024).toFixed(3),
    percent: ((size / mainModule.size) * 100).toFixed(1)
  }))
  .sort((a, b) => b.size - a.size);

console.log('=== Top Packages by Size ===\n');
packageArray.slice(0, 20).forEach(pkg => {
  console.log(`${pkg.name.padEnd(40)} ${pkg.sizeMB.padStart(8)} MB (${pkg.percent.padStart(5)}%)`);
});

console.log('\n=== Top 15 Largest Individual Modules ===\n');
modules.slice(0, 15).forEach(mod => {
  const shortName = mod.name.length > 80 ? '...' + mod.name.slice(-77) : mod.name;
  console.log(`${mod.sizeMB.padStart(8)} MB - ${shortName}`);
});
