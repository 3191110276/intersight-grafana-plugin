#!/usr/bin/env node

/**
 * Package Grafana Plugin
 *
 * Creates a ZIP archive of the plugin suitable for submission to Grafana.
 * The archive includes:
 * - All built files from dist/
 * - Source files from src/ (required for source map validation)
 * - CHANGELOG.md (required by Grafana validator)
 * - README.md (documentation)
 * - LICENSE (required by Grafana validator)
 *
 * Output: {pluginId}-{version}.zip
 */

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`✗ ERROR: ${message}`, colors.red);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function warn(message) {
  log(`⚠ ${message}`, colors.yellow);
}

async function packagePlugin() {
  const startTime = Date.now();

  log('\n=== Grafana Plugin Packager ===\n', colors.bright);

  // Paths
  const rootDir = path.resolve(__dirname, '..');
  const parentDir = path.resolve(__dirname, '../..');
  const distDir = path.join(rootDir, 'dist');
  const pluginJsonPath = path.join(distDir, 'plugin.json');
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const readmePath = path.join(rootDir, 'README.md');
  const licensePath = path.join(rootDir, 'LICENSE');
  const stagingDir = path.join(rootDir, '.staging');

  // Step 1: Validate prerequisites
  info('Step 1: Validating prerequisites...');

  if (!fs.existsSync(distDir)) {
    error('dist/ directory not found.');
    error('Please run "npm run build" first to build the plugin.');
    process.exit(1);
  }

  if (!fs.existsSync(pluginJsonPath)) {
    error('plugin.json not found in dist/ directory.');
    error('Build may have failed. Please check webpack output.');
    process.exit(1);
  }

  success('dist/ directory found');

  // Step 2: Read plugin metadata
  info('\nStep 2: Reading plugin metadata...');

  let pluginJson;
  try {
    pluginJson = await fs.readJson(pluginJsonPath);
  } catch (err) {
    error(`Failed to read plugin.json: ${err.message}`);
    process.exit(1);
  }

  const pluginId = pluginJson.id;
  const pluginVersion = pluginJson.info?.version || '1.0.0';

  if (!pluginId) {
    error('Plugin ID not found in plugin.json');
    process.exit(1);
  }

  success(`Plugin: ${pluginId}`);
  success(`Version: ${pluginVersion}`);

  const zipFileName = `${pluginId}-${pluginVersion}.zip`;
  const zipFilePath = path.join(parentDir, zipFileName);

  // Step 3: Clean up old files
  info('\nStep 3: Cleaning up old files...');

  if (fs.existsSync(zipFilePath)) {
    await fs.remove(zipFilePath);
    success(`Removed old ${zipFileName}`);
  }

  if (fs.existsSync(stagingDir)) {
    await fs.remove(stagingDir);
  }

  // Step 4: Create staging directory
  info('\nStep 4: Creating staging directory...');

  const stagingPluginDir = path.join(stagingDir, pluginId);
  await fs.ensureDir(stagingPluginDir);
  success(`Created staging directory: ${stagingPluginDir}`);

  // Step 5: Copy files to staging
  info('\nStep 5: Copying plugin files...');

  try {
    // Copy all dist/ contents
    await fs.copy(distDir, stagingPluginDir);
    success('Copied dist/ contents');

    // Copy src/ directory (required for source map validation)
    // Exclude plugin.json to avoid "nested plugin" validation error
    const srcDir = path.join(rootDir, 'src');
    if (fs.existsSync(srcDir)) {
      await fs.copy(srcDir, path.join(stagingPluginDir, 'src'), {
        filter: (src) => !src.endsWith('plugin.json')
      });
      success('Copied src/ contents (excluding plugin.json)');
    } else {
      warn('src/ directory not found');
    }

    // Copy CHANGELOG.md (required by Grafana)
    if (fs.existsSync(changelogPath)) {
      await fs.copy(changelogPath, path.join(stagingPluginDir, 'CHANGELOG.md'));
      success('Copied CHANGELOG.md');
    } else {
      warn('CHANGELOG.md not found (recommended for Grafana submission)');
    }

    // Copy README.md (optional but recommended)
    if (fs.existsSync(readmePath)) {
      await fs.copy(readmePath, path.join(stagingPluginDir, 'README.md'));
      success('Copied README.md');
    } else {
      warn('README.md not found');
    }

    // Copy LICENSE (required by Grafana validator)
    if (fs.existsSync(licensePath)) {
      await fs.copy(licensePath, path.join(stagingPluginDir, 'LICENSE'));
      success('Copied LICENSE');
    } else {
      warn('LICENSE file not found (required by Grafana validator)');
    }
  } catch (err) {
    error(`Failed to copy files: ${err.message}`);
    process.exit(1);
  }

  // Step 6: Create ZIP archive
  info('\nStep 6: Creating ZIP archive...');

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', async () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      success(`Created ${zipFileName} (${sizeInMB} MB)`);

      // Step 7: Cleanup staging directory
      info('\nStep 7: Cleaning up...');
      try {
        await fs.remove(stagingDir);
        success('Removed staging directory');
      } catch (err) {
        warn(`Could not remove staging directory: ${err.message}`);
      }

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      log(`\n${colors.bright}${colors.green}✓ Package created successfully in ${elapsedTime}s${colors.reset}\n`);
      log(`${colors.cyan}Next steps:${colors.reset}`);
      log(`  1. Run validation: ${colors.bright}npm run validate${colors.reset}`);
      log(`  2. Or run both: ${colors.bright}npm run package-and-validate${colors.reset}\n`);

      resolve();
    });

    archive.on('error', (err) => {
      error(`Archive creation failed: ${err.message}`);
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        warn(`Archive warning: ${err.message}`);
      } else {
        error(`Archive error: ${err.message}`);
        reject(err);
      }
    });

    archive.pipe(output);

    // Add the entire staging directory to the archive
    // This creates the structure: {pluginId}/... inside the ZIP
    archive.directory(stagingPluginDir, pluginId);

    archive.finalize();
  });
}

// Run the packager
packagePlugin().catch((err) => {
  error(`Packaging failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
