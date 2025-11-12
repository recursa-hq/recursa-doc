#!/usr/bin/env node

/**
 * Cross-platform installation script with platform detection
 */

import { execSync, spawn } from 'child_process';
import { existsSync, chmodSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Platform detection
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
  },
  get platformString() {
    const parts = [process.platform, process.arch];
    if (this.isTermux) parts.push('termux');
    return parts.join('-');
  }
};

/**
 * Execute command with real-time output
 */
function execCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🔨 Executing: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: projectRoot,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Fix executable permissions for Termux/Android
 */
function fixPermissions() {
  console.log('🔧 Fixing executable permissions...');

  const fixes = [
    'find node_modules -name "*.js" -path "*/bin/*" -exec chmod +x {} \\;',
    'find node_modules -name "tsx" -type f -exec chmod +x {} \\;',
    'find node_modules -name "esbuild" -type f -exec chmod +x {} \\;',
    'find node_modules -name "tsc" -type f -exec chmod +x {} \\;'
  ];

  for (const fix of fixes) {
    try {
      execSync(fix, { stdio: 'pipe', cwd: projectRoot });
    } catch {
      console.log(`⚠️  Permission fix failed: ${fix}`);
    }
  }

  // Fix specific binary paths
  const binaryPaths = [
    'node_modules/.bin/tsc',
    'node_modules/.bin/tsx',
    'node_modules/typescript/bin/tsc',
    'node_modules/tsx/dist/cli.mjs'
  ];

  for (const binaryPath of binaryPaths) {
    const fullPath = path.join(projectRoot, binaryPath);
    if (existsSync(fullPath)) {
      try {
        chmodSync(fullPath, 0o755);
      } catch {
        console.log(`⚠️  Could not chmod ${binaryPath}: ${error.message}`);
      }
    }
  }
}

/**
 * Install for Termux/Android
 */
async function installTermux() {
  console.log('📦 Installing for Termux/Android...');

  try {
    // Clean existing installation if present
    if (existsSync(path.join(projectRoot, 'node_modules'))) {
      console.log('🧹 Cleaning existing installation...');
      await execCommand('rm', ['-rf', 'node_modules']);
    }

    // Install with Termux-specific flags
    console.log('📥 Installing dependencies with Termux compatibility...');
    await execCommand('npm', ['install', '--ignore-scripts', '--no-bin-links']);

    // Fix permissions
    fixPermissions();

    // Try to run postinstall scripts manually for critical packages
    console.log('🔧 Running essential postinstall scripts...');
    try {
      const criticalPackages = ['typescript', 'tsx'];
      for (const pkg of criticalPackages) {
        const pkgPath = path.join(projectRoot, 'node_modules', pkg);
        if (existsSync(pkgPath)) {
          const packageJsonPath = path.join(pkgPath, 'package.json');
          if (existsSync(packageJsonPath)) {
            const packageJson = require(packageJsonPath);
            if (packageJson.scripts?.postinstall) {
              console.log(`🔧 Running postinstall for ${pkg}...`);
              try {
                execSync('npm explore ' + pkg + ' -- npm run postinstall', {
                  stdio: 'pipe',
                  cwd: projectRoot
                });
              } catch {
                console.log(`⚠️  Postinstall failed for ${pkg}, continuing...`);
              }
            }
          }
        }
      }
    } catch {
      console.log('⚠️  Postinstall setup failed, continuing...');
    }

    console.log('✅ Termux installation completed!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   npm run build:termux');
    console.log('   npm run dev:termux');

  } catch {
    console.error('❌ Termux installation failed:', error.message);
    process.exit(1);
  }
}

/**
 * Install for standard platforms
 */
async function installStandard() {
  console.log('📦 Installing for standard platform...');

  try {
    // Use standard npm install
    await execCommand('npm', ['install']);

    console.log('✅ Standard installation completed!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   npm run build');
    console.log('   npm run dev');

  } catch {
    console.error('❌ Standard installation failed:', error.message);
    process.exit(1);
  }
}

/**
 * Main installation function
 */
async function main() {
  const installType = process.argv[2];

  console.log(`🚀 Starting installation for platform: ${platform.platformString}`);
  console.log(`📁 Project root: ${projectRoot}`);

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    console.log(`❌ Node.js ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
    process.exit(1);
  }
  console.log(`✅ Node.js version: ${nodeVersion}`);

  // Handle specific installation types
  if (installType === 'termux') {
    await installTermux();
    return;
  }

  if (installType === 'standard') {
    await installStandard();
    return;
  }

  // Auto-detect and use appropriate installation method
  if (platform.isTermux) {
    await installTermux();
  } else {
    await installStandard();
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

// Run the installation
main();