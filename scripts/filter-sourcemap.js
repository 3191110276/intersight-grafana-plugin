#!/usr/bin/env node

/**
 * Filter Source Map
 *
 * Removes node_modules references from webpack-generated source maps
 * to avoid validator errors when bundling dependencies like @grafana/scenes
 */

const fs = require('fs');
const path = require('path');

function filterSourceMap(sourcemapPath) {
  console.log(`Filtering source map: ${sourcemapPath}`);

  const sourceMap = JSON.parse(fs.readFileSync(sourcemapPath, 'utf8'));
  const rootDir = path.join(__dirname, '..');

  console.log(`  Original sources: ${sourceMap.sources.length}`);

  // Filter out node_modules and webpack runtime sources
  const filteredSources = [];
  const filteredSourcesContent = [];

  sourceMap.sources.forEach((source, index) => {
    // Keep only our own source files (starting with ./src/ after the webpack prefix)
    // Our files: webpack://intersight-app/./src/components/App.tsx
    // Bundled deps: webpack://intersight-app/../../../../src/internal/... (rxjs)
    //               webpack://intersight-app/../src/... (@grafana/scenes)
    if (source.match(/webpack:\/\/[^/]+\/\.\/src\//)) {
      // Strip src/ from the path for validator compatibility
      // The validator appends /src to the base path, so our paths should not include src/
      // e.g., webpack://intersight-app/./src/utils/debug.ts -> webpack://intersight-app/./utils/debug.ts
      const adjustedSource = source.replace(/\/\.\/src\//, '/./');
      filteredSources.push(adjustedSource);

      // Read from the original location (with src/ in the path)
      const sourcePath = source.replace(/^webpack:\/\/[^/]+\/\.\//, '');
      const fullSourcePath = path.join(rootDir, sourcePath);
      try {
        let originalContent = fs.readFileSync(fullSourcePath, 'utf8');
        // Normalize line endings to LF (Unix-style) to match what the validator expects
        originalContent = originalContent.replace(/\r\n/g, '\n');
        filteredSourcesContent.push(originalContent);
      } catch (err) {
        console.warn(`    Warning: Could not read ${sourcePath}: ${err.message}`);
        filteredSourcesContent.push(null);
      }
    }
  });

  sourceMap.sources = filteredSources;
  sourceMap.sourcesContent = filteredSourcesContent;

  console.log(`  Filtered sources: ${sourceMap.sources.length}`);

  fs.writeFileSync(sourcemapPath, JSON.stringify(sourceMap));
  console.log(`  ✓ Updated ${sourcemapPath}`);
}

// Process all .map files in dist/
const distDir = path.join(__dirname, '../dist');
const mapFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.js.map'));

console.log('\n=== Source Map Filter ===\n');

mapFiles.forEach(file => {
  const mapPath = path.join(distDir, file);
  filterSourceMap(mapPath);
});

console.log('\n✓ All source maps filtered\n');
