#!/usr/bin/env node

/**
 * Cross-platform build script with platform detection
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Platform detection utilities
const platform = {
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isAndroid: process.platform === 'android',
  get isTermux() {
    return this.isAndroid ||
           process.env.TERMUX === 'true' ||
           process.env.PREFIX?.includes('/com.termux') ||
           process.env.TERMUX_VERSION !== undefined;
  }
};

/**
 * Execute command with platform-specific handling
 */
function execCommand(command, options = {}) {
  try {
    console.log(`🔨 Executing: ${command}`);
    execSync(command, {
      stdio: 'inherit',
      cwd: projectRoot,
      ...options
    });
  } catch {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

/**
 * Check if binary exists and is executable
 */
function checkBinary(binary) {
  const hasBin = existsSync(path.join(projectRoot, 'node_modules', '.bin', binary));
  if (hasBin) {
    try {
      execCommand(`node node_modules/.bin/${binary} --version`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Build for Termux/Android
 */
function buildTermux() {
  console.log('🏗️  Building for Termux/Android...');

  // Check TypeScript is available
  if (!checkBinary('tsc')) {
    console.log('📦 Installing TypeScript...');
    execCommand('npm install typescript --no-save --ignore-scripts --no-bin-links');
  }

  // Fix executable permissions
  console.log('🔧 Fixing executable permissions...');
  try {
    execCommand('find node_modules -name "*.js" -path "*/bin/*" -exec chmod +x {} \\;');
    execCommand('find node_modules -name "tsx" -type f -exec chmod +x {} \\;');
    execCommand('find node_modules -name "esbuild" -type f -exec chmod +x {} \\;');
  } catch {
    console.log('⚠️  Permission fixes failed, continuing...');
  }

  // Run TypeScript compiler
  console.log('📝 Running TypeScript compiler...');
  try {
    if (checkBinary('tsc')) {
      execCommand('node node_modules/.bin/tsc');
    } else {
      execCommand('node node_modules/typescript/bin/tsc');
    }
  } catch {
    console.log('❌ TypeScript compilation failed');
    process.exit(1);
  }

  console.log('✅ Termux build completed!');
}

/**
 * Build for standard platforms (Linux, macOS, Windows)
 */
function buildStandard() {
  console.log('🏗️  Building for standard platform...');

  // Use standard npm build
  execCommand('npm run build');

  console.log('✅ Standard build completed!');
}

/**
 * Main build function
 */
function main() {
  const buildType = process.argv[2];

  console.log(`🚀 Starting build for platform: ${platform.platformString || process.platform}-${process.arch}`);
  console.log(`📁 Project root: ${projectRoot}`);

  // Check if node_modules exists
  if (!existsSync(path.join(projectRoot, 'node_modules'))) {
    console.log('❌ node_modules not found. Please run "npm install" first.');
    process.exit(1);
  }

  // Handle specific build types
  if (buildType === 'termux') {
    buildTermux();
    return;
  }

  if (buildType === 'standard') {
    buildStandard();
    return;
  }

  // Auto-detect and use appropriate build method
  if (platform.isTermux) {
    buildTermux();
  } else {
    buildStandard();
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the build
main();