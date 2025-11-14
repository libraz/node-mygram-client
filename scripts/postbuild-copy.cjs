/**
 * Post-build script to copy native module to standard locations
 *
 * This ensures the native module is accessible from various paths,
 * especially important for Windows and CI environments.
 */

const fs = require('fs');
const path = require('path');

const nodeABI = process.versions.modules;
const platform = process.platform;
const arch = process.arch;

const basePath = path.join(__dirname, '..');
const moduleName = 'mygram_native.node';

// Source paths to check
const sourcePaths = [
  path.join(basePath, 'build', 'Release', moduleName),
  path.join(basePath, 'build', 'Debug', moduleName),
  path.join(basePath, 'lib', 'binding', `node-v${nodeABI}-${platform}-${arch}`, moduleName)
];

// Find the built module
let sourceFile = null;
for (const sourcePath of sourcePaths) {
  if (fs.existsSync(sourcePath)) {
    sourceFile = sourcePath;
    console.log(`✓ Found native module: ${sourcePath}`);
    break;
  }
}

if (!sourceFile) {
  console.log('⚠ Native module not found - skipping post-build copy');
  console.log('  This is expected if building for the first time or native build failed');
  process.exit(0); // Exit successfully - native is optional
}

// Target directory for ABI-versioned path
const targetDir = path.join(basePath, 'lib', 'binding', `node-v${nodeABI}-${platform}-${arch}`);

// Create target directory
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`✓ Created directory: ${targetDir}`);
}

// Copy to ABI-versioned location
const targetFile = path.join(targetDir, moduleName);
try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`✓ Copied to: ${targetFile}`);
} catch (error) {
  console.error(`✗ Failed to copy to ${targetFile}:`, error.message);
}

// Additional copies for common locations
const additionalTargets = [
  path.join(basePath, 'build', 'Release', moduleName),
  path.join(basePath, 'build', 'Debug', moduleName)
];

for (const target of additionalTargets) {
  if (target !== sourceFile) {
    const targetDirPath = path.dirname(target);
    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
    }
    try {
      fs.copyFileSync(sourceFile, target);
      console.log(`✓ Copied to: ${target}`);
    } catch (error) {
      // Ignore errors for additional copies
    }
  }
}

console.log('✓ Post-build copy completed successfully');
