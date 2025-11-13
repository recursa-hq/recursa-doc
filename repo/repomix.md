# Directory Structure
```
docs/
  PLATFORM_SUPPORT.md
  readme.md
  rules.md
  system-prompt.md
  tools.md
  TROUBLESHOOTING.md
scripts/
  build.js
  install.js
src/
  core/
    mem-api/
      file-ops.ts
      fs-walker.ts
      git-ops.ts
      graph-ops.ts
      index.ts
      secure-path.ts
      state-ops.ts
      util-ops.ts
    llm.ts
    loop.ts
    parser.ts
    sandbox.ts
  lib/
    gitignore-parser.ts
    logger.ts
    platform.ts
  types/
    git.ts
    index.ts
    llm.ts
    loop.ts
    mcp.ts
    mem.ts
    sandbox.ts
  config.ts
  server.ts
tests/
  e2e/
    agent-workflow.test.ts
    mcp-workflow.test.ts
  integration/
    mem-api-file-ops.test.ts
    mem-api-git-ops.test.ts
    mem-api-graph-ops.test.ts
    mem-api-state-ops.test.ts
    mem-api-util-ops.test.ts
    workflow.test.ts
  lib/
    test-harness.ts
    test-util.ts
  unit/
    llm.test.ts
    parser.test.ts
  setup.ts
.dockerignore
.env.example
.env.test
.gitignore
.prettierrc.json
Dockerfile
eslint.config.js
INSTALL_TERMUX.md
jest.config.js
package.json
README.md
relay.config.json
repomix.config.json
tasks.md
tsconfig.json
tsconfig.tsbuildinfo
```

# Files

## File: docs/PLATFORM_SUPPORT.md
````markdown
# Cross-Platform Support

This document outlines the cross-platform compatibility features and installation instructions for Recursa MCP Server.

## Supported Platforms

### ✅ Fully Supported
- **Linux** (Ubuntu, Debian, Fedora, Arch, etc.)
- **macOS** (Intel and Apple Silicon)
- **Windows** (Windows 10/11 with WSL2 recommended)
- **Termux/Android** (Android 7.0+)

### ⚠️ Partial Support
- **Windows (Native)** - Limited by symlink support and file system constraints

## Platform-Specific Features

### 🔧 Platform Detection
The server automatically detects the runtime environment and adjusts behavior:

```typescript
import platform from '../src/lib/platform.js';

console.log(`Running on: ${platform.platformString}`);
console.log(`Is Termux: ${platform.isTermux}`);
console.log(`Is Windows: ${platform.isWindows}`);
```

### 📱 Termux/Android Optimizations
- Conservative resource limits (256MB memory, 15s timeout)
- Automatic permission fixes for binary executables
- Storage permission validation
- Symlink-free installation process

### 🖥️ Windows Optimizations
- Case-insensitive path handling
- Drive letter normalization
- UNC path support
- File locking awareness with retry logic

### 🍎 macOS/Linux Optimizations
- Full symlink support
- Native file permissions
- Standard resource limits
- Unix-specific optimizations

## Installation Instructions

### Standard Installation (Linux, macOS, WSL2)
```bash
# Clone the repository
git clone https://github.com/your-repo/recursa-doc.git
cd recursa-doc

# Install dependencies automatically
npm run install:auto

# Build the project
npm run build:auto

# Start development server
npm run dev
```

### Termux/Android Installation
```bash
# Install Termux from F-Droid (recommended)
# Update packages
pkg update && pkg upgrade

# Install required tools
pkg install nodejs npm git

# Clone the repository
git clone https://github.com/your-repo/recursa-doc.git
cd recursa-doc

# Install with Termux-specific optimizations
npm run install:termux

# Build for Termux
npm run build:termux

# Start development server
npm run dev:termux
```

### Windows Native Installation
```bash
# Use Git Bash or PowerShell with admin privileges
git clone https://github.com/your-repo/recursa-doc.git
cd recursa-doc

# Install with Windows compatibility
npm run install:standard

# Build project
npm run build:standard

# Start development server
npm run dev:standard
```

## Configuration

### Environment Variables
All platforms support the same environment variables, with platform-specific defaults:

```bash
# Required
OPENROUTER_API_KEY=your_api_key_here
KNOWLEDGE_GRAPH_PATH=/path/to/your/knowledge/graph

# Optional (platform-specific defaults apply)
LLM_MODEL=anthropic/claude-3-haiku-20240307
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
SANDBOX_TIMEOUT=10000
SANDBOX_MEMORY_LIMIT=100
GIT_USER_NAME=Recursa Agent
GIT_USER_EMAIL=recursa@local
```

### Platform-Specific Defaults

| Setting | Linux/macOS | Termux/Android | Windows |
|---------|-------------|-----------------|---------|
| `LLM_MAX_TOKENS` | 4000 | 2000 | 4000 |
| `LLM_TEMPERATURE` | 0.7 | 0.5 | 0.7 |
| `SANDBOX_TIMEOUT` | 10000ms | 15000ms | 10000ms |
| `SANDBOX_MEMORY_LIMIT` | 512MB | 256MB | 512MB |

## Security Features

### Cross-Platform Path Security
- **Canonical path resolution** using `fs.realpath()`
- **Case-insensitive validation** on Windows and macOS
- **Symlink attack prevention** with configurable policies
- **Path traversal detection** with platform-specific patterns

### File System Protections
- **Atomic file operations** with temporary files
- **Permission validation** adapted for each platform
- **Resource limits** enforced platform-wide
- **Sandbox isolation** with platform-specific constraints

## Troubleshooting

### Common Issues

#### Permission Denied (Termux)
```bash
# Fix storage permissions in Termux
termux-setup-storage

# Or manually fix binary permissions
chmod +x node_modules/.bin/*
```

#### Symlink Errors (Windows)
```bash
# Enable developer mode on Windows
# Or run with administrator privileges

# Alternative: Use WSL2 for full compatibility
wsl --install
```

#### Out of Memory (All Platforms)
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Or use conservative settings in Termux
export SANDBOX_MEMORY_LIMIT=128
```

#### Git Integration Issues
```bash
# Configure git for the current user
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# For Termux, ensure git is installed
pkg install git
```

### Platform-Specific Debugging

#### Enable Debug Logging
```bash
# Set debug environment variable
export DEBUG=recursa:*
export NODE_ENV=development

# Run with verbose output
npm run dev -- --verbose
```

#### Platform Detection Output
```bash
# Check what platform is detected
node -e "import('./src/lib/platform.js').then(p => console.log(p.default.platformString))"
```

## Development

### Testing on Multiple Platforms
```bash
# Run platform-specific tests
npm run test:linux
npm run test:macos
npm run test:windows
npm run test:termux
```

### Building for Specific Platforms
```bash
# Explicit platform builds
npm run build:standard  # Linux/macOS/Windows
npm run build:termux    # Termux/Android
```

### Cross-Platform CI/CD
The project includes GitHub Actions for testing across:
- Ubuntu (latest)
- macOS (latest)
- Windows (latest)
- Android/Termux (emulated)

## Performance Considerations

### Termux/Android
- Reduced memory and CPU limits
- Conservative token limits
- Longer timeouts for mobile network conditions
- Optimized for battery life

### Desktop Platforms
- Full resource utilization
- Standard token limits
- Faster response times
- Complete feature set

### Windows Native
- Slightly reduced performance due to filesystem constraints
- Additional validation overhead
- Recommended to use WSL2 for best performance

## Contributing

When adding new features:
1. Test on all supported platforms
2. Use platform detection utilities from `src/lib/platform.ts`
3. Add platform-specific defaults where appropriate
4. Update documentation for platform-specific behavior
5. Include cross-platform tests in CI/CD

### Platform Detection Usage
```typescript
import platform from '../src/lib/platform.js';

if (platform.isTermux) {
  // Termux-specific code
  const limits = platform.getResourceLimits();
  console.log(`Memory limit: ${limits.maxMemory}`);
}

if (platform.isWindows) {
  // Windows-specific code
  const normalizedPath = platform.normalizePath(userPath);
}
```

## Limitations

### Windows Native
- No symlink support in node_modules
- Case-insensitive filesystem may cause issues
- Some Unix-specific tools unavailable

### Termux/Android
- Limited memory and CPU resources
- Storage access restrictions
- Some native modules may not compile

### macOS
- Gatekeeper may block execution of unsigned binaries
- Case-insensitive filesystem can cause path issues

## Support

For platform-specific issues:
1. Check this documentation first
2. Review troubleshooting section
3. Check existing GitHub issues
4. Create new issue with platform information:
   - Operating system and version
   - Node.js version
   - Platform detection output
   - Error messages and logs
````

## File: docs/TROUBLESHOOTING.md
````markdown
# Troubleshooting Guide

This guide covers common issues and their solutions across different platforms.

## Installation Issues

### npm install fails with permission errors

#### Linux/macOS
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Alternative: Use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Termux/Android
```bash
# Use Termux-specific installation
npm run install:termux

# Or manually fix permissions
find node_modules -name "*.js" -path "*/bin/*" -exec chmod +x {} \;
```

#### Windows
```bash
# Run as administrator
# Or use PowerShell with elevated privileges

# Alternative: Use Chocolatey or Scoop
choco install nodejs
# or
scoop install nodejs
```

### Symlink errors during installation

#### Windows Native
```bash
# Enable Developer Mode
# Settings > Update & Security > For developers > Developer mode

# Or run with administrator privileges
npm install --no-bin-links
```

#### All Platforms
```bash
# Use the cross-platform installer
npm run install:auto

# Manual installation without symlinks
npm install --ignore-scripts --no-bin-links
```

## Build Issues

### TypeScript compilation fails

#### General Solutions
```bash
# Clean build
rm -rf node_modules dist
npm run install:auto
npm run build:auto

# Check TypeScript version
npx tsc --version

# Manual compilation
node node_modules/typescript/bin/tsc
```

#### Termux Specific
```bash
# Ensure TypeScript is executable
chmod +x node_modules/.bin/tsc
chmod +x node_modules/typescript/bin/tsc

# Use Termux build script
npm run build:termux
```

#### Windows Specific
```bash
# Use Windows build script
npm run build:standard

# Check if paths are too long (Windows limitation)
# Move project closer to drive root (e.g., C:\dev\recursa)
```

## Runtime Issues

### "Permission denied" errors

#### File Access Issues
```bash
# Check file permissions
ls -la filename

# Fix permissions (Unix-like systems)
chmod 644 filename
chmod 755 directory

# Windows: Check file properties > Security
# Ensure your user has read/write permissions
```

#### Termux Storage Permissions
```bash
# Setup storage access
termux-setup-storage

# Check if storage is accessible
ls -R ~/storage/shared

# Use internal storage for knowledge graph
export KNOWLEDGE_GRAPH_PATH=~/storage/shared/Documents/knowledge-graph
```

#### Git Repository Permissions
```bash
# Check git repository permissions
git status

# Fix git repository permissions (Unix-like)
chmod -R u+rw .git/

# Windows: Ensure git repository isn't read-only
# Right-click folder > Properties > uncheck "Read-only"
```

### Memory errors

#### Node.js Out of Memory
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Windows
set NODE_OPTIONS=--max-old-space-size=2048

# Run with increased memory
node --max-old-space-size=2048 dist/server.js
```

#### Termux Memory Limits
```bash
# Use conservative settings
export SANDBOX_MEMORY_LIMIT=128
export LLM_MAX_TOKENS=1000

# Check available memory
free -h  # Linux/Termux
```

#### Windows Memory Issues
```bash
# Close unnecessary applications
# Increase virtual memory
# System > Advanced system settings > Performance > Advanced > Virtual memory
```

### Network/Connection Issues

#### API Connection Problems
```bash
# Test network connectivity
curl -I https://openrouter.ai/api/v1/models

# Check if API key is valid
echo $OPENROUTER_API_KEY

# Use proxy if necessary
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

#### Git Repository Issues
```bash
# Check git configuration
git config --list

# Configure git if needed
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Test git repository access
git remote -v
git fetch origin
```

## Platform-Specific Issues

### Termux/Android

#### Package Installation Fails
```bash
# Update package databases
pkg update && pkg upgrade

# Install required packages
pkg install nodejs npm git make python

# Clear npm cache
npm cache clean --force
```

#### Storage Access Denied
```bash
# Request storage permissions
termux-setup-storage

# Check accessible directories
ls ~/storage/

# Use accessible storage location
export KNOWLEDGE_GRAPH_PATH=~/storage/shared/Documents/recursa
```

#### Performance Issues
```bash
# Use conservative settings
export LLM_MAX_TOKENS=500
export LLM_TEMPERATURE=0.3
export SANDBOX_TIMEOUT=30000

# Monitor resource usage
top -n 1
```

### Windows

#### Path Too Long Errors
```bash
# Move project closer to drive root
# C:\recursa instead of C:\Users\name\long\path\to\project

# Enable long path support (Windows 10 1607+)
# Group Policy Editor > Computer Configuration > Administrative Templates > System > Filesystem > Enable Win32 long paths
```

#### PowerShell Execution Policy
```powershell
# Check execution policy
Get-ExecutionPolicy

# Set execution policy (run as administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Antivirus Blocking
```bash
# Add exception for Node.js and your project folder
# Windows Security > Virus & threat protection > Manage settings > Add or remove exclusions
```

### macOS

#### Gatekeeper Blocking App
```bash
# Allow app from unidentified developer
# System Preferences > Security & Privacy > General > Allow apps downloaded from: App Store and identified developers

# Or allow specific app
xattr -d com.apple.quarantine /path/to/app
```

#### File Permissions Issues
```bash
# Fix permissions for user-owned files
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Alternative: Use Homebrew for Node.js
brew install node
```

### Linux

#### Permission Denied for Global Packages
```bash
# Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Or configure npm global directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### Package Building Issues
```bash
# Install build tools
# Ubuntu/Debian
sudo apt-get install build-essential

# Fedora
sudo dnf groupinstall "Development Tools"

# Arch Linux
sudo pacman -S base-devel
```

## Debugging

### Enable Debug Logging
```bash
# Set debug environment variable
export DEBUG=recursa:*

# Set Node.js debug mode
export NODE_ENV=development

# Run with verbose output
npm run dev -- --verbose --log-level debug
```

### Check Platform Detection
```bash
# Test platform detection
node -e "
import('./src/lib/platform.js').then(platform => {
  console.log('Platform:', platform.default.platformString);
  console.log('Is Termux:', platform.default.isTermux);
  console.log('Is Windows:', platform.default.isWindows);
  console.log('Has Symlinks:', platform.default.supportsSymlinks);
});
"
```

### Validate Configuration
```bash
# Test configuration loading
node -e "
import('./src/config.js').then(config => {
  config.loadAndValidateConfig()
    .then(cfg => console.log('Config valid:', cfg))
    .catch(err => console.error('Config error:', err));
});
"
```

### Check Dependencies
```bash
# Verify all dependencies are installed
npm ls

# Check for missing binaries
npx tsc --version
npx tsx --version

# Test individual components
node -e "console.log('Node.js works')"
node -e "import('./src/lib/platform.js').then(() => console.log('Platform module works'))"
```

## Performance Optimization

### General Tips
```bash
# Use SSD storage for knowledge graph
# Increase Node.js memory limit
# Use latest Node.js version
# Enable compression for large files
```

### Termux Optimization
```bash
# Use conservative LLM settings
export LLM_MAX_TOKENS=500
export LLM_TEMPERATURE=0.3

# Close background apps
# Use WiFi instead of mobile data
```

### Desktop Optimization
```bash
# Use higher token limits for better results
export LLM_MAX_TOKENS=4000
export SANDBOX_MEMORY_LIMIT=1024

# Enable parallel processing if supported
export WORKER_THREADS=4
```

## Getting Help

### Collect Debug Information
```bash
# Create debug report
{
  echo "=== Platform Information ==="
  uname -a
  node --version
  npm --version

  echo "=== Platform Detection ==="
  node -e "import('./src/lib/platform.js').then(p => console.log(p.default.platformString))"

  echo "=== Environment Variables ==="
  env | grep -E "(RECURSA|NODE|PATH)" | sort

  echo "=== Dependency Status ==="
  npm ls --depth=0

  echo "=== Configuration Status ==="
  node -e "
    import('./src/config.js').then(config => {
      config.loadAndValidateConfig()
        .then(cfg => console.log('✅ Configuration valid'))
        .catch(err => console.error('❌ Configuration error:', err.message));
    });
  "
} > debug-report.txt

# Share debug-report.txt when asking for help
```

### File an Issue
When creating GitHub issues, include:
1. Operating system and version
2. Node.js and npm versions
3. Platform detection output
4. Error messages and stack traces
5. Steps to reproduce the issue
6. Debug report (if applicable)

### Community Support
- Check existing GitHub issues
- Review documentation
- Ask questions in discussions
- Join Discord/Slack communities (if available)
````

## File: scripts/build.js
````javascript
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
````

## File: scripts/install.js
````javascript
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
````

## File: src/lib/platform.ts
````typescript
/**
 * Platform detection and utilities for cross-platform compatibility
 */

export const platform = {
  /** Current operating system platform */
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isAndroid: process.platform === 'android',

  /** Termux environment detection */
  get isTermux(): boolean {
    return this.isAndroid ||
           process.env.TERMUX === 'true' ||
           process.env.PREFIX?.includes('/com.termux') ||
           process.env.TERMUX_VERSION !== undefined;
  },

  /** WSL (Windows Subsystem for Linux) detection */
  get isWSL(): boolean {
    return this.isLinux && (
      process.env.WSL_DISTRO_NAME !== undefined ||
      process.env.WSLENV !== undefined ||
      require('fs').existsSync('/proc/version') &&
      require('fs').readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft')
    );
  },

  /** File system capabilities */
  get hasCaseInsensitiveFS(): boolean {
    return this.isWindows || this.isMacOS;
  },

  get hasFilePermissions(): boolean {
    return !this.isWindows;
  },

  get supportsSymlinks(): boolean {
    return this.isLinux || this.isMacOS || this.isWSL;
  },

  get supportsHardLinks(): boolean {
    return this.isLinux || this.isMacOS;
  },

  /** Path separator */
  get pathSeparator(): string {
    return this.isWindows ? '\\' : '/';
  },

  /** Line ending */
  get lineEnding(): string {
    return this.isWindows ? '\r\n' : '\n';
  },

  /** Executable file extensions */
  get executableExtensions(): string[] {
    return this.isWindows ? ['.exe', '.bat', '.cmd'] : [];
  },

  /** Environment variable normalization */
  normalizeEnvVar(key: string): string {
    return this.isWindows ? key.toUpperCase() : key;
  },

  /** Path normalization for cross-platform */
  normalizePath(p: string): string {
    const normalized = require('path').normalize(p);
    if (this.isWindows) {
      return normalized.replace(/\//g, '\\');
    }
    return normalized.replace(/\\/g, '/');
  },

  /** Check if path is absolute */
  isAbsolute(p: string): boolean {
    if (this.isWindows) {
      return /^[A-Za-z]:\\|\\\\/.test(p) || require('path').isAbsolute(p);
    }
    return require('path').isAbsolute(p);
  },

  /** Get platform-specific resource limits */
  getResourceLimits() {
    const limits = {
      maxMemory: 512 * 1024 * 1024, // 512MB default
      maxCpuTime: 30000, // 30 seconds default
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      maxProcesses: 10,
    };

    if (this.isTermux) {
      // More conservative limits for mobile environments
      return {
        ...limits,
        maxMemory: 256 * 1024 * 1024, // 256MB
        maxCpuTime: 15000, // 15 seconds
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxProcesses: 5,
      };
    }

    return limits;
  },

  /** Get platform-specific temp directory */
  getTempDir(): string {
    const os = require('os');
    const path = require('path');

    if (this.isWindows) {
      return process.env.TEMP || process.env.TMP || path.join(os.tmpdir(), 'recursa');
    }

    return process.env.TMPDIR || os.tmpdir();
  },

  /** Get platform-specific user data directory */
  getUserDataDir(appName: string = 'recursa'): string {
    const os = require('os');
    const path = require('path');
    const homeDir = os.homedir();

    if (this.isWindows) {
      return process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming', appName);
    }

    if (this.isMacOS) {
      return path.join(homeDir, 'Library', 'Application Support', appName);
    }

    // Linux, Android, etc.
    return process.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share', appName);
  },

  /** Platform-specific error handling */
  handleFileError(error: Error & { code?: string }, operation: string, filePath?: string): Error {
    const message = filePath ? `${operation} failed for ${filePath}` : `${operation} failed`;

    if (this.isWindows) {
      // Windows-specific error codes and messages
      if (error.code === 'EPERM') {
        return new Error(`${message}: Permission denied. Try running as administrator.`);
      }
      if (error.code === 'EBUSY') {
        return new Error(`${message}: File is in use by another process.`);
      }
    }

    if (this.isTermux) {
      // Termux/Android specific errors
      if (error.code === 'EACCES') {
        return new Error(`${message}: Permission denied. Check storage permissions.`);
      }
    }

    return new Error(`${message}: ${error.message}`);
  },

  /** Platform detection string for logging */
  get platformString(): string {
    const parts: string[] = [process.platform, process.arch];

    if (this.isTermux) parts.push('termux');
    if (this.isWSL) parts.push('wsl');

    return parts.join('-');
  },

  /** Feature detection */
  async detectFeatures(): Promise<Record<string, boolean>> {
    const fs = require('fs').promises;
    const features: Record<string, boolean> = {};

    // Test symlink support
    try {
      const testFile = require('path').join(this.getTempDir(), 'symlink-test');
      await fs.writeFile(testFile, 'test');
      const linkFile = testFile + '-link';
      await fs.symlink(testFile, linkFile);
      await fs.unlink(linkFile);
      await fs.unlink(testFile);
      features.symlinks = true;
    } catch {
      features.symlinks = false;
    }

    // Test hard link support
    try {
      const testFile = require('path').join(this.getTempDir(), 'hardlink-test');
      await fs.writeFile(testFile, 'test');
      const linkFile = testFile + '-hard';
      await fs.link(testFile, linkFile);
      await fs.unlink(linkFile);
      await fs.unlink(testFile);
      features.hardLinks = true;
    } catch {
      features.hardLinks = false;
    }

    // Test file permissions
    try {
      const testFile = require('path').join(this.getTempDir(), 'perm-test');
      await fs.writeFile(testFile, 'test');
      await fs.chmod(testFile, 0o755);
      await fs.unlink(testFile);
      features.filePermissions = true;
    } catch {
      features.filePermissions = false;
    }

    return features;
  }
};

export default platform;
````

## File: tests/integration/mem-api-file-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';
import path from 'path';
import { promises as fs } from 'fs';

describe('MemAPI File Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should write, read, and check existence of a file', async () => {
    const filePath = 'test.md';
    const content = 'hello world';

    await mem.writeFile(filePath, content);

    const readContent = await mem.readFile(filePath);
    expect(readContent).toBe(content);

    const exists = await mem.fileExists(filePath);
    expect(exists).toBe(true);

    const nonExistent = await mem.fileExists('not-real.md');
    expect(nonExistent).toBe(false);
  });

  it('should create nested directories', async () => {
    const dirPath = 'a/b/c';
    await mem.createDir(dirPath);
    const stats = await fs.stat(path.join(harness.tempDir, dirPath));
    expect(stats.isDirectory()).toBe(true);
  });

  it('should list files in a directory', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.writeFile('b.txt', 'b');
    await mem.createDir('subdir');
    await mem.writeFile('subdir/c.txt', 'c');

    const rootFiles = await mem.listFiles();
    expect(rootFiles).toEqual(
      expect.arrayContaining(['a.txt', 'b.txt', 'subdir'])
    );
    expect(rootFiles.length).toBeGreaterThanOrEqual(3); // .gitignore might be there

    const subdirFiles = await mem.listFiles('subdir');
    expect(subdirFiles).toEqual(['c.txt']);

    await mem.createDir('empty');
    const emptyFiles = await mem.listFiles('empty');
    expect(emptyFiles).toEqual([]);
  });

  it('should update a file atomically and fail if content changes', async () => {
    const filePath = 'atomic.txt';
    const originalContent = 'version 1';
    const newContent = 'version 2';

    // 1. Successful update
    await mem.writeFile(filePath, originalContent);
    const success = await mem.updateFile(filePath, originalContent, newContent);
    expect(success).toBe(true);
    const readContent1 = await mem.readFile(filePath);
    expect(readContent1).toBe(newContent);

    // 2. Failed update (content changed underneath)
    const currentContent = await mem.readFile(filePath); // "version 2"
    const nextContent = 'version 3';

    // Simulate another process changing the file
    await fs.writeFile(path.join(harness.tempDir, filePath), 'version 2.5');

    // The update should fail because 'currentContent' ("version 2") no longer matches the file on disk ("version 2.5")
    await expect(
      mem.updateFile(filePath, currentContent, nextContent)
    ).rejects.toThrow(/File content has changed since it was last read/);

    // Verify the file was NOT changed by the failed update
    const readContent2 = await mem.readFile(filePath);
    expect(readContent2).toBe('version 2.5');
  });

  it('should delete a file and a directory recursively', async () => {
    // Delete file
    await mem.writeFile('file-to-delete.txt', 'content');
    expect(await mem.fileExists('file-to-delete.txt')).toBe(true);
    await mem.deletePath('file-to-delete.txt');
    expect(await mem.fileExists('file-to-delete.txt')).toBe(false);

    // Delete directory
    await mem.createDir('dir-to-delete/subdir');
    await mem.writeFile('dir-to-delete/subdir/file.txt', 'content');
    expect(await mem.fileExists('dir-to-delete/subdir/file.txt')).toBe(true);
    await mem.deletePath('dir-to-delete');
    expect(await mem.fileExists('dir-to-delete')).toBe(false);
  });

  it('should rename a file and a directory', async () => {
    // Rename file
    await mem.writeFile('old-name.txt', 'content');
    expect(await mem.fileExists('old-name.txt')).toBe(true);
    await mem.rename('old-name.txt', 'new-name.txt');
    expect(await mem.fileExists('old-name.txt')).toBe(false);
    expect(await mem.fileExists('new-name.txt')).toBe(true);
    expect(await mem.readFile('new-name.txt')).toBe('content');

    // Rename directory
    await mem.createDir('old-dir/subdir');
    await mem.writeFile('old-dir/subdir/file.txt', 'content');
    expect(await mem.fileExists('old-dir')).toBe(true);
    await mem.rename('old-dir', 'new-dir');
    expect(await mem.fileExists('old-dir')).toBe(false);
    expect(await mem.fileExists('new-dir/subdir/file.txt')).toBe(true);
  });

  describe('Path Traversal Security', () => {
    const maliciousPath = '../../../etc/malicious';
    const ops: { name: string; fn: (mem: MemAPI) => Promise<unknown> }[] = [
      { name: 'readFile', fn: (mem) => mem.readFile(maliciousPath) },
      { name: 'writeFile', fn: (mem) => mem.writeFile(maliciousPath, '...') },
      {
        name: 'updateFile',
        fn: (mem) => mem.updateFile(maliciousPath, 'old', 'new'),
      },
      { name: 'deletePath', fn: (mem) => mem.deletePath(maliciousPath) },
      { name: 'rename_from', fn: (mem) => mem.rename(maliciousPath, 'safe') },
      { name: 'rename_to', fn: (mem) => mem.rename('safe', maliciousPath) },
      { name: 'fileExists', fn: (mem) => mem.fileExists(maliciousPath) },
      { name: 'createDir', fn: (mem) => mem.createDir(maliciousPath) },
      { name: 'listFiles', fn: (mem) => mem.listFiles(maliciousPath) },
    ];

    for (const op of ops) {
      it(`should block path traversal for ${op.name}`, async () => {
        // fileExists should return false, not throw, for security reasons.
        if (op.name === 'fileExists') {
          await expect(op.fn(mem)).resolves.toBe(false);
        } else {
          // All other ops should reject with a security error.
          await expect(op.fn(mem)).rejects.toThrow(
            /Path traversal attempt detected|Security violation/
          );
        }
      });
    }
  });
});
````

## File: tests/integration/mem-api-git-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI Git Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should commit a change and log it', async () => {
    const filePath = 'a.md';
    const content = 'content';
    const commitMessage = 'feat: add a.md';

    await mem.writeFile(filePath, content);

    const commitHash = await mem.commitChanges(commitMessage);

    expect(typeof commitHash).toBe('string');
    expect(commitHash.length).toBeGreaterThan(5);

    const log = await mem.gitLog(filePath, 1);

    expect(log).toHaveLength(1);
    expect(log[0]).toBeDefined();
    expect(log[0]?.message).toBe(commitMessage);
  });

  it('should return diff for a file', async () => {
    const filePath = 'a.md';
    await mem.writeFile(filePath, 'version 1');
    await mem.commitChanges('v1');

    await mem.writeFile(filePath, 'version 1\nversion 2');
    const commitV2Hash = await mem.commitChanges('v2');

    await mem.writeFile(filePath, 'version 1\nversion 2\nversion 3');

    // Diff against HEAD (working tree vs last commit)
    const diffWorking = await mem.gitDiff(filePath);
    expect(diffWorking).toContain('+version 3');

    // Diff between two commits
    const diffCommits = await mem.gitDiff(filePath, 'HEAD~1', 'HEAD');
    expect(diffCommits).toContain('+version 2');
    expect(diffCommits).not.toContain('+version 3');

    // Diff from a specific commit to HEAD
    const diffFromCommit = await mem.gitDiff(filePath, commitV2Hash);
    expect(diffFromCommit).toContain('+version 3');
  });

  it('should get changed files from the working tree', async () => {
    // Setup
    await mem.writeFile('a.txt', 'a');
    await mem.writeFile('b.txt', 'b');
    await mem.commitChanges('initial commit');

    // 1. Modify a.txt
    await mem.writeFile('a.txt', 'a modified');

    // 2. Create c.txt
    await mem.writeFile('c.txt', 'c');

    // 3. Delete b.txt
    await mem.deletePath('b.txt');

    // 4. Create and stage d.txt
    await mem.writeFile('d.txt', 'd');
    await harness.git.add('d.txt');

    const changedFiles = await mem.getChangedFiles();

    expect(changedFiles).toEqual(
      expect.arrayContaining(['a.txt', 'b.txt', 'c.txt', 'd.txt'])
    );
    expect(changedFiles.length).toBe(4);
  });

  it('should handle commit with no changes', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.commitChanges('commit 1');

    // Calling commitChanges with no changes should not throw an error
    const commitHash = await mem.commitChanges('no changes');
    expect(commitHash).toBe('No changes to commit.');

    // Verify no new commit was created
    const log = await mem.gitLog(undefined, 2);
    expect(log).toHaveLength(2); // commit 1 + initial .gitignore commit
    expect(log[0]?.message).toBe('commit 1');
  });

  it('should get git log for the whole repo', async () => {
    await mem.writeFile('a.txt', 'a');
    await mem.commitChanges('commit A');
    await mem.writeFile('b.txt', 'b');
    await mem.commitChanges('commit B');

    // Get full repo log
    const log = await mem.gitLog(undefined, 3);
    expect(log).toHaveLength(3); // A, B, and initial .gitignore
    expect(log[0]?.message).toBe('commit B');
    expect(log[1]?.message).toBe('commit A');
    expect(log[2]?.message).toContain('Initial commit');
  });
});
````

## File: tests/setup.ts
````typescript
// Jest setup file to handle Node.js v25+ compatibility issues
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});
````

## File: INSTALL_TERMUX.md
````markdown
# Termux Installation Guide

This project works on Termux with some modifications due to Android's filesystem limitations.

## Prerequisites
```bash
pkg update && pkg upgrade
pkg install nodejs npm git
```

## Installation (Termux-specific)
```bash
# Install dependencies with Termux compatibility flags
npm install --ignore-scripts --no-bin-links

# Make binaries executable
find node_modules -name "*.js" -path "*/bin/*" -exec chmod +x {} \;
find node_modules -name "tsx" -type f -exec chmod +x {} \;
find node_modules -name "esbuild" -type f -exec chmod +x {} \;

# Run TypeScript compiler directly using npx
npx tsc

# Start development server
npx tsx watch src/server.ts
```

## Alternative: Use the prepared scripts
```bash
npm run install:termux
npm run dev:termux
```

## Known Limitations
- Binary executables need manual permission fixes
- Some linting tools may not work due to missing binaries
- ESLint and Prettier dependencies removed for compatibility
````

## File: README.md
````markdown
# Recursa MCP Server

A Git-Native AI agent with MCP (Model Context Protocol) support that works across multiple platforms.

## 🌟 Cross-Platform Support

✅ **Linux, macOS, Windows (WSL2), Termux/Android**
📱 **Mobile-optimized** with conservative resource limits
🔒 **Enhanced security** with cross-platform path protection
⚡ **Auto-detecting** platform detection and optimization

## 🚀 Quick Start

### Automatic Installation (Recommended)
```bash
# Clone and install with automatic platform detection
git clone https://github.com/your-repo/recursa-doc.git
cd recursa-doc
npm run install:auto
npm run build:auto
npm run dev
```

### Platform-Specific Installation

#### Linux, macOS, Windows (WSL2)
```bash
npm run install:standard
npm run build:standard
npm run dev:standard
```

#### Termux/Android
```bash
# Install Termux from F-Droid, then:
pkg update && pkg install nodejs npm git
npm run install:termux
npm run build:termux
npm run dev:termux
```

## 📋 Prerequisites

### Minimum Requirements
- **Node.js 18+**
- **Git** for version control
- **512MB RAM** (1GB+ recommended)

### Platform-Specific

#### Termux/Android
- Android 7.0+ with Termux app
- Storage permissions (`termux-setup-storage`)

#### Windows
- Windows 10/11 (WSL2 recommended)
- PowerShell or Git Bash
- Developer mode enabled (for symlink support)

#### Linux
- Build tools for native modules:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install build-essential

  # Fedora
  sudo dnf groupinstall "Development Tools"
  ```

## ⚙️ Configuration

Create a `.env` file with your configuration:

```bash
# Required
OPENROUTER_API_KEY=your_api_key_here
KNOWLEDGE_GRAPH_PATH=/path/to/your/knowledge/graph

# Optional (platform-specific defaults apply)
LLM_MODEL=anthropic/claude-3-haiku-20240307
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
SANDBOX_TIMEOUT=10000
SANDBOX_MEMORY_LIMIT=100
GIT_USER_NAME=Recursa Agent
GIT_USER_EMAIL=recursa@local
```

### Platform-Specific Defaults

| Platform | Memory Limit | Max Tokens | Timeout |
|----------|--------------|------------|---------|
| Desktop (Linux/macOS/Windows) | 512MB | 4000 | 10s |
| Termux/Android | 256MB | 2000 | 15s |

## 🏗️ Build & Development

### Available Scripts
```bash
# Installation
npm run install:auto     # Auto-detect platform and install
npm run install:termux   # Termux/Android specific
npm run install:standard # Standard platforms

# Building
npm run build:auto       # Auto-detect platform and build
npm run build:termux     # Termux/Android specific
npm run build:standard   # Standard platforms

# Development
npm run dev              # Standard development
npm run dev:termux       # Termux development
npm run dev:standard     # Standard development

# Production
npm run start            # Start production server
npm run start:termux     # Termux production
npm run start:standard   # Standard production

# Utilities
npm run typecheck        # TypeScript type checking
npm run test             # Run tests
```

## 📁 Project Structure

```
recursa-doc/
├── src/
│   ├── lib/
│   │   └── platform.ts          # Cross-platform utilities
│   ├── core/
│   │   ├── mem-api/
│   │   │   ├── secure-path.ts   # Enhanced path security
│   │   │   └── file-ops.ts      # Cross-platform file operations
│   │   └── sandbox.ts           # Platform-aware sandbox
│   ├── config.ts                # Platform-aware configuration
│   └── server.ts                # Main server
├── scripts/
│   ├── install.js               # Cross-platform installer
│   └── build.js                 # Cross-platform builder
├── docs/
│   ├── PLATFORM_SUPPORT.md      # Detailed platform info
│   └── TROUBLESHOOTING.md       # Troubleshooting guide
└── tests/                       # Cross-platform tests
```

## 🔧 Features

### Cross-Platform Capabilities
- **Automatic platform detection** (Linux, macOS, Windows, Termux/Android)
- **Adaptive resource limits** based on platform capabilities
- **Cross-platform path security** with symlink protection
- **Atomic file operations** with platform-specific error handling
- **Platform-aware build system** with automatic fallbacks

### Core Functionality
- **MCP Protocol Support** for model context integration
- **Git-Native Operations** with full repository management
- **Secure File Operations** with path traversal protection
- **Sandboxed Execution** with resource limits
- **TypeScript Support** with full type safety

### Security Features
- **Path Traversal Protection** with cross-platform validation
- **Symlink Attack Prevention** with configurable policies
- **Resource Limiting** (memory, CPU, file size)
- **Sandbox Isolation** with platform-specific constraints

## 🐛 Troubleshooting

### Common Issues

#### Installation Fails
```bash
# Try platform-specific installation
npm run install:termux    # For Termux/Android
npm run install:standard  # For desktop platforms

# Or manual installation
npm install --ignore-scripts --no-bin-links
```

#### Permission Errors
```bash
# Termux: Setup storage access
termux-setup-storage

# Linux/macOS: Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Windows: Run as administrator or enable Developer Mode
```

#### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules dist
npm run install:auto
npm run build:auto

# Check platform detection
node -e "import('./src/lib/platform.js').then(p => console.log(p.default.platformString))"
```

For detailed troubleshooting, see [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## 📚 Documentation

- [Platform Support](docs/PLATFORM_SUPPORT.md) - Detailed platform information
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [API Documentation](docs/API.md) - API reference (coming soon)
- [Development Guide](docs/DEVELOPMENT.md) - Contributing guidelines (coming soon)

## 🔍 Platform Detection

The server automatically detects and optimizes for your platform:

```typescript
import platform from './src/lib/platform.js';

console.log(`Platform: ${platform.platformString}`);
console.log(`Is Termux: ${platform.isTermux}`);
console.log(`Resource limits:`, platform.getResourceLimits());
console.log(`Temp directory: ${platform.getTempDir()}`);
```

## 🤝 Contributing

Contributions are welcome! Please ensure:
1. Test on all supported platforms
2. Use platform detection utilities
3. Update documentation
4. Include cross-platform tests

### Development Setup
```bash
# Clone and install for development
git clone https://github.com/your-repo/recursa-doc.git
cd recursa-doc
npm run install:auto
npm run dev

# Run tests across platforms
npm run test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 Check [documentation](docs/)
- 🐛 [Report issues](https://github.com/your-repo/recursa-doc/issues)
- 💬 [Discussions](https://github.com/your-repo/recursa-doc/discussions)

## 🔮 Roadmap

- [ ] Additional platform support (FreeBSD, iOS)
- [ ] Docker multi-platform builds
- [ ] Performance optimizations
- [ ] Enhanced monitoring and logging
- [ ] Plugin system for extensions
- [ ] Web UI for configuration

---

**Built with ❤️ for cross-platform AI agent development**
````

## File: src/lib/gitignore-parser.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Represents a parsed gitignore pattern
 */
interface GitignorePattern {
  pattern: string;
  isNegated: boolean;
  isDirectory: boolean;
}

/**
 * Creates a gitignore pattern object from a raw pattern string
 */
const parsePattern = (rawPattern: string): GitignorePattern | null => {
  // Skip empty lines and comments
  if (!rawPattern.trim() || rawPattern.trim().startsWith('#')) {
    return null;
  }

  const trimmed = rawPattern.trim();
  const isNegated = trimmed.startsWith('!');
  const pattern = isNegated ? trimmed.slice(1) : trimmed;
  const isDirectory = pattern.endsWith('/');

  return {
    pattern: isDirectory ? pattern.slice(0, -1) : pattern,
    isNegated,
    isDirectory,
  };
};

/**
 * Tests if a file path matches a gitignore pattern
 */
const matchesPattern = (
  filePath: string,
  relativePath: string,
  parsedPattern: GitignorePattern
): boolean => {
  const { pattern, isDirectory } = parsedPattern;
  
  // Convert gitignore pattern to regex
  let regexPattern = pattern
    // Escape special regex characters except * and ?
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Convert * to match any characters except path separators
    .replace(/\*/g, '[^/]*')
    // Convert ? to match any single character except path separators
    .replace(/\?/g, '[^/]')
    // Convert ** to match any characters including path separators
    .replace(/\*\*/g, '.*')
    // Anchors for start and end
    .replace(/^(?![^/])/, '^')
    .replace(/(?<![^/])$/, '$');

  // If pattern doesn't contain a slash, match against basename only
  if (!pattern.includes('/')) {
    regexPattern = `(?:^|.*/)${regexPattern}`;
  }

  const regex = new RegExp(regexPattern);
  
  // For directory patterns, ensure we're matching directories
  if (isDirectory) {
    // Check if it's a directory (ends with / in relative path)
    if (!relativePath.endsWith('/')) {
      return false;
    }
  }

  // Test against relative path
  const matches = regex.test(relativePath);
  
  return matches;
};

/**
 * Creates an ignore filter function from a .gitignore file
 * @param directory The directory containing the .gitignore file
 * @returns A function that returns true if a path should be ignored
 */
export const createIgnoreFilter = async (
  directory: string
): Promise<(filePath: string) => boolean> => {
  const gitignorePath = path.join(directory, '.gitignore');
  
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    const lines = content.split('\n');
    
    const patterns: GitignorePattern[] = [];
    for (const line of lines) {
      const parsed = parsePattern(line);
      if (parsed) {
        patterns.push(parsed);
      }
    }

    // Return the filter function
    return (filePath: string): boolean => {
      const relativePath = path.relative(directory, filePath);
      
      if (relativePath === '') return false; // Never ignore the root directory
      
      let isIgnored = false;
      
      // Process patterns in order
      for (const pattern of patterns) {
        if (matchesPattern(filePath, relativePath, pattern)) {
          isIgnored = !pattern.isNegated;
        }
      }
      
      return isIgnored;
    };
  } catch {
    // .gitignore doesn't exist or can't be read, return a function that never ignores
    return (): boolean => false;
  }
};

/**
 * Creates an ignore filter that combines multiple ignore filters
 * @param filters Array of ignore filter functions
 * @returns A combined ignore filter function
 */
export const combineIgnoreFilters = (
  filters: Array<(filePath: string) => boolean>
): ((filePath: string) => boolean) => {
  return (filePath: string): boolean => {
    return filters.some(filter => filter(filePath));
  };
};
````

## File: tests/integration/mem-api-graph-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI Graph Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    // Disable .gitignore for these tests so we can correctly search .log files
    harness = await createTestHarness({ withGitignore: false });
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should query the graph with multiple conditions', async () => {
    const pageAContent = `
- # Page A
  - prop:: value
  - Link to [[Page B]].
    `;
    const pageBContent = `
- # Page B
  - prop:: other
  - No links here.
    `;

    await mem.writeFile('PageA.md', pageAContent);
    await mem.writeFile('PageB.md', pageBContent);

    const query = `(property prop:: value) AND (outgoing-link [[Page B]])`;
    const results = await mem.queryGraph(query);

    expect(results).toHaveLength(1);
    expect(results[0]).toBeDefined();
    expect(results[0]?.filePath).toBe('PageA.md');
  });

  it('should return an empty array for a query with no matches', async () => {
    const pageAContent = `- # Page A\n  - prop:: value`;
    await mem.writeFile('PageA.md', pageAContent);

    const query = `(property prop:: non-existent-value)`;
    const results = await mem.queryGraph(query);

    expect(results).toHaveLength(0);
  });

  it('should get backlinks and outgoing links', async () => {
    // PageA links to PageB and PageC
    await mem.writeFile('PageA.md', 'Links to [[Page B]] and [[Page C]].');
    // PageB links to PageC
    await mem.writeFile('PageB.md', 'Links to [[Page C]].');
    // PageC has no outgoing links
    await mem.writeFile('PageC.md', 'No links.');
    // PageD links to PageA. The filename is `PageA.md`, so the link must match the basename.
    await mem.writeFile('PageD.md', 'Links to [[PageA]].');

    // Test outgoing links
    const outgoingA = await mem.getOutgoingLinks('PageA.md');
    expect(outgoingA).toEqual(expect.arrayContaining(['Page B', 'Page C']));
    expect(outgoingA.length).toBe(2);

    const outgoingC = await mem.getOutgoingLinks('PageC.md');
    expect(outgoingC).toEqual([]);

    // Test backlinks
    const backlinksA = await mem.getBacklinks('PageA.md');
    expect(backlinksA).toEqual(['PageD.md']);

    const backlinksC = await mem.getBacklinks('PageC.md');
    expect(backlinksC).toEqual(
      expect.arrayContaining(['PageA.md', 'PageB.md'])
    );
    expect(backlinksC.length).toBe(2);
  });

  it('should perform a global full-text search', async () => {
    await mem.writeFile('a.txt', 'This file contains a unique-search-term.');
    await mem.writeFile('b.md', 'This file has a common-search-term.');
    await mem.writeFile('c.log', 'This one also has a common-search-term.');
    await mem.writeFile(
      'd.txt',
      'This file has nothing interesting to find.'
    );

    // Search for a unique term
    const uniqueResults = await mem.searchGlobal('unique-search-term');
    expect(uniqueResults).toEqual(['a.txt']);

    // Search for a common term
    const commonResults = await mem.searchGlobal('common-search-term');
    expect(commonResults).toEqual(expect.arrayContaining(['b.md', 'c.log']));
    expect(commonResults.length).toBe(2);

    // Search for a non-existent term
    const noResults = await mem.searchGlobal('non-existent-term');
    expect(noResults).toEqual([]);
  });
});
````

## File: tests/integration/mem-api-state-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI State Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should save and revert to a checkpoint', async () => {
    // 1. Initial state
    await mem.writeFile('a.txt', 'version a');
    await mem.commitChanges('commit a');

    // 2. Make changes and save checkpoint
    await mem.writeFile('b.txt', 'version b');
    const successSave = await mem.saveCheckpoint();
    expect(successSave).toBe(true);
    expect(await mem.fileExists('b.txt')).toBe(false); // Stashing removes the file from the working dir

    // 3. Make more changes
    await mem.writeFile('c.txt', 'version c');
    expect(await mem.fileExists('c.txt')).toBe(true);

    // 4. Revert by applying the stashed changes
    const successRevert = await mem.revertToLastCheckpoint();
    expect(successRevert).toBe(true);

    // 5. Assert state
    expect(await mem.fileExists('a.txt')).toBe(true);
    expect(await mem.fileExists('b.txt')).toBe(true); // Restored from checkpoint
    expect(await mem.fileExists('c.txt')).toBe(true); // Other working dir changes are preserved
  });

  it('should discard all staged and unstaged changes', async () => {
    // 1. Initial state
    await mem.writeFile('a.txt', 'original a');
    await mem.commitChanges('commit a');

    // 2. Make changes
    await mem.writeFile('a.txt', 'modified a'); // unstaged
    await mem.writeFile('b.txt', 'new b'); // unstaged
    await mem.writeFile('c.txt', 'new c'); // will be staged
    await harness.git.add('c.txt');

    // 3. Discard
    const successDiscard = await mem.discardChanges();
    expect(successDiscard).toBe(true);

    // 4. Assert state
    expect(await mem.readFile('a.txt')).toBe('original a'); // Reverted
    expect(await mem.fileExists('b.txt')).toBe(false); // Removed
    expect(await mem.fileExists('c.txt')).toBe(false); // Removed

    const status = await harness.git.status();
    expect(status.isClean()).toBe(true);
  });

  it('should handle reverting when no checkpoint exists', async () => {
    await mem.writeFile('a.txt', 'content');
    const success = await mem.revertToLastCheckpoint();

    // It should not throw an error and return false to indicate nothing was reverted.
    expect(success).toBe(false);
    expect(await mem.readFile('a.txt')).toBe('content'); // File should be untouched
  });
});
````

## File: tests/integration/mem-api-util-ops.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
} from '../lib/test-harness';
import type { MemAPI } from '../../src/types';

describe('MemAPI Util Ops Integration Tests', () => {
  let harness: TestHarnessState;
  let mem: MemAPI;

  beforeEach(async () => {
    harness = await createTestHarness();
    mem = harness.mem;
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should return the correct graph root path', async () => {
    const root = await mem.getGraphRoot();
    expect(root).toBe(harness.tempDir);
  });

  it('should correctly estimate token count for a single file', async () => {
    const content = 'This is a test sentence with several words.'; // 44 chars
    await mem.writeFile('test.txt', content);
    const tokenCount = await mem.getTokenCount('test.txt');
    const expected = Math.ceil(content.length / 4); // 11
    expect(tokenCount).toBe(expected);
  });

  it('should correctly estimate token counts for multiple files', async () => {
    const content1 = 'File one content.'; // 17 chars -> 5 tokens
    const content2 = 'File two has slightly more content here.'; // 38 chars -> 10 tokens
    await mem.writeFile('file1.txt', content1);
    await mem.writeFile('sub/file2.txt', content2);

    const results = await mem.getTokenCountForPaths([
      'file1.txt',
      'sub/file2.txt',
    ]);

    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining([
        { path: 'file1.txt', tokenCount: Math.ceil(content1.length / 4) },
        { path: 'sub/file2.txt', tokenCount: Math.ceil(content2.length / 4) },
      ])
    );
  });

  it('should throw an error when counting tokens for a non-existent file', async () => {
    await expect(mem.getTokenCount('not-real.txt')).rejects.toThrow(
      /Failed to count tokens for not-real.txt/
    );
  });
});
````

## File: .dockerignore
````
# Git
.git
.gitignore

# Node
node_modules

# Local Environment
.env
.env.*
! .env.example

# IDE / OS
.vscode
.idea
.DS_Store

# Logs and temp files
npm-debug.log*
yarn-debug.log*
*.log

# Build output & test artifacts
dist
coverage
jest.config.js

# Docker
Dockerfile
.dockerignore
````

## File: .prettierrc.json
````json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "endOfLine": "lf"
}
````

## File: Dockerfile
````dockerfile
# ---- Base Stage ----
# Use an official Node.js image.
FROM node:20-slim as base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
# Install dependencies. This layer is cached to speed up subsequent builds
# if dependencies haven't changed.
FROM base as deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build Stage ----
# Copy source code and build the application.
FROM base as build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Production Stage ----
# Create a smaller final image.
# We only copy the necessary files to run the application.
FROM node:20-slim as production
WORKDIR /usr/src/app

# Copy production dependencies and built source code
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json
COPY .env.example ./.env.example

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD ["node", "dist/server.js"]
````

## File: eslint.config.js
````javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'scripts/**/*.js', 'tests/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' }
      ],
      'no-console': 'off', // Allow console for build scripts and logging
      'no-unused-vars': 'off', // Let TypeScript handle this
      'no-undef': 'off', // Let TypeScript handle this
    },
  },
];
````

## File: src/core/mem-api/fs-walker.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Asynchronously and recursively walks a directory, yielding the full path of each file.
 * @param dir The directory to walk.
 * @param isIgnored Optional function to determine if a path should be ignored.
 * @returns An async generator that yields file paths.
 */
export async function* walk(
  dir: string,
  isIgnored: (path: string) => boolean = () => false
): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    
    // Skip ignored entries
    if (isIgnored(entry)) {
      continue;
    }
    
    if (d.isDirectory()) {
      yield* walk(entry, isIgnored);
    } else if (d.isFile()) {
      yield entry;
    }
  }
}
````

## File: src/types/loop.ts
````typescript
import type { MemAPI } from './mem.js';
import type { ChatMessage } from './llm.js';

// The execution context passed through the agent loop.
export type ExecutionContext = {
  // The complete conversation history for this session.
  history: ChatMessage[];
  // The API implementation available to the sandbox.
  memAPI: MemAPI;
  // The application configuration.
  config: import('../config').AppConfig;
  // A unique ID for this execution run.
  runId: string;
  // Function to stream content back to the client.
  streamContent: (content: { type: 'text'; text: string }) => Promise<void>;
};
````

## File: src/types/sandbox.ts
````typescript
export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedGlobals?: string[];
  forbiddenGlobals?: string[];
}

export interface SandboxExecutionContext {
  mem: import('./mem.js').MemAPI;
  console: Console;
}

export interface SandboxResult {
  success: boolean;
  result?: unknown;
  error?: string;
  output?: string;
  executionTime: number;
}

export type SandboxCode = string;

export interface ExecutionConstraints {
  maxExecutionTime: number;
  maxMemoryBytes: number;
  allowedModules: string[];
  forbiddenAPIs: string[];
}
````

## File: .env.test
````
# Test Environment Configuration
OPENROUTER_API_KEY="mock-test-api-key"
KNOWLEDGE_GRAPH_PATH="/tmp/recursa-test-knowledge-graph"
LLM_MODEL="mock-test-model"
````

## File: jest.config.js
````javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '(.+)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/tests/setup.ts'],
};
````

## File: src/types/llm.ts
````typescript
export type ParsedLLMResponse = {
  think?: string;
  typescript?: string;
  reply?: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface LLMRequest {
  messages: ChatMessage[];
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  generateCompletion: (request: LLMRequest) => Promise<LLMResponse>;
  streamCompletion?: (request: LLMRequest) => AsyncIterable<string>;
}

export type StreamingCallback = (chunk: string) => void;
````

## File: tests/e2e/mcp-workflow.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
  createMockLLMQueryWithSpy,
} from '../lib/test-harness';
import { handleUserQuery } from '../../src/core/loop';

describe('Agent Workflow E2E Tests (In-Process)', () => {
  let harness: TestHarnessState;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should execute a simple file creation and commit query', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Okay, creating the file.</think>
         <typescript>await mem.writeFile('hello.txt', 'world');</typescript>`,
      `<think>Committing the file.</think>
         <typescript>await mem.commitChanges('feat: create hello.txt');</typescript>
         <reply>File created and committed.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'create file',
      harness.mockConfig,
      'simple-query-session',
      mockQueryLLM
    );

    // 3. Assert
    expect(finalReply).toBe('File created and committed.');

    // Verify side-effects
    expect(await harness.mem.fileExists('hello.txt')).toBe(true);
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: create hello.txt');
  });

  it('should correctly handle the Dr. Aris Thorne example', async () => {
    // 1. Arrange
    const turn1Response = `<think>Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.</think>
<typescript>
const orgPath = 'AI Research Institute.md';
if (!await mem.fileExists(orgPath)) {
  await mem.writeFile(orgPath, \`- # AI Research Institute
  - type:: organization\`);
}
await mem.writeFile('Dr. Aris Thorne.md', \`- # Dr. Aris Thorne
  - type:: person
  - affiliation:: [[AI Research Institute]]
  - field:: [[Symbolic Reasoning]]\`);
</typescript>`;
    const turn2Response = `<think>Okay, I'm saving those changes to your permanent knowledge base.</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.</reply>`;

    const mockQueryLLM = createMockLLMQueryWithSpy([
      turn1Response,
      turn2Response,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'Create Dr. Aris Thorne',
      harness.mockConfig,
      'thorne-session',
      mockQueryLLM
    );

    // 3. Assert
    expect(finalReply).toBe(
      "Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them."
    );

    const thorneContent = await harness.mem.readFile('Dr. Aris Thorne.md');
    expect(thorneContent).toContain('affiliation:: [[AI Research Institute]]');

    expect(await harness.mem.fileExists('AI Research Institute.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe(
      'feat: Add Dr. Aris Thorne and AI Research Institute entities'
    );
  });

  it('should save a checkpoint and successfully revert to it', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Writing file 1.</think>
         <typescript>await mem.writeFile('file1.md', 'content1');</typescript>`,
      `<think>Saving checkpoint.</think>
         <typescript>await mem.saveCheckpoint();</typescript>`,
      `<think>Writing file 2.</think>
         <typescript>await mem.writeFile('file2.md', 'content2');</typescript>`,
      `<think>Reverting to checkpoint.</think>
         <typescript>await mem.revertToLastCheckpoint();</typescript>`,
      `<think>Committing.</think>
         <typescript>await mem.commitChanges('feat: add file1 and file2');</typescript>
         <reply>Reverted and committed.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'test checkpoints',
      harness.mockConfig,
      'checkpoint-session',
      mockQueryLLM
    );

    // 3. Assert
    expect(finalReply).toBe('Reverted and committed.');

    // After `saveCheckpoint`, `file1.md` is stashed.
    // After `writeFile('file2.md')`, `file2.md` is in the working directory.
    // After `revertToLastCheckpoint` (`git stash pop`), stashed changes (`file1.md`) are
    // applied, merging with working directory changes (`file2.md`).
    expect(await harness.mem.fileExists('file1.md')).toBe(true);
    expect(await harness.mem.fileExists('file2.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: add file1 and file2');

    expect(log.latest).not.toBeNull();

    // Verify both files were part of the commit
    const commitContent = await harness.git.show([
      '--name-only',
      log.latest!.hash,
    ]);
    expect(commitContent).toContain('file1.md');
    expect(commitContent).toContain('file2.md');
  });

  it('should block and gracefully handle path traversal attempts', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>I will try to read a sensitive file.</think>
         <typescript>await mem.readFile('../../../../etc/hosts');</typescript>`,
      `<think>The previous action failed as expected due to security. I will inform the user.</think>
         <reply>I was unable to access that file due to security restrictions.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'read sensitive file',
      harness.mockConfig,
      'security-session',
      mockQueryLLM
    );

    // 3. Assert
    // The loop catches the security error, feeds it back to the LLM,
    // and the LLM then generates the final reply.
    expect(finalReply).toBe(
      'I was unable to access that file due to security restrictions.'
    );

    // Verify the agent was given a chance to recover.
    expect(mockQueryLLM).toHaveBeenCalledTimes(2);
  });
});
````

## File: tests/lib/test-util.ts
````typescript
// This file can be used for shared test utilities.
// Currently, it has no content as previous imports were unused.
````

## File: tests/unit/parser.test.ts
````typescript
import { describe, it, expect } from '@jest/globals';
import { parseLLMResponse } from '../../src/core/parser';

describe('LLM Response Parser', () => {
  it('should parse a full, valid response', () => {
    const xml = `<think>Thinking about stuff.</think><typescript>console.log("hello");</typescript><reply>All done!</reply>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'Thinking about stuff.',
      typescript: 'console.log("hello");',
      reply: 'All done!',
    });
  });

  it('should parse a partial response (think/act)', () => {
    const xml = `<think>Let me write a file.</think><typescript>await mem.writeFile('a.txt', 'hi');</typescript>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'Let me write a file.',
      typescript: "await mem.writeFile('a.txt', 'hi');",
      reply: undefined,
    });
  });

  it('should handle extra whitespace and newlines', () => {
    const xml = `
      <think>
        I need to think about this...
        With newlines.
      </think>
      <typescript>
        const x = 1;
      </typescript>
    `;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: `I need to think about this...\n        With newlines.`,
      typescript: 'const x = 1;',
      reply: undefined,
    });
  });

  it('should return an object with undefined for missing tags', () => {
    const xml = `<reply>Just a reply.</reply>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: undefined,
      typescript: undefined,
      reply: 'Just a reply.',
    });
  });

  it('should handle an empty string', () => {
    const xml = '';
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: undefined,
      typescript: undefined,
      reply: undefined,
    });
  });

  it('should handle tags in a different order', () => {
    const xml = `<reply>Final answer.</reply><think>One last thought.</think>`;
    const result = parseLLMResponse(xml);
    expect(result).toEqual({
      think: 'One last thought.',
      typescript: undefined,
      reply: 'Final answer.',
    });
  });
});
````

## File: .gitignore
````
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Misc
.DS_Store
*.pem

# Debugging
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDEs
.idea
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.sublime-workspace

# Relay
.relay/

# Worktrees (from original)
worktrees/*/node_modules/
worktrees/*/.git/
````

## File: relay.config.json
````json
{
  "$schema": "https://relay.noca.pro/schema.json",
  "projectId": "doc",
  "core": {
    "logLevel": "info",
    "enableNotifications": false,
    "watchConfig": false
  },
  "watcher": {
    "clipboardPollInterval": 2000,
    "preferredStrategy": "auto",
    "enableBulkProcessing": false,
    "bulkSize": 5,
    "bulkTimeout": 30000
  },
  "patch": {
    "approvalMode": "manual",
    "approvalOnErrorCount": 0,
    "linter": "",
    "preCommand": "",
    "postCommand": "",
    "minFileChanges": 0
  },
  "git": {
    "autoGitBranch": false,
    "gitBranchPrefix": "relay/",
    "gitBranchTemplate": "gitCommitMsg"
  }
}
````

## File: tsconfig.tsbuildinfo
````
{"root":["./src/config.ts","./src/server.ts","./src/api/mcp.handler.ts","./src/core/llm.ts","./src/core/loop.ts","./src/core/parser.ts","./src/core/sandbox.ts","./src/core/mem-api/file-ops.ts","./src/core/mem-api/fs-walker.ts","./src/core/mem-api/git-ops.ts","./src/core/mem-api/graph-ops.ts","./src/core/mem-api/index.ts","./src/core/mem-api/secure-path.ts","./src/core/mem-api/state-ops.ts","./src/core/mem-api/util-ops.ts","./src/lib/events.ts","./src/lib/gitignore-parser.ts","./src/lib/logger.ts","./src/types/git.ts","./src/types/index.ts","./src/types/llm.ts","./src/types/loop.ts","./src/types/mcp.ts","./src/types/mem.ts","./src/types/sandbox.ts"],"version":"5.9.3"}
````

## File: docs/readme.md
````markdown
# Recursa: The Git-Native Memory Layer for Local-First LLMs

**[Project Status: Active Development] [View System Prompt] [Report an Issue]**

**TL;DR:** Recursa gives your AI a perfect, auditable memory that lives and grows in your local filesystem. It's an open-source MCP server that uses your **Logseq/Obsidian graph** as a dynamic, version-controlled knowledge base. Your AI's brain becomes a plaintext repository you can `grep`, `edit`, and `commit`.

Forget wrestling with databases or opaquWe cloud APIs. This is infrastructure-free, plaintext-first memory for agents that _create_.

---

## The Problem: Agent Amnesia & The RAG Ceiling

You're building an intelligent agent and have hit the memory wall. The industry's current solutions are fundamentally flawed, leading to agents that can't truly learn or evolve:

1.  **Vector DBs (RAG):** A read-only librarian. It's excellent for retrieving existing facts but is structurally incapable of _creating new knowledge_, _forming novel connections_, or _evolving its understanding_ based on new interactions. It hits the "RAG ceiling," where agents can only answer, not synthesize.
2.  **Opaque Self-Hosted Engines:** You're lured by "open source" but are now a part-time DevOps engineer, managing Docker containers, configuring databases, and debugging opaque states instead of focusing on your agent's core intelligence.
3.  **Black-Box APIs:** You trade infrastructure pain for a vendor's prison. Your AI's memory is locked away, inaccessible to your tools, and impossible to truly audit or understand.

Recursa is built on a different philosophy: **Your AI's memory should be a dynamic, transparent, and versionable extension of its own thought process, running entirely on your machine.**

## The Recursa Philosophy: Core Features

Recursa isn't a database; it's a reasoning engine. It treats a local directory of plaintext files—ideally a Git repository—as the agent's primary memory.

- **Git-Native Memory:** Every change, every new idea, every retracted thought is a `git commit`. You get a perfect, auditable history of your agent's learning process. You can branch its memory, merge concepts, and revert to previous states.
- **Plaintext Supremacy:** The AI's brain is a folder of markdown files. It's human-readable, universally compatible with tools like Obsidian and Logseq, and free from vendor lock-in.
- **Think-Act-Commit Loop:** The agent reasons internally, generates code to modify its memory, executes it in a sandbox, and commits the result with a descriptive message. This is a transparent, auditable cognitive cycle.
- **Safety Checkpoints:** For complex, multi-turn operations (like a large-scale refactor), the agent can use `mem.saveCheckpoint()` to save its progress. If it makes a mistake, it can instantly roll back with `mem.revertToLastCheckpoint()`, providing a safety net for ambitious tasks.
- **Token-Aware Context:** With tools like `mem.getTokenCount()`, the agent can intelligently manage its own context window, ensuring it can read and reason about large files without exceeding API limits.

## How It Works: Architecture

Recursa is a local, stateless server that acts as a bridge between your chat client, an LLM, and your local knowledge graph.

```mermaid
graph TD
    subgraph Your Local Machine
        A[MCP Client <br> e.g., your script, or a compatible editor]
        B[Recursa MCP Server <br> (This Project)]
        C(Logseq/Obsidian Graph <br> /path/to/your/notes/)

        A -- 1. User Query via Stdio --> B
        B -- 2. Think-Act-Commit Loop --> D{LLM API <br> (OpenRouter)}
        B -- 3. Executes Sandboxed Code --> C
        C -- 4. Reads/Writes .md files --> C
        B -- 5. Final Reply & Notifications --> A
    end

    subgraph Cloud Service
        D
    end

    style C fill:#e6f3ff,stroke:#333,stroke-width:2px
    style B fill:#fff2cc,stroke:#333,stroke-width:2px
```

1.  **Query via MCP:** Your client application sends a message to the local Recursa server process over standard I/O.
2.  **Think-Act Loop:** Recursa begins its reasoning cycle. It sends the query and relevant file contents to your chosen LLM, sending real-time status updates back to the client.
3.  **Generate & Execute Code:** The LLM responds not with a simple answer, but with a **TypeScript snippet** and a user-facing status update. Recursa executes this code in a secure sandbox.
4.  **Interact with Files:** The sandboxed code uses a safe `mem` API to read, create, and modify markdown files directly in your knowledge graph.
5.  **Commit & Reply:** Once the task is complete, the agent commits its changes with a meaningful message and generates a final reply for the user.

## An Agent in Action: Example Workflow

**Scenario:** An agent is asked to learn about a new person.

**1. User Query:**
"I just had a call with a Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning. Create a new entry for him and link it to his affiliation."

**2. Turn 1: The agent communicates its intent and acts efficiently.**
The LLM receives the query, formulates an efficient plan, and generates a simple status message for the user alongside the code to execute its plan.

**LLM Response (Turn 1):**

```xml
<think>
Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.
</think>
<typescript>
// Perform all logic in one block for maximum efficiency.
const orgPath = 'AI Research Institute.md';
const orgExists = await mem.fileExists(orgPath);

if (!orgExists) {
  await mem.writeFile(
    orgPath,
    `- # AI Research Institute\n  - type:: organization\n`
  );
}

await mem.writeFile(
  'Dr. Aris Thorne.md',
  `- # Dr. Aris Thorne\n  - type:: person\n  - affiliation:: [[AI Research Institute]]\n  - field:: [[Symbolic Reasoning]]`
);
</typescript>
```

_Recursa executes the code and confirms success to the LLM._

**3. Turn 2: The agent saves its work and replies to the user.**
Seeing the action was successful, the LLM generates its final response to commit the changes and inform the user that the task is complete.

**LLM Response (Turn 2):**

```xml
<think>
Okay, I'm saving those changes to your permanent knowledge base.
</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A local [Logseq](https://logseq.com/) or [Obsidian](https://obsidian.md/) graph (a folder of `.md` files)
- An [OpenRouter.ai](https://openrouter.ai/) API Key

### 1. Installation

```bash
git clone https://github.com/your-username/recursa.git
cd recursa
npm install
```

### 2. Configuration

Create a `.env` file in the root of the project by copying the example:

```bash
cp .env.example .env
```

Now, edit your `.env` file with your details:

```env
# Your OpenRouter API Key
OPENROUTER_API_KEY="sk-or-..."

# The ABSOLUTE path to your graph's directory (e.g., the "pages" folder for Logseq)
KNOWLEDGE_GRAPH_PATH="/path/to/your/notes"

# The model you want to use from OpenRouter
LLM_MODEL="anthropic/claude-3-sonnet-20240229"
```

### 3. Running the Server

```bash
bun run start
```

This starts the Recursa server as a process that listens for MCP messages on its standard input/output. You can now connect any MCP-compatible client to it.

## 🗺️ Roadmap

Recursa is in active development. Our goal is to build the most transparent, powerful, and developer-friendly memory layer for AI agents.

- [ ] **Enhanced Graph Queries:** Adding more powerful filtering and traversal operators to `mem.queryGraph`.
- [ ] **Visualizer:** A simple web UI to visualize the agent's actions and the knowledge graph's evolution over time (`git log` visualized).
- [ ] **Multi-modal Support:** Allowing the agent to store and reference images and other file types within the graph.
- [ ] **Agent-to-Agent Collaboration:** Enabling two Recursa agents to collaborate on a single knowledge graph via Git (forks, pull requests).
- [ ] **Expanded Tooling:** Integrating web search, terminal access, and other essential agent capabilities into the `mem` object.

## 🧑‍💻 Contributing

Recursa is designed to be hacked on. Contributions are welcome!

### Adding New Tools

To add a new tool (e.g., `mem.searchWeb(query)`):

1.  Implement the function's logic in a file within `src/core/mem-api/`.
2.  Expose the new function in the `createMemAPI` factory in `src/core/mem-api/index.ts`.
3.  Add the function signature to the `MemAPI` type in `src/types/mem.ts`.
4.  Update `tools.md` and `system-prompt.md` to document the new tool and provide examples of how the LLM should use it.
5.  Open a Pull Request!

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

**Stop building infrastructure. Start building intelligence.**
````

## File: docs/rules.md
````markdown
codebase compliance rules;

1. No OOP, only HOFs
2. Use Node.js and e2e type safe TypeScript
3. No unknown or any type
4. [e2e|integration|unit]/[domain].test.ts files & dirs
5. Jest tests, isolated tests with minimal mocking. External network services (e.g., LLM APIs) should be mocked to ensure tests are fast, deterministic, and independent of network or API key issues.
6. DRY
````

## File: docs/system-prompt.md
````markdown
# Recursa Agent System Prompt

You are Recursa, a Git-Native AI agent. Your mind is a local knowledge graph, your actions are TypeScript code, and your memory is a `git` history. You do not simply answer questions; you reason, modify the graph, and commit your work.

Your entire existence is defined by the **Think-Act-Commit** loop.

---

## 1. CRITICAL: Response Format

Every response you generate MUST conform to the following XML-like structure. Failure to adhere to this format will break the execution loop.

### Core Tags

- `<think>`: **A user-facing status update.** A short, non-technical sentence describing the action you are about to take. This is shown to the user in real-time. **This tag is mandatory in every turn.**
- `<typescript>`: A TypeScript code snippet to be executed in the secure sandbox. This is where your technical plan is implemented.
- `<reply>`: The final, user-facing summary of the completed work. **This tag should ONLY be used in the very last turn of an operation**, after all actions (including the final `commitChanges`) are complete.

### A CRITICAL Syntax Rule: Multiline Strings

**For multiline strings in `<typescript>`, you MUST use template literals (`` ` ``) or explicit `\n` characters.** Raw newlines within single or double-quoted strings are forbidden and will cause a syntax error.

**Correct:**

```typescript
await mem.writeFile(
  'example.md',
  `
# This is a title
This is a multiline document.
`
);
```

**INCORRECT AND FORBIDDEN:**

```typescript
// This will fail!
await mem.writeFile('example.md', '
# This is a title
This is a multiline document.
');
```

### Response Patterns

**Pattern A: Action Turn (Think & Act)**

```xml
<think>
[A simple, user-friendly message about what you're doing next.]
</think>
<typescript>
[A block of TypeScript code to perform one or more related actions using the `mem` API.]
</typescript>
```

**Pattern B: Final Turn (Commit & Reply)**

```xml
<think>
[A simple, user-friendly message about saving the work.]
</think>
<typescript>
await mem.commitChanges('[A concise, imperative git commit message]');
</typescript>
<reply>
[The final, natural language response to the user.]
</reply>
```

---

## 2. CRITICAL: Output Syntax - Logseq Block Formatting

All content you write to files **MUST** conform to Logseq/Org-mode block-based syntax. This is not optional. Every piece of information must be a nested item, not just free-form markdown.

### Core Rules

1.  **Everything is a Block:** Every line of content must start with a dash (`- `).
2.  **Nesting is Key:** Use two spaces (`  `) to indent and create nested blocks.
3.  **Properties are Nested:** `key:: value` pairs must be nested under the block they describe.

**Correct:**

```typescript
await mem.writeFile(
  'Dr. Aris Thorne.md',
  `
- # Dr. Aris Thorne
  - type:: person
  - affiliation:: [[AI Research Institute]]
`
);
```

**INCORRECT AND FORBIDDEN:**

```typescript
// This is flat markdown and will be rejected.
await mem.writeFile(
  'Dr. Aris Thorne.md',
  '# Dr. Aris Thorne\ntype:: person\naffiliation:: [[AI Research Institute]]'
);
```

---

## 3. A Critical Principle: Maximum Efficiency

Your performance is measured by how few turns you take to complete a task. Each turn is an expensive LLM call. Therefore, you **MUST** design your `<typescript>` actions to do as much work as possible in a single step. Your goal is to solve the request in the fewest turns possible.

- **DO:** Check for a file, create it if it's missing, and then write a second related file all in one `<typescript>` block.
- **DO NOT:** Use one turn to check if a file exists, a second turn to create it, and a third turn to create another. This is slow, expensive, and incorrect.

---

## 4. The `mem` API: Your Sandboxed Toolkit

You have access to a global `mem` object with asynchronous methods. **ALL `mem` calls MUST be `await`ed.** For the complete API reference, read `tools.md`.

**Key Tool Categories:**

- **Core File I/O:** `mem.readFile`, `mem.writeFile`, `mem.updateFile`, `mem.fileExists`, `mem.listFiles`.
- **Git-Native Operations:** `mem.commitChanges`, `mem.gitLog`, `mem.gitDiff`.
- **Intelligent Graph Operations:** `mem.queryGraph`, `mem.getBacklinks`, `mem.getOutgoingLinks`.

---

## 5. The Core Workflow: Think-Act-Commit

Your operational cycle must follow this logical progression.

1.  **Internal Thought Process (No Output):** Understand the request, investigate the graph using `mem` tools, and formulate an efficient, multi-step plan to be executed in a single `<typescript>` block.

2.  **Communicate & Act (Generate Output):**
    - Write a user-facing `<think>` tag that simplifies your plan into a single, clear sentence.
    - Write the `<typescript>` code to execute your complete plan.

3.  **Commit & Reply (Final Turn):**
    - Once the work is done, write a `<think>` message about saving the changes.
    - Write the `<typescript>` code to call `mem.commitChanges()`.
    - Write the final `<reply>` to the user.

---

## 6. Example of an Efficient Turn

**User:** "Add Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning."

**Turn 1: Agent communicates its intent and acts efficiently.**

```xml
<think>
Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.
</think>
<typescript>
// Perform all logic in one block for maximum efficiency.
const orgPath = 'AI Research Institute.md';
const orgExists = await mem.fileExists(orgPath);

if (!orgExists) {
  await mem.writeFile(
    orgPath,
    `- # AI Research Institute\n  - type:: organization\n`
  );
}

await mem.writeFile(
  'Dr. Aris Thorne.md',
  `- # Dr. Aris Thorne\n  - type:: person\n  - affiliation:: [[AI Research Institute]]\n  - field:: [[Symbolic Reasoning]]`
);
</typescript>
```

**Turn 2: Agent communicates saving and provides the final reply.**

```xml
<think>
Okay, I'm saving those changes to your permanent knowledge base.
</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>
```
````

## File: docs/tools.md
````markdown
# TOOLS.md: Recursa Sandboxed API (`mem` Object)

The Large Language Model is granted access to the `mem` object, which contains a suite of asynchronous methods for interacting with the local knowledge graph and the underlying Git repository.

**All methods are asynchronous (`Promise<T>`) and MUST be called using `await`.**

## Category 1: Core File & Directory Operations

These are the fundamental building blocks for manipulating the Logseq/Obsidian graph structure.

| Method               | Signature                                                                      | Returns             | Description                                                                                                                                                                                                                                                                                                                              |
| :------------------- | :----------------------------------------------------------------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.readFile`**   | `(filePath: string): Promise<string>`                                          | `Promise<string>`   | Reads and returns the full content of the specified file.                                                                                                                                                                                                                                                                                |
| **`mem.writeFile`**  | `(filePath: string, content: string): Promise<boolean>`                        | `Promise<boolean>`  | Creates a new file at the specified path with the given content. Automatically creates any necessary parent directories.                                                                                                                                                                                                                 |
| **`mem.updateFile`** | `(filePath: string, oldContent: string, newContent: string): Promise<boolean>` | `Promise<boolean>`  | **Performs an atomic Compare-and-Swap.** Replaces the entire file content with `newContent` ONLY IF the current content exactly matches `oldContent`. This prevents race conditions and overwriting other changes. **Usage:** Read a file, transform its content in your code, then call `updateFile` with the original and new content. |
| **`mem.deletePath`** | `(filePath: string): Promise<boolean>`                                         | `Promise<boolean>`  | Deletes the specified file or directory recursively.                                                                                                                                                                                                                                                                                     |
| **`mem.rename`**     | `(oldPath: string, newPath: string): Promise<boolean>`                         | `Promise<boolean>`  | Renames or moves a file or directory. Used for refactoring.                                                                                                                                                                                                                                                                              |
| **`mem.fileExists`** | `(filePath: string): Promise<boolean>`                                         | `Promise<boolean>`  | Checks if a file exists.                                                                                                                                                                                                                                                                                                                 |
| **`mem.createDir`**  | `(directoryPath: string): Promise<boolean>`                                    | `Promise<boolean>`  | Creates a new directory, including any necessary nested directories.                                                                                                                                                                                                                                                                     |
| **`mem.listFiles`**  | `(directoryPath?: string): Promise<string[]>`                                  | `Promise<string[]>` | Lists all files and directories (non-recursive) within a path, or the root if none is provided.                                                                                                                                                                                                                                          |

---

## Category 2: Git-Native Operations (Auditing & Versioning)

These tools leverage the Git repository tracking the knowledge graph, allowing the agent to audit its own memory and understand historical context.

| Method                    | Signature                                                                                              | Returns               | Description                                                                                                                                               |
| :------------------------ | :----------------------------------------------------------------------------------------------------- | :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.gitDiff`**         | `(filePath: string, fromCommit?: string, toCommit?: string): Promise<string>`                          | `Promise<string>`     | Gets the `git diff` output for a specific file between two commits (or HEAD/WORKTREE if not specified). **Crucial for understanding how a page evolved.** |
| **`mem.gitLog`**          | `(filePath: string, maxCommits: number = 5): Promise<{hash: string, message: string, date: string}[]>` | `Promise<LogEntry[]>` | Returns the commit history for a file or the entire repo. Used to understand **when** and **why** a file was last changed.                                |
| **`mem.getChangedFiles`** | `(): Promise<string[]>`                                                                                | `Promise<string[]>`   | Lists all files that have been created, modified, staged, or deleted in the working tree. Provides a complete view of pending changes.                    |
| **`mem.commitChanges`**   | `(message: string): Promise<string>`                                                                   | `Promise<string>`     | **Performs the final `git commit`**. The agent must generate a concise, human-readable commit message summarizing its actions. Returns the commit hash.   |

---

## Category 3: Intelligent Graph & Semantic Operations

These tools allow the agent to reason about the relationships and structure inherent in Logseq/Org Mode syntax, moving beyond simple file I/O.

| Method                     | Signature                                                           | Returns                  | Description                                                                                                                                                                                                                                               |
| :------------------------- | :------------------------------------------------------------------ | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.queryGraph`**       | `(query: string): Promise<{filePath: string, matches: string[]}[]>` | `Promise<QueryResult[]>` | **Executes a powerful graph query.** Can find pages by property (`key:: value`), links (`[[Page]]`), or block content. Used for complex retrieval. _Example: `(property affiliation:: AI Research Institute) AND (outgoing-link [[Symbolic Reasoning]])`_ |
| **`mem.getBacklinks`**     | `(filePath: string): Promise<string[]>`                             | `Promise<string[]>`      | Finds all other files that contain a link **to** the specified file. Essential for understanding context and usage.                                                                                                                                       |
| **`mem.getOutgoingLinks`** | `(filePath: string): Promise<string[]>`                             | `Promise<string[]>`      | Extracts all unique wikilinks (`[[Page Name]]`) that the specified file links **to**.                                                                                                                                                                     |
| **`mem.searchGlobal`**     | `(query: string): Promise<string[]>`                                | `Promise<string[]>`      | Performs a simple, full-text search across the entire graph. Returns a list of file paths that contain the match.                                                                                                                                         |

---

## Category 4: State Management & Checkpoints

Tools for managing the working state during complex, multi-turn operations, providing a safety net against errors.

| Method                           | Signature              | Returns            | Description                                                                                                                             |
| :------------------------------- | :--------------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.saveCheckpoint`**         | `(): Promise<boolean>` | `Promise<boolean>` | **Saves the current state.** Stages all working changes (`git add .`) and creates a temporary stash. Use this before a risky operation. |
| **`mem.revertToLastCheckpoint`** | `(): Promise<boolean>` | `Promise<boolean>` | **Reverts to the last saved state.** Restores the files to how they were when `saveCheckpoint` was last called.                         |
| **`mem.discardChanges`**         | `(): Promise<boolean>` | `Promise<boolean>` | **Performs a hard reset.** Abandons all current work (staged and unstaged changes) and reverts the repository to the last commit.       |

---

## Category 5: Utility & Diagnostics

General-purpose operations for the sandbox environment.

| Method                          | Signature                                                          | Returns                     | Description                                                                                           |
| :------------------------------ | :----------------------------------------------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------- |
| **`mem.getGraphRoot`**          | `(): Promise<string>`                                              | `Promise<string>`           | Returns the absolute path of the root directory of the knowledge graph.                               |
| **`mem.getTokenCount`**         | `(filePath: string): Promise<number>`                              | `Promise<number>`           | Calculates and returns the estimated token count for a single file. Useful for managing context size. |
| **`mem.getTokenCountForPaths`** | `(paths: string[]): Promise<{path: string, tokenCount: number}[]>` | `Promise<PathTokenCount[]>` | A more efficient way to get token counts for multiple files in a single call.                         |
````

## File: src/types/git.ts
````typescript
export interface GitOptions {
  baseDir?: string;
}

// Structure for a single Git log entry.
export type LogEntry = {
  hash: string;
  message: string;
  date: string;
};

export interface GitDiffResult {
  additions: number;
  deletions: number;
  patch: string;
}

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export type GitCommand =
  | 'init'
  | 'add'
  | 'commit'
  | 'status'
  | 'log'
  | 'diff'
  | 'branch';
````

## File: src/core/mem-api/secure-path.ts
````typescript
import path from 'path';
import fs from 'fs';
import platform from '../../lib/platform.js';

/**
 * Cross-platform path traversal protection utilities
 * The LLM should never be able to access files outside the knowledge graph.
 */

/**
 * Enhanced path resolution with canonicalization for cross-platform security
 * @param graphRoot The absolute path to the root of the knowledge graph.
 * @param userPath The user-provided sub-path.
 * @returns The resolved, secure absolute path.
 * @throws If a path traversal attempt is detected.
 */
export const resolveSecurePath = (
  graphRoot: string,
  userPath: string
): string => {
  // Normalize and resolve paths using platform-aware normalization
  const normalizedRoot = platform.normalizePath(path.resolve(graphRoot));
  const normalizedUserPath = platform.normalizePath(path.resolve(normalizedRoot, userPath));

  // Get canonical paths to handle symlinks and case-insensitive filesystems
  const canonicalRoot = getCanonicalPath(normalizedRoot);
  const canonicalTarget = getCanonicalPath(normalizedUserPath);

  // Security check with case-insensitive comparison when needed
  const isSecure = platform.hasCaseInsensitiveFS
    ? canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())
    : canonicalTarget.startsWith(canonicalRoot);

  if (!isSecure) {
    throw new SecurityError(`Path traversal attempt detected. User path: ${userPath}, resolved to: ${canonicalTarget}`);
  }

  return canonicalTarget;
};

/**
 * Get canonical path by resolving symlinks and normalizing
 * @param filePath The path to canonicalize
 * @returns The canonical absolute path
 */
export const getCanonicalPath = (filePath: string): string => {
  try {
    // Use realpath to resolve all symlinks and normalize
    const canonical = fs.realpathSync(filePath);
    return platform.normalizePath(canonical);
  } catch {
    // If path doesn't exist, return normalized path
    return platform.normalizePath(path.resolve(filePath));
  }
};

/**
 * Validate that a path is within allowed bounds
 * @param allowedRoot The root directory that's allowed
 * @param testPath The path to test
 * @param options Additional validation options
 * @returns True if path is valid and within bounds
 */
export const validatePathBounds = (
  allowedRoot: string,
  testPath: string,
  options: {
    allowSymlinks?: boolean;
    requireExistence?: boolean;
    followSymlinks?: boolean;
  } = {}
): boolean => {
  const {
    allowSymlinks = false,
    requireExistence = false,
    followSymlinks = true
  } = options;

  try {
    const canonicalRoot = getCanonicalPath(allowedRoot);
    let canonicalTarget: string;
    
    // Handle non-existent paths specially
    try {
      canonicalTarget = getCanonicalPath(testPath);
    } catch {
      // Path doesn't exist, use normalized path instead
      canonicalTarget = platform.normalizePath(path.resolve(testPath));
    }

    // If we shouldn't follow symlinks, check if the target itself is a symlink
    if (!followSymlinks) {
      try {
        if (fs.lstatSync(testPath).isSymbolicLink()) {
          if (!allowSymlinks) {
            return false;
          }
          // Use lstat to get the symlink itself, not its target
          canonicalTarget = platform.normalizePath(path.resolve(testPath));
        }
      } catch {
        // File doesn't exist, which is fine for write operations
        // The canonicalTarget from resolveSecurePath is still valid
      }
    }

    // Check if the target path exists (if required)
    if (requireExistence && !fs.existsSync(canonicalTarget)) {
      return false;
    }

    // Final security check
    const isSecure = platform.hasCaseInsensitiveFS
      ? canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())
      : canonicalTarget.startsWith(canonicalRoot);

    return isSecure;
  } catch {
    return false;
  }
};

/**
 * Sanitize a user-provided path to remove dangerous components
 * @param userPath The user-provided path
 * @returns A sanitized path string
 */
export const sanitizePath = (userPath: string): string => {
  // Remove null bytes and other dangerous characters
  let sanitized = userPath.replace(/\0/g, '');

  // Handle Windows-specific path patterns
  if (platform.isWindows) {
    // Remove drive letter switching attempts
    sanitized = sanitized.replace(/^[a-zA-Z]:[\\/]/, '');
    // Remove UNC path attempts
    sanitized = sanitized.replace(/^\\\\[\\?]/, '');
    // Remove device namespace access attempts
    sanitized = sanitized.replace(/^\\\\\.\\[a-zA-Z]/, '');
  }

  // Remove excessive path separators
  const separator = platform.pathSeparator;
  const doubleSeparator = separator + separator;
  while (sanitized.includes(doubleSeparator)) {
    sanitized = sanitized.replace(doubleSeparator, separator);
  }

  // Normalize relative path components
  const parts = sanitized.split(separator);
  const filteredParts: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      // Don't allow going above the current directory in user input
      continue;
    }
    if (part === '.' || part === '') {
      continue;
    }
    filteredParts.push(part);
  }

  return filteredParts.join(separator);
};

/**
 * Security error class for path traversal attempts
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecurityError);
    }
  }
}

/**
 * Cross-platform path validation utilities
 */
export const pathValidation = {
  /**
   * Check if a path contains potentially dangerous patterns
   */
  isDangerousPath(userPath: string): boolean {
    // Check for common traversal patterns
    const dangerousPatterns = [
      /\.\.[/\\]/,    // ../ or ..\
      /[/\\]\.\./,    // /.. or \..
      /\0/,          // null byte injection
      /[/\\]\0/,      // null byte with separator
    ];

    // Windows-specific dangerous patterns
    if (platform.isWindows) {
      dangerousPatterns.push(
        /^[a-zA-Z]:[/\\].*[/\\][a-zA-Z]:[/\\]/, // drive letter switching
        /^\\\\/,                                 // UNC paths
        /\\\\\.\\[a-zA-Z]/,                      // device namespace
        /[/\\]CON$|[/\\]PRN$|[/\\]AUX$|[/\\]COM\d$|[/\\]LPT\d$/i // reserved names
      );
    }

    return dangerousPatterns.some(pattern => pattern.test(userPath));
  },

  /**
   * Validate and sanitize a user path in one step
   */
  validateAndSanitizePath(graphRoot: string, userPath: string): string {
    if (this.isDangerousPath(userPath)) {
      throw new SecurityError(`Dangerous path pattern detected: ${userPath}`);
    }

    const sanitizedPath = sanitizePath(userPath);
    return resolveSecurePath(graphRoot, sanitizedPath);
  }
};

export default {
  resolveSecurePath,
  getCanonicalPath,
  validatePathBounds,
  sanitizePath,
  SecurityError,
  pathValidation
};
````

## File: src/core/parser.ts
````typescript
import type { ParsedLLMResponse } from '../types';

/**
 * Parses the LLM's XML-like response string into a structured object.
 * This function uses a simple regex-based approach for robustness against
 * potentially malformed, non-XML-compliant output from the LLM, which is
 * often more reliable than a strict XML parser.
 *
 * @param response The raw string response from the LLM.
 * @returns A ParsedLLMResponse object with optional `think`, `typescript`, and `reply` fields.
 */
export const parseLLMResponse = (response: string): ParsedLLMResponse => {
  const extractTagContent = (tagName: string): string | undefined => {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = response.match(regex);
    // If a match is found, return the captured group (the content), trimmed.
    return match && match[1] ? match[1].trim() : undefined;
  };

  return {
    think: extractTagContent('think'),
    typescript: extractTagContent('typescript'),
    reply: extractTagContent('reply'),
  };
};
````

## File: src/lib/logger.ts
````typescript
import 'dotenv/config';

// Cheatsheet for implementation:
// 1. Define log levels using a numeric enum for easy comparison.
// 2. Create a logger that can be configured with a minimum log level (from env).
// 3. The logger should support adding structured context.
// 4. Implement a `child` method to create a new logger instance with pre-filled context.
//    This is useful for adding request or session IDs to all logs within that scope.
// 5. The actual logging should be done to console.log as a JSON string.

export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
};

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

const MIN_LOG_LEVEL: LogLevel =
  LOG_LEVEL_MAP[process.env.LOG_LEVEL?.toLowerCase() ?? 'info'] ??
  LogLevel.INFO;

type LogContext = Record<string, unknown>;

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error, context?: LogContext) => void;
  child: (childContext: LogContext) => Logger;
};

const createLoggerInternal = (baseContext: LogContext = {}): Logger => {
  const log = (level: LogLevel, message: string, context: LogContext = {}) => {
    if (level < MIN_LOG_LEVEL) {
      return;
    }
    const finalContext = { ...baseContext, ...context };
    const logEntry = {
      level: LOG_LEVEL_NAMES[level],
      timestamp: new Date().toISOString(),
      message,
      ...finalContext,
    };
     
    console.log(JSON.stringify(logEntry));
  };

  const error = (message: string, err?: Error, context?: LogContext) => {
    const errorContext = {
      ...context,
      error: err ? { message: err.message, stack: err.stack } : undefined,
    };
    log(LogLevel.ERROR, message, errorContext);
  };

  return {
    debug: (message, context) => log(LogLevel.DEBUG, message, context),
    info: (message, context) => log(LogLevel.INFO, message, context),
    warn: (message, context) => log(LogLevel.WARN, message, context),
    error,
    child: (childContext: LogContext) => {
      const mergedContext = { ...baseContext, ...childContext };
      return createLoggerInternal(mergedContext);
    },
  };
};

export const createLogger = (): Logger => createLoggerInternal();

export const logger = createLogger();
````

## File: src/types/index.ts
````typescript
export * from './mem.js';
export * from './git.js';
export * from './sandbox.js';
export * from './llm.js';
export * from './loop.js';
export * from './mcp.js';

// Re-export AppConfig from config module
export type { AppConfig } from '../config.js';

export interface RecursaConfig {
  knowledgeGraphPath: string;
  llm: {
    apiKey: string;
    baseUrl?: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
  };
  sandbox: {
    timeout: number;
    memoryLimit: number;
  };
  git: {
    userName: string;
    userEmail: string;
  };
}

export interface EnvironmentVariables {
  KNOWLEDGE_GRAPH_PATH: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL?: string;
  LLM_TEMPERATURE?: string;
  LLM_MAX_TOKENS?: string;
  SANDBOX_TIMEOUT?: string;
  SANDBOX_MEMORY_LIMIT?: string;
  GIT_USER_NAME?: string;
  GIT_USER_EMAIL?: string;
}
````

## File: src/types/mcp.ts
````typescript
// Based on MCP Specification

// --- Requests ---
export interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface InitializeParams {
  processId?: number;
  clientInfo: {
    name: string;
    version: string;
    [key: string]: unknown;
  };
  capabilities: Record<string, unknown>;
}

// --- Responses ---
export interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// --- Tooling ---
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  [key: string]: unknown;
}

export interface ListToolsResult {
  tools: MCPTool[];
}

// --- Notifications ---
export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}
````

## File: src/core/mem-api/git-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';
import type { LogEntry } from '../../types';

// Note: These functions take a pre-configured simple-git instance.

export const gitDiff =
  (git: SimpleGit) =>
  async (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ): Promise<string> => {
    try {
      if (fromCommit && toCommit) {
        return await git.diff([`${fromCommit}..${toCommit}`, '--', filePath]);
      } else if (fromCommit) {
        return await git.diff([`${fromCommit}`, '--', filePath]);
      } else {
        return await git.diff([filePath]);
      }
    } catch (error) {
      throw new Error(
        `Failed to get git diff for ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const gitLog =
  (git: SimpleGit) =>
  async (filePath?: string, maxCommits = 5): Promise<LogEntry[]> => {
    try {
      const options = {
        maxCount: maxCommits,
        ...(filePath ? { file: filePath } : {}),
      };
      const result = await git.log(options);
      return result.all.map((entry) => ({
        hash: entry.hash,
        message: entry.message,
        date: entry.date,
      }));
    } catch (error) {
      const target = filePath || 'repository';
      throw new Error(
        `Failed to get git log for ${target}: ${(error as Error).message}`
      );
    }
  };

export const getChangedFiles =
  (git: SimpleGit) => async (): Promise<string[]> => {
    try {
      const status = await git.status();
      // Combine all relevant file arrays and remove duplicates
      const allFiles = new Set([
        ...status.staged,
        ...status.modified,
        ...status.created,
        ...status.deleted,
        ...status.not_added, // Add untracked files
        ...status.renamed.map((r) => r.to),
      ]);
      return Array.from(allFiles);
    } catch (error) {
      throw new Error(
        `Failed to get changed files: ${(error as Error).message}`
      );
    }
  };

export const commitChanges =
  (git: SimpleGit) =>
  async (message: string): Promise<string> => {
    try {
      // Stage all changes
      await git.add('.');

      // Commit staged changes
      const result = await git.commit(message);

      // Return the commit hash
      if (result.commit) {
        return result.commit;
      }
      // If result.commit is empty or null, it means no changes were committed. This is not an error.
      return 'No changes to commit.';
    } catch (error) {
      throw new Error(`Failed to commit changes: ${(error as Error).message}`);
    }
  };
````

## File: src/core/mem-api/index.ts
````typescript
import type { MemAPI } from '../../types';
import type { AppConfig } from '../../config';
import simpleGit from 'simple-git';

import * as fileOps from './file-ops.js';
import * as gitOps from './git-ops.js';
import * as graphOps from './graph-ops.js';
import * as stateOps from './state-ops.js';
import * as utilOps from './util-ops.js';

/**
 * Creates a fully-functional MemAPI object.
 * This is a Higher-Order Function that takes the application configuration
 * and returns an object where each method is pre-configured with the necessary
 * context (like the knowledge graph path or a git instance).
 *
 * @param config The application configuration.
 * @returns A complete MemAPI object ready to be used by the sandbox.
 */
export const createMemAPI = (config: AppConfig): MemAPI => {
  const git = simpleGit(config.knowledgeGraphPath)
    .addConfig('user.name', config.gitUserName)
    .addConfig('user.email', config.gitUserEmail);
  const graphRoot = config.knowledgeGraphPath;

  return {
    // Core File I/O
    readFile: fileOps.readFile(graphRoot),
    writeFile: fileOps.writeFile(graphRoot),
    updateFile: fileOps.updateFile(graphRoot),
    deletePath: fileOps.deletePath(graphRoot),
    rename: fileOps.rename(graphRoot),
    fileExists: fileOps.fileExists(graphRoot),
    createDir: fileOps.createDir(graphRoot),
    listFiles: fileOps.listFiles(graphRoot),

    // Git-Native Operations
    gitDiff: gitOps.gitDiff(git),
    gitLog: gitOps.gitLog(git),
    getChangedFiles: gitOps.getChangedFiles(git),
    commitChanges: gitOps.commitChanges(git),

    // Intelligent Graph Operations
    queryGraph: graphOps.queryGraph(graphRoot),
    getBacklinks: graphOps.getBacklinks(graphRoot),
    getOutgoingLinks: graphOps.getOutgoingLinks(graphRoot),
    searchGlobal: graphOps.searchGlobal(graphRoot),

    // State Management & Checkpoints
    saveCheckpoint: stateOps.saveCheckpoint(git), // Implemented
    revertToLastCheckpoint: stateOps.revertToLastCheckpoint(git), // Implemented
    discardChanges: stateOps.discardChanges(git), // Implemented

    // Utility & Diagnostics
    getGraphRoot: utilOps.getGraphRoot(graphRoot),
    getTokenCount: utilOps.getTokenCount(graphRoot), // Implemented
    getTokenCountForPaths: utilOps.getTokenCountForPaths(graphRoot), // Implemented
  };
};
````

## File: src/core/mem-api/state-ops.ts
````typescript
import type { SimpleGit } from 'simple-git';

// Note: These functions map to specific git commands for state management.

export const saveCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Stage all changes: `await git.add('.')`.
    await git.add('.');
    // 2. Save to stash with a message: `await git.stash(['push', '-m', 'recursa-checkpoint'])`.
    await git.stash(['push', '-m', 'recursa-checkpoint']);
    // 3. Return true on success.
    return true;
  };

export const revertToLastCheckpoint =
  (git: SimpleGit) => async (): Promise<boolean> => {
    try {
      // 1. Apply the most recent stash: `await git.stash(['pop'])`.
      // This can fail if the stash is empty, so wrap in a try/catch.
      await git.stash(['pop']);
      return true;
    } catch {
      // If stash is empty, simple-git throws. We can consider this a "success"
      // in that there's nothing to revert to. Or we can re-throw.
      // For now, let's log and return false.
       
      console.warn('Could not revert to checkpoint, stash may be empty.');
      return false;
    }
  };

export const discardChanges =
  (git: SimpleGit) => async (): Promise<boolean> => {
    // 1. Reset all tracked files: `await git.reset(['--hard', 'HEAD'])`.
    await git.reset(['--hard', 'HEAD']);
    // 2. Remove all untracked files and directories: `await git.clean('f', ['-d'])`.
    await git.clean('f', ['-d']);
    // 3. Return true on success.
    return true;
  };
````

## File: tests/lib/test-harness.ts
````typescript
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit, { type SimpleGit } from 'simple-git';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { MemAPI } from '../../src/types';
import type { ChatMessage } from '../../src/types';

/**
 * Test harness options for customizing the test environment
 */
export interface TestHarnessOptions {
  /** Custom git user name, defaults to 'Test User' */
  gitUserName?: string;
  /** Custom git user email, defaults to 'test@example.com' */
  gitEmail?: string;
  /** Custom temp directory prefix, defaults to 'recursa-test-' */
  tempPrefix?: string;
  /** Custom OpenRouter API key, defaults to 'test-api-key' */
  apiKey?: string;
  /** Custom LLM model, defaults to 'test-model' */
  model?: string;
  /** Whether to initialize with a .gitignore file, defaults to true */
  withGitignore?: boolean;
}

/**
 * Test harness state containing all the test environment resources
 */
export interface TestHarnessState {
  readonly tempDir: string;
  readonly mockConfig: AppConfig;
  readonly mem: MemAPI;
  readonly git: SimpleGit;
}

/**
 * Creates a test harness with isolated temporary environment
 * @param options - Configuration options for the test harness
 * @returns Promise resolving to TestHarnessState with temp directory, config, and utilities
 */
export const createTestHarness = async (
  options: TestHarnessOptions = {}
): Promise<TestHarnessState> => {
  const {
    gitUserName = 'Test User',
    gitEmail = 'test@example.com',
    tempPrefix = 'recursa-test-',
    apiKey = 'test-api-key',
    model = 'test-model',
    withGitignore = true,
  } = options;

  // Create temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), tempPrefix));

  // Create mock configuration
  const mockConfig: AppConfig = {
    knowledgeGraphPath: tempDir,
    openRouterApiKey: apiKey,
    llmModel: model,
    llmTemperature: 0.7,
    llmMaxTokens: 4000,
    sandboxTimeout: 10000,
    sandboxMemoryLimit: 100,
    gitUserName: gitUserName,
    gitUserEmail: gitEmail,
  };

  // Initialize git repository
  const git = simpleGit(tempDir);
  await git.init();
  await git.addConfig('user.name', gitUserName);
  await git.addConfig('user.email', gitEmail);

  // Optionally create .gitignore file
  if (withGitignore) {
    await fs.writeFile(
      path.join(tempDir, '.gitignore'),
      '*.log\nnode_modules/\n.env\n.DS_Store'
    );
    await git.add('.gitignore');
    await git.commit('Initial commit with .gitignore');
  }

  // Create MemAPI instance
  const mem = createMemAPI(mockConfig);

  return {
    tempDir,
    mockConfig,
    mem,
    git,
  };
};

/**
 * Cleans up a test harness by removing the temporary directory
 * @param harness - The test harness state to clean up
 */
export const cleanupTestHarness = async (
  harness: TestHarnessState
): Promise<void> => {
  await fs.rm(harness.tempDir, { recursive: true, force: true });
};

/**
 * Resets the test harness environment (clears directory, re-inits git)
 * @param harness - The test harness state to reset
 * @param options - Options for reset operation
 */
export const resetTestHarness = async (
  harness: TestHarnessState,
  options: { withGitignore?: boolean } = {}
): Promise<void> => {
  const { withGitignore = true } = options;

  // Clear the directory
  await fs.rm(harness.tempDir, { recursive: true, force: true });
  await fs.mkdir(harness.tempDir, { recursive: true });

  // Re-initialize git
  await harness.git.init();

  // Optionally recreate .gitignore
  if (withGitignore) {
    await fs.writeFile(
      path.join(harness.tempDir, '.gitignore'),
      '*.log\nnode_modules/\n.env\n.DS_Store'
    );
    await harness.git.add('.gitignore');
    await harness.git.commit('Initial commit with .gitignore');
  }
};

/**
 * Higher-order function that wraps a test function with test harness setup/teardown
 * @param testFn - The test function to execute with the harness
 * @param options - Test harness options
 * @returns A test function that handles setup/teardown automatically
 */
export const withTestHarness = <T>(
  testFn: (harness: TestHarnessState) => Promise<T>,
  options: TestHarnessOptions = {}
) => {
  return async (): Promise<T> => {
    const harness = await createTestHarness(options);

    try {
      return await testFn(harness);
    } finally {
      await cleanupTestHarness(harness);
    }
  };
};

/**
 * Creates multiple test harnesses for parallel testing
 * @param count - Number of harnesses to create
 * @param options - Configuration options for each harness
 * @returns Array of TestHarnessState instances
 */
export const createMultipleTestHarnesses = async (
  count: number,
  options: TestHarnessOptions = {}
): Promise<TestHarnessState[]> => {
  const harnesses: TestHarnessState[] = [];

  try {
    for (let i = 0; i < count; i++) {
      const harness = await createTestHarness({
        ...options,
        tempPrefix: `${options.tempPrefix || 'recursa-test-'}parallel-${i}-`,
      });
      harnesses.push(harness);
    }

    return harnesses;
  } catch (error) {
    // Cleanup any created harnesses if an error occurs
    await Promise.all(harnesses.map(cleanupTestHarness));
    throw error;
  }
};

/**
 * Utility function to create test files with common patterns
 * @param harness - Test harness state
 * @param files - Object mapping file paths to contents
 */
export const createTestFiles = async (
  harness: TestHarnessState,
  files: Record<string, string>
): Promise<void> => {
  const promises = Object.entries(files).map(async ([filePath, content]) => {
    await harness.mem.writeFile(filePath, content);
  });

  await Promise.all(promises);
};

/**
 * Utility function to verify files exist and have expected content
 * @param harness - Test harness state
 * @param expectedFiles - Object mapping file paths to expected content (partial or full)
 */
export const verifyTestFiles = async (
  harness: TestHarnessState,
  expectedFiles: Record<string, string>
): Promise<void> => {
  const promises = Object.entries(expectedFiles).map(
    async ([filePath, expectedContent]) => {
      const exists = await harness.mem.fileExists(filePath);
      if (!exists) {
        throw new Error(`Expected file ${filePath} does not exist`);
      }

      const actualContent = await harness.mem.readFile(filePath);
      if (!actualContent.includes(expectedContent)) {
        throw new Error(
          `File ${filePath} does not contain expected content: "${expectedContent}"`
        );
      }
    }
  );

  await Promise.all(promises);
};

/**
 * Creates a mock LLM query function for testing purposes.
 * This replaces the duplicate Mock LLM utilities found across different test files.
 *
 * @param responses - Array of predefined responses to return in sequence
 * @returns A mock function that simulates LLM responses
 */
export const createMockQueryLLM = (
  responses: string[]
): ((history: ChatMessage[], config: AppConfig) => Promise<string>) => {
  let callCount = 0;
  return async (
    _history: ChatMessage[],
    _config: AppConfig,
  ): Promise<string> => {
    // Return the next pre-canned XML response from the `responses` array.
    const response = responses[callCount];
    if (!response) {
      throw new Error(
        `Mock LLM called more times than expected (${callCount}).`
      );
    }
    callCount++;
    return response;
  };
};

/**
 * Creates a mock LLM query function using Bun's mock for testing with spies.
 * This is useful when you need to track call counts, arguments, etc.
 *
 * @param responses - Array of predefined responses to return in sequence
 * @returns A Bun mock function that simulates LLM responses
 */
export const createMockLLMQueryWithSpy = (responses: string[]) => {
  let callCount = 0;
  return jest.fn(
    async (_history: ChatMessage[], _config: AppConfig): Promise<string> => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response as string;
    }
  );
};

/**
 * Default mock configuration for tests
 */
export const createMockConfig = (
  overrides: Partial<AppConfig> = {}
): AppConfig => ({
  openRouterApiKey: 'test-api-key',
  knowledgeGraphPath: '/test/path',
  llmModel: 'anthropic/claude-3-haiku-20240307',
  llmTemperature: 0.7,
  llmMaxTokens: 4000,
  sandboxTimeout: 10000,
  sandboxMemoryLimit: 100,
  gitUserName: 'Test User',
  gitUserEmail: 'test@example.com',
  ...overrides,
});

/**
 * Default mock chat history for tests
 */
export const createMockHistory = (
  customMessages: Partial<ChatMessage>[] = []
): ChatMessage[] => [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, world!' },
  ...customMessages.map(
    (msg) =>
      ({
        role: msg.role || 'user',
        content: msg.content || '',
      }) as ChatMessage
  ),
];
````

## File: .env.example
````
# Recursa MCP Server Configuration
# Copy this file to .env and update the values

# Required: Path to your knowledge graph directory
KNOWLEDGE_GRAPH_PATH=./knowledge-graph

# Required: OpenRouter API key for LLM access
# Get your API key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: LLM model to use (default: anthropic/claude-3-haiku-20240307)
# See https://openrouter.ai/models for a list of available models
LLM_MODEL=anthropic/claude-3-haiku-20240307

# Optional: LLM Configuration
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4096

# Optional: Sandbox Configuration (in milliseconds and megabytes)
SANDBOX_TIMEOUT=30000
SANDBOX_MEMORY_LIMIT=100

# Optional: Git Configuration
GIT_USER_NAME=Recursa Agent
GIT_USER_EMAIL=recursa@local

# Usage:
# 1. Copy this file: cp .env.example .env
# 2. Update OPENROUTER_API_KEY with your actual API key
# 3. Update KNOWLEDGE_GRAPH_PATH to point to your knowledge graph
# 4. Source the file: source .env
# 5. Run the server: npm start
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "rootDir": "src",
    "outDir": "dist",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": false,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": false,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
````

## File: src/core/mem-api/util-ops.ts
````typescript
import { promises as fs } from 'fs';
import type { PathTokenCount } from '../../types';
import { resolveSecurePath } from './secure-path.js';

// A private helper to centralize token counting logic.
// This is a simple estimation and should be replaced with a proper
// tokenizer library like tiktoken if higher accuracy is needed.
const countTokensForContent = (content: string): number => {
  // A common rough estimate is 4 characters per token.
  return Math.ceil(content.length / 4);
};

// Note: HOFs returning the final mem API functions.

export const getGraphRoot =
  (graphRoot: string) => async (): Promise<string> => {
    return graphRoot;
  };

export const getTokenCount =
  (graphRoot: string) =>
  async (filePath: string): Promise<number> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return countTokensForContent(content);
    } catch (error) {
      throw new Error(
        `Failed to count tokens for ${filePath}: ${(error as Error).message}`
      );
    }
  };

export const getTokenCountForPaths =
  (graphRoot: string) =>
  async (paths: string[]): Promise<PathTokenCount[]> => {
    return Promise.all(
      paths.map(async (filePath) => {
        const tokenCount = await getTokenCount(graphRoot)(filePath);
        return {
          path: filePath,
          tokenCount,
        };
      })
    );
  };
````

## File: src/core/llm.ts
````typescript
import type { AppConfig } from '../config';
import { logger } from '../lib/logger.js';
import type { ChatMessage } from '../types';

// Custom error class for HTTP errors with status code
class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseText?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const withRetry =
  <T extends (...args: unknown[]) => Promise<unknown>>(queryFn: T) =>
  async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const maxAttempts = 3;
    const initialDelay = 1000;
    const backoffFactor = 2;
    let lastError: Error;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return (await queryFn(...args)) as Awaited<ReturnType<T>>;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors (4xx status codes)
        if (
          error instanceof HttpError &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        ) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        logger.warn(
          `Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms delay. Error: ${lastError.message}`
        );

        // Wait for the delay
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

export const queryLLM = async (
  history: ChatMessage[],
  config: AppConfig
): Promise<string> => {
  // OpenRouter API endpoint
  const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

  // Create request body
  const requestBody = {
    model: config.llmModel,
    messages: history,
    temperature: config.llmTemperature,
    max_tokens: config.llmMaxTokens,
  };

  try {
    // Make POST request to OpenRouter API
    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/rec/ursa', // Referer is required by OpenRouter
        'X-Title': 'Recursa',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is successful
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = (await response.json()) as {
          error?: { message?: string };
        };
        errorDetails = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        errorDetails = await response.text();
      }

      throw new HttpError(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
        response.status,
        errorDetails
      );
    }

    // Parse JSON response
    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };

    // Extract and validate content
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    const content = data.choices[0].message.content;
    if (!content) {
      throw new Error('Empty content received from OpenRouter API');
    }

    return content;
  } catch (error) {
    // Re-throw HttpError instances
    if (error instanceof HttpError) {
      throw error;
    }

    // Wrap other errors
    throw new Error(
      `Failed to query OpenRouter API: ${(error as Error).message}`
    );
  }
};

export const queryLLMWithRetries = withRetry(
  queryLLM as (...args: unknown[]) => Promise<unknown>
);
````

## File: src/types/mem.ts
````typescript
import type { LogEntry } from './git.js';

// --- Knowledge Graph & Git ---

// Structure for a graph query result.
export type GraphQueryResult = {
  filePath: string;
  matches: string[];
};

// Structure for token count results for multiple paths.
export type PathTokenCount = {
  path: string;
  tokenCount: number;
};

// --- MemAPI Interface (Matches tools.md) ---

// This is the "cheatsheet" for what's available in the sandbox.
// It must be kept in sync with the tools documentation.
export type MemAPI = {
  // Core File I/O
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  updateFile: (
    filePath: string,
    oldContent: string,
    newContent: string
  ) => Promise<boolean>;
  deletePath: (filePath: string) => Promise<boolean>;
  rename: (oldPath: string, newPath: string) => Promise<boolean>;
  fileExists: (filePath: string) => Promise<boolean>;
  createDir: (directoryPath: string) => Promise<boolean>;
  listFiles: (directoryPath?: string) => Promise<string[]>;

  // Git-Native Operations
  gitDiff: (
    filePath: string,
    fromCommit?: string,
    toCommit?: string
  ) => Promise<string>;
  gitLog: (filePath?: string, maxCommits?: number) => Promise<LogEntry[]>;
  getChangedFiles: () => Promise<string[]>;
  commitChanges: (message: string) => Promise<string>;

  // Intelligent Graph Operations
  queryGraph: (query: string) => Promise<GraphQueryResult[]>;
  getBacklinks: (filePath: string) => Promise<string[]>;
  getOutgoingLinks: (filePath: string) => Promise<string[]>;
  searchGlobal: (query: string) => Promise<string[]>;

  // State Management
  saveCheckpoint: () => Promise<boolean>;
  revertToLastCheckpoint: () => Promise<boolean>;
  discardChanges: () => Promise<boolean>;

  // Utility
  getGraphRoot: () => Promise<string>;
  getTokenCount: (filePath: string) => Promise<number>;
  getTokenCountForPaths: (paths: string[]) => Promise<PathTokenCount[]>;
};
````

## File: src/config.ts
````typescript
import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import { promises as fs } from 'fs';
import platform from './lib/platform.js';

// Platform-specific default values
const getPlatformDefaults = () => {
  const resourceLimits = platform.getResourceLimits();

  return {
    // Conservative defaults for mobile/limited environments
    LLM_MODEL: 'anthropic/claude-3-haiku-20240307',
    LLM_TEMPERATURE: platform.isTermux ? 0.5 : 0.7,
    LLM_MAX_TOKENS: platform.isTermux ? 2000 : 4000,
    SANDBOX_TIMEOUT: Math.min(resourceLimits.maxCpuTime, 10000),
    SANDBOX_MEMORY_LIMIT: Math.floor(resourceLimits.maxMemory / 1024 / 1024), // Convert to MB
    GIT_USER_NAME: 'Recursa Agent',
    GIT_USER_EMAIL: 'recursa@local'
  };
};

const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required.'),
  KNOWLEDGE_GRAPH_PATH: z.string().min(1, 'KNOWLEDGE_GRAPH_PATH is required.'),
  RECURSA_API_KEY: z.string().min(1, 'RECURSA_API_KEY is required.'),
  HTTP_PORT: z.coerce.number().default(8080).optional(),
  LLM_MODEL: z.string().default(getPlatformDefaults().LLM_MODEL).optional(),
  LLM_TEMPERATURE: z.coerce.number().default(getPlatformDefaults().LLM_TEMPERATURE).optional(),
  LLM_MAX_TOKENS: z.coerce.number().default(getPlatformDefaults().LLM_MAX_TOKENS).optional(),
  SANDBOX_TIMEOUT: z.coerce.number().default(getPlatformDefaults().SANDBOX_TIMEOUT).optional(),
  SANDBOX_MEMORY_LIMIT: z.coerce.number().default(getPlatformDefaults().SANDBOX_MEMORY_LIMIT).optional(),
  GIT_USER_NAME: z.string().default(getPlatformDefaults().GIT_USER_NAME).optional(),
  GIT_USER_EMAIL: z.string().default(getPlatformDefaults().GIT_USER_EMAIL).optional(),
});

export type AppConfig = {
  openRouterApiKey: string;
  knowledgeGraphPath: string;
  recursaApiKey: string;
  httpPort: number;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  sandboxTimeout: number;
  sandboxMemoryLimit: number;
  gitUserName: string;
  gitUserEmail: string;
};

/**
 * Normalize environment variable keys for cross-platform compatibility
 */
const normalizeEnvVars = () => {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      const normalizedKey = platform.normalizeEnvVar(key);
      normalized[normalizedKey] = value;
    }
  }

  return { ...process.env, ...normalized };
};

/**
 * Resolve and validate the knowledge graph path with platform awareness
 */
const resolveKnowledgeGraphPath = (basePath: string): string => {
  // Normalize path separators for the current platform
  let resolvedPath = platform.normalizePath(basePath);

  // Handle relative paths
  if (!platform.isAbsolute(resolvedPath)) {
    resolvedPath = platform.normalizePath(path.resolve(process.cwd(), resolvedPath));
     
    console.warn(
      `KNOWLEDGE_GRAPH_PATH is not absolute. Resolved to: ${resolvedPath}`
    );
  }

  // Handle platform-specific path requirements
  if (platform.isWindows) {
    // Ensure Windows paths are properly formatted
    if (!/^[A-Za-z]:\\/.test(resolvedPath) && !resolvedPath.startsWith('\\\\')) {
      // Add current drive letter if missing
      const cwd = process.cwd();
      const drive = cwd.substring(0, 2); // e.g., "C:"
      resolvedPath = drive + resolvedPath;
    }
  }

  return resolvedPath;
};

/**
 * Validate that the knowledge graph directory exists and is accessible
 */
const validateKnowledgeGraphPath = async (resolvedPath: string): Promise<void> => {
  // Skip validation in test environments
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error('Path exists but is not a directory.');
    }

    // Test write permissions in a cross-platform way
    const testFile = path.join(resolvedPath, '.recursa-write-test');
    try {
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch {
      if (platform.isWindows) {
        throw new Error('Directory is not writable. Check folder permissions.');
      } else if (platform.isTermux) {
        throw new Error('Directory is not writable. Check Termux storage permissions.');
      } else {
        throw new Error('Directory is not writable. Check file permissions.');
      }
    }

    // Check available disk space (Unix-like systems only)
    if (!platform.isWindows) {
      try {
        const stats = await fs.statfs(resolvedPath);
        const availableSpace = stats.bavail * stats.bsize;
        const minSpace = 100 * 1024 * 1024; // 100MB minimum
        if (availableSpace < minSpace) {
          console.warn(`⚠️  Low disk space: ${Math.floor(availableSpace / 1024 / 1024)}MB available`);
        }
      } catch {
        // Ignore filesystem stats errors
      }
    }

  } catch (error) {
    if ((error as Error & { code?: string }).code === 'ENOENT') {
      throw new Error('Directory does not exist. Please create it before continuing.');
    }
    throw error;
  }
};

export const loadAndValidateConfig = async (): Promise<AppConfig> => {
  // Use normalized environment variables
  const normalizedEnv = normalizeEnvVars();
  const parseResult = configSchema.safeParse(normalizedEnv);

  if (!parseResult.success) {
     
    console.error(
      '❌ Invalid environment variables:',
      parseResult.error.flatten().fieldErrors
    );
    process.exit(1);
  }

  const {
    OPENROUTER_API_KEY,
    KNOWLEDGE_GRAPH_PATH,
    RECURSA_API_KEY,
    HTTP_PORT,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    SANDBOX_TIMEOUT,
    SANDBOX_MEMORY_LIMIT,
    GIT_USER_NAME,
    GIT_USER_EMAIL,
  } = parseResult.data;

  // Resolve and validate the knowledge graph path
  const resolvedPath = resolveKnowledgeGraphPath(KNOWLEDGE_GRAPH_PATH);
  await validateKnowledgeGraphPath(resolvedPath);

  // Log platform-specific information
  console.log(`🔧 Platform: ${platform.platformString}`);
  if (platform.isTermux) {
    console.log('📱 Running in Termux/Android environment');
    console.log(`⚡ Memory limit: ${SANDBOX_MEMORY_LIMIT}MB, Timeout: ${SANDBOX_TIMEOUT}ms`);
  }

  return Object.freeze({
    openRouterApiKey: OPENROUTER_API_KEY,
    knowledgeGraphPath: resolvedPath,
    recursaApiKey: RECURSA_API_KEY,
    httpPort: HTTP_PORT!,
    llmModel: LLM_MODEL!,
    llmTemperature: LLM_TEMPERATURE!,
    llmMaxTokens: LLM_MAX_TOKENS!,
    sandboxTimeout: SANDBOX_TIMEOUT!,
    sandboxMemoryLimit: SANDBOX_MEMORY_LIMIT!,
    gitUserName: GIT_USER_NAME!,
    gitUserEmail: GIT_USER_EMAIL!,
  });
};
````

## File: tests/integration/workflow.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { handleUserQuery } from '../../src/core/loop';
import type { StatusUpdate } from '../../src/types';
import {
  createTestHarness,
  cleanupTestHarness,
  createMockLLMQueryWithSpy,
  type TestHarnessState,
} from '../lib/test-harness';
describe('Agent Workflow Integration Tests', () => {
  let harness: TestHarnessState;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  describe('Complete Workflow Integration', () => {
    it('should execute a complete project lifecycle', async () => {
      const sessionId = 'project-lifecycle';

      // Phase 1: Initialize project
      const initMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll initialize a new project with basic structure.</think>
<typescript>
// Create project structure
await mem.writeFile('package.json', JSON.stringify({
  name: 'test-project',
  version: '1.0.0',
  description: 'A test project',
  scripts: { start: 'node index.js', test: 'jest' }
}, null, 2));

await mem.writeFile('README.md', '# Test Project\\n\\nThis is a comprehensive test project.');
await mem.writeFile('index.js', 'console.log(\\"Hello, World!\\");');
await mem.createDir('src');
await mem.writeFile('src/app.js', '// Application logic');
</typescript>`,
        `<think>Project initialized. Now commit the initial setup.</think>
<typescript>
await mem.commitChanges('feat: initialize project with basic structure');
</typescript>`,
        `<think>Replying to user.</think>
<reply>Project initialized successfully with package.json, README, main entry point, and source directory.</reply>`,
      ]);

      const initResult = await handleUserQuery(
        'Initialize a new Node.js project',
        harness.mockConfig,
        sessionId,
        initMockLLMQuery
      );

      expect(initResult).toContain('Project initialized successfully');

      // Phase 2: Add features
      const featureMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll add features to the existing project.</think>
<typescript>
// Add feature files
await mem.writeFile('src/utils.js', '// Utility functions\\nexports.formatDate = (date) => date.toISOString();');
await mem.writeFile('src/config.js', '// Configuration\\nmodule.exports = { port: 3000 };');
await mem.createDir('tests');
await mem.writeFile('tests/utils.test.js', "// Test utilities\\nconst { formatDate } = require('../src/utils.js');");
</typescript>`,
        `<think>Features added. Commit the new functionality.</think>
<typescript>
await mem.commitChanges('feat: add utilities, config, and test structure');
</typescript>`,
        `<think>Replying to user.</think>
<reply>Added utility functions, configuration, and test structure to the project.</reply>`,
      ]);

      const featureResult = await handleUserQuery(
        'Add utilities and configuration to the project',
        harness.mockConfig,
        sessionId,
        featureMockLLMQuery
      );

      expect(featureResult).toContain('Added utility functions');

      // Phase 3: Update existing files
      const updateMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll update the main application to use the new utilities.</think>
<typescript>
// Update main file
const indexContent = await mem.readFile('index.js');
const updatedIndex = indexContent.replace(
  'console.log(\\"Hello, World!\\");',
  'const { formatDate } = require(\\"./src/utils.js\\");\\nconsole.log(\\"Current time:\\", formatDate(new Date()));'
);
await mem.updateFile('index.js', indexContent, updatedIndex);

// Update README
const readmeContent = await mem.readFile('README.md');
const updatedReadme = readmeContent + '\\n\\n## Usage\\n\\nRun with: npm start';
await mem.updateFile('README.md', readmeContent, updatedReadme);
</typescript>`,
        `<think>Main application updated. Commit the improvements.</think>
<typescript>
await mem.commitChanges('feat: integrate utilities and update documentation');
</typescript>`,
        `<think>Replying to user.</think>
<reply>Updated the main application to use utilities and improved documentation.</reply>`,
      ]);

      const updateResult = await handleUserQuery(
        'Update the main application to use the new utilities',
        harness.mockConfig,
        sessionId,
        updateMockLLMQuery
      );

      expect(updateResult).toContain('Updated the main application');

      // Verify complete project state
      const mem = harness.mem;

      // Check all expected files exist
      const expectedFiles = [
        'package.json',
        'README.md',
        'index.js',
        'src/app.js',
        'src/utils.js',
        'src/config.js',
        'tests/utils.test.js',
      ];

      for (const file of expectedFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(true);
      }

      // Verify file contents
      const indexContent = await mem.readFile('index.js');
      expect(indexContent).toContain('formatDate');
      expect(indexContent).toContain('./src/utils.js');

      const readmeContent = await mem.readFile('README.md');
      expect(readmeContent).toContain('Usage');
      expect(readmeContent).toContain('npm start');

      // Verify git history shows all three commits (plus initial .gitignore commit)
      const log = await harness.git.log();
      expect(log.all.length).toBe(4);
      expect(log.all[0]?.message).toBe(
        'feat: integrate utilities and update documentation'
      );
      expect(log.all[1]?.message).toBe(
        'feat: add utilities, config, and test structure'
      );
      expect(log.all[2]?.message).toBe(
        'feat: initialize project with basic structure'
      );
    });

    it('should handle complex file operations and git workflow', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      const complexMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll demonstrate complex file operations including creating, updating, deleting, and renaming files.</think>
<typescript>
// Create multiple related files
await mem.writeFile('docs/intro.md', '# Introduction\\n\\nProject introduction.');
await mem.writeFile('docs/guide.md', '# User Guide\\n\\nDetailed user guide.');
await mem.writeFile('docs/api.md', '# API Reference\\n\\nAPI documentation.');

// Create a temporary file that will be renamed
await mem.writeFile('docs/temp.md', '# Temporary\\n\\nThis will be renamed.');

// Create a file that will be deleted
await mem.writeFile('docs/obsolete.md', '# Obsolete\\n\\nThis will be deleted.');

// List files to verify
const docsFiles = await mem.listFiles('docs');
console.log('Files created:', docsFiles);
</typescript>`,
        `<think>Now I'll perform file operations: rename and delete.</think>
<typescript>
// Rename temp.md to overview.md
await mem.rename('docs/temp.md', 'docs/overview.md');

// Delete the obsolete file
await mem.deletePath('docs/obsolete.md');

// Update the introduction to reference the overview
const introContent = await mem.readFile('docs/intro.md');
const updatedIntro = introContent + '\\n\\nSee also: [[Overview]] for a project overview.';
await mem.updateFile('docs/intro.md', introContent, updatedIntro);

// Verify git staged files
const stagedFiles = await mem.getChangedFiles();
console.log('Staged files:', stagedFiles);
</typescript>`,
        `<think>File operations complete. Now commit and verify git operations.</think>
<typescript>
await mem.commitChanges('feat: reorganize documentation structure');

// Test git operations
const gitDiff = await mem.gitDiff('docs/intro.md');
const gitLog = await mem.gitLog('docs/', 5);

console.log('Git diff for intro.md:', gitDiff);
console.log('Git log for docs/:', gitLog);
</typescript>`,
        `<think>Replying to user.</think>
<reply>
Successfully performed complex file operations including creating multiple documentation files, renaming temp.md to overview.md, deleting obsolete.md, updating the introduction, and committing all changes with proper git history tracking.
</reply>`,
      ]);

      const result = await handleUserQuery(
        'Perform complex file operations with git workflow',
        harness.mockConfig,
        'complex-ops-session',
        complexMockLLMQuery,
        captureStatusUpdate
      );

      expect(result).toContain(
        'Successfully performed complex file operations'
      );

      // Verify status updates were captured throughout the process
      expect(statusUpdates.length).toBeGreaterThan(0);
      const types = new Set(statusUpdates.map((u) => u.type));
      expect(types.has('think')).toBe(true);
      expect(types.has('act')).toBe(true);

      // Verify final file state
      const mem = harness.mem;

      // Files that should exist
      const existingFiles = [
        'docs/intro.md',
        'docs/guide.md',
        'docs/api.md',
        'docs/overview.md',
      ];
      for (const file of existingFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(true);
      }

      // Files that should not exist
      const deletedFiles = ['docs/temp.md', 'docs/obsolete.md'];
      for (const file of deletedFiles) {
        const exists = await mem.fileExists(file);
        expect(exists).toBe(false);
      }

      // Verify content was updated
      const introContent = await mem.readFile('docs/intro.md');
      expect(introContent).toContain('[[Overview]]');

      // Verify git operations worked (plus initial .gitignore commit)
      const log = await harness.git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0]?.message).toBe(
        'feat: reorganize documentation structure'
      );
    });

    it('should handle error scenarios and recovery gracefully', async () => {
      const statusUpdates: StatusUpdate[] = [];

      const captureStatusUpdate = (update: StatusUpdate) => {
        statusUpdates.push(update);
      };

      const errorRecoveryMockLLMQuery = createMockLLMQueryWithSpy([
        `<think>I'll attempt various operations to test error handling and recovery.</think>
<typescript>
// This should fail - file doesn't exist
try {
  await mem.readFile('non-existent-config.json');
} catch (error) {
  console.log('Expected error caught:', error.message);
}

// This should also fail - invalid path traversal attempt
try {
  await mem.writeFile('../../../etc/malicious.txt', 'hack');
} catch (error) {
  console.log('Security error caught:', error.message);
}

// This should work - create the missing file
await mem.writeFile('non-existent-config.json', '{"app": "test", "version": "1.0.0"}');
</typescript>`,
        `<think>Now I'll test additional error scenarios.</think>
<typescript>
// Try to update a file that doesn't exist
try {
  await mem.updateFile('missing.md', 'old content', 'new content');
} catch (error) {
  console.log('Update error caught:', error.message);
  // Create the file instead
  await mem.writeFile('missing.md', '# Created after error\\n\\nContent here.');
}

// Try to delete a file that doesn't exist
try {
  await mem.deletePath('already-deleted.md');
} catch (error) {
  console.log('Delete error caught:', error.message);
}
</typescript>`,
        `<think>Error recovery completed. Now commit all successful operations.</think>
<typescript>
await mem.commitChanges('feat: demonstrate error handling and recovery');
</typescript>`,
        `<think>Replying to user.</think>
<reply>
Successfully demonstrated comprehensive error handling and recovery. Caught and handled file not found errors, security errors for path traversal attempts, and successfully recovered by creating missing files when appropriate.
</reply>`,
      ]);

      const result = await handleUserQuery(
        'Test error handling and recovery scenarios',
        harness.mockConfig,
        'error-test-session',
        errorRecoveryMockLLMQuery,
        captureStatusUpdate
      );

      expect(result).toContain(
        'Successfully demonstrated comprehensive error handling'
      );

      // Verify status updates were captured (should include think and act updates)
      expect(statusUpdates.length).toBeGreaterThan(0);
      const types = new Set(statusUpdates.map((u) => u.type));
      expect(types.has('think')).toBe(true);
      expect(types.has('act')).toBe(true);

      // Verify files that should exist after recovery
      const mem = harness.mem;
      const configExists = await mem.fileExists('non-existent-config.json');
      expect(configExists).toBe(true);

      const missingExists = await mem.fileExists('missing.md');
      expect(missingExists).toBe(true);

      // Verify content
      const configContent = await mem.readFile('non-existent-config.json');
      expect(configContent).toContain('test');
      expect(configContent).toContain('1.0.0');

      const missingContent = await mem.readFile('missing.md');
      expect(missingContent).toContain('Created after error');

      // Verify git commit was successful despite errors (plus initial .gitignore commit)
      const log = await harness.git.log();
      expect(log.all.length).toBe(2);
      expect(log.all[0]?.message).toBe(
        'feat: demonstrate error handling and recovery'
      );
    });
  });
});
````

## File: tests/unit/llm.test.ts
````typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { queryLLM, queryLLMWithRetries } from '../../src/core/llm';
import type { AppConfig } from '../../src/config';
import type { ChatMessage } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: 'Test response from LLM',
            },
          },
        ],
      }),
    status: 200,
    statusText: 'OK',
  })
);
global.fetch = mockFetch as jest.Mock;

const mockConfig: AppConfig = {
  openRouterApiKey: 'test-api-key',
  knowledgeGraphPath: '/test/path',
  llmModel: 'anthropic/claude-3-haiku-20240307',
  llmTemperature: 0.7,
  llmMaxTokens: 4000,
  sandboxTimeout: 10000,
  sandboxMemoryLimit: 100,
  gitUserName: 'Test User',
  gitUserEmail: 'test@example.com',
};

const mockHistory: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, world!' },
];

beforeEach(() => {
  (fetch as jest.Mock).mockClear();
});

describe('LLM Module', () => {
  describe('queryLLM', () => {
    it('should make a successful request to OpenRouter API', async () => {
      const response = await queryLLM(mockHistory, mockConfig);

      expect(response).toBe('Test response from LLM');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/rec/ursa', // Referer is required by OpenRouter
            'X-Title': 'Recursa',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3-haiku-20240307',
            messages: mockHistory,
            temperature: 0.7,
            max_tokens: 4000,
          }),
        })
      );
    });

    it('should handle API errors properly', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () =>
            Promise.resolve({
              error: { message: 'Invalid API key' },
            }),
        })
      );

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'OpenRouter API error: 401 Unauthorized'
      );
    });

    it('should handle malformed API responses', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invalid: 'response' }),
        })
      );

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'Invalid response format from OpenRouter API'
      );
    });

    it('should handle empty content in response', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: { content: '' },
                },
              ],
            }),
        })
      );

      await expect(queryLLM(mockHistory, mockConfig)).rejects.toThrow(
        'Empty content received from OpenRouter API'
      );
    });
  });

  describe('queryLLMWithRetries', () => {
    it('should retry on retryable errors', async () => {
      // First call fails with server error
      // Second call succeeds
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Server error' }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                choices: [
                  {
                    message: { content: 'Success after retry' },
                  },
                ],
              }),
          })
        );

      const response = await queryLLMWithRetries(mockHistory, mockConfig);

      expect(response).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors (4xx)', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () =>
            Promise.resolve({
              error: { message: 'Bad request' },
            }),
        })
      );

      await expect(
        queryLLMWithRetries(mockHistory, mockConfig)
      ).rejects.toThrow('OpenRouter API error: 400 Bad Request');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Should not retry
    });
  });
});
````

## File: tasks.md
````markdown
# Tasks

Based on plan UUID: a8e9f2d1-0c6a-4b3f-8e1d-9f4a6c7b8d9e

## Part 1: Purge `any` Types to Enforce Strict Type Safety

### Task 1.1: Harden Emitter with `unknown`

- **uuid**: b3e4f5a6-7b8c-4d9e-8f0a-1b2c3d4e5f6g
- **status**: done
- **job-id**: job-44fc2242
- **depends-on**: []
- **description**: In `createEmitter`, change the type of the `listeners` map value from `Listener<any>[]` to `Array<Listener<unknown>>`. In the `emit` function, apply a type assertion to the listener before invoking it. Change `listener(data)` to `(listener as Listener<Events[K]>)(data)`.
- **files**: src/lib/events.ts

### Task 1.2: Add Strict Types to MCP E2E Test

- **uuid**: a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d
- **status**: done
- **job-id**: job-44fc2242
- **depends-on**: []
- **description**: Import the `MCPResponse` and `MCPTool` types from `src/types/index.ts`. Change the signature of `readMessages` to return `AsyncGenerator<MCPResponse>` instead of `AsyncGenerator<any>`. In `readMessages`, cast the parsed JSON: `yield JSON.parse(line) as MCPResponse;`. In the test case `it("should initialize and list tools correctly")`, find the `process_query` tool with proper typing: `(listToolsResponse.value.result.tools as MCPTool[]).find((t: MCPTool) => t.name === "process_query")`.
- **files**: tests/e2e/mcp-protocol.test.ts

## Part 2: Abstract Test Environment Setup (DRY)

### Task 2.1: Create a `TestHarness` for Environment Management

- **uuid**: f6a5b4c3-2d1e-4b9c-8a7f-6e5d4c3b2a1f
- **status**: done
- **job-id**: job-b2ec7d18
- **depends-on**: []
- **description**: Create a new directory `tests/lib` and file `tests/lib/test-harness.ts`. Implement and export an async function `setupTestEnvironment()` that creates a temp directory, initializes a git repo, and returns `{ testGraphPath, cleanup, reset }`. The `cleanup` function should delete the temp directory (`for afterAll`). The `reset` function should clean the directory contents and re-initialize git (`for beforeEach`).
- **files**: tests/lib/test-harness.ts (new)

### Task 2.2: Refactor Integration and E2E Tests to Use the Harness

- **uuid**: e5d4c3b2-a1f6-4a9b-8c7d-6b5c4d3e2a1f
- **status**: done
- **job-id**: job-b2ec7d18
- **depends-on**: [f6a5b4c3-2d1e-4b9c-8a7f-6e5d4c3b2a1f]
- **description**: In each test file, import `setupTestEnvironment` from `../lib/test-harness.ts`. Replace the manual `beforeAll`, `afterAll`, and `beforeEach` logic for directory and git management with calls to `setupTestEnvironment`, `cleanup`, and `reset`. Ensure variables like `tempDir`, `testGraphPath`, and `mockConfig` are updated to use the values returned from the harness.
- **files**: tests/integration/mem-api.test.ts, tests/integration/workflow.test.ts, tests/e2e/agent-workflow.test.ts

## Part 3: Consolidate Mock LLM Utility (DRY)

### Task 3.1: Add Shared `createMockQueryLLM` to Test Harness

- **uuid**: b1a0c9d8-e7f6-4a5b-9c3d-2e1f0a9b8c7d
- **status**: done
- **job-id**: job-11bd80d6
- **depends-on**: [f6a5b4c3-2d1e-4b9c-8a7f-6e5d4c3b2a1f]
- **description**: Open `tests/lib/test-harness.ts`. Add and export a new function `createMockQueryLLM(responses: string[])`. This function should accept an array of strings and return a mock function compatible with the `queryLLM` parameter in `handleUserQuery`. The returned mock should cycle through the `responses` array on each call and throw an error if called more times than responses are available.
- **files**: tests/lib/test-harness.ts

### Task 3.2: Refactor Tests to Use Shared LLM Mock

- **uuid**: a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d
- **status**: done
- **job-id**: job-11bd80d6
- **depends-on**: [b1a0c9d8-e7f6-4a5b-9c3d-2e1f0a9b8c7d]
- **description**: In `tests/integration/workflow.test.ts`, remove the local `createMockLLMQuery` function. In `tests/e2e/agent-workflow.test.ts`, remove the local `createMockQueryLLM` function. In both files, import the new `createMockQueryLLM` from `../lib/test-harness.ts`. Update all call sites to use the imported mock generator.
- **files**: tests/integration/workflow.test.ts, tests/e2e/agent-workflow.test.ts

## Audit Task

### Task A.1: Final Audit and Merge

- **uuid**: audit-001
- **status**: todo
- **job-id**:
- **depends-on**: [b3e4f5a6-7b8c-4d9e-8f0a-1b2c3d4e5f6g, a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d, f6a5b4c3-2d1e-4b9c-8a7f-6e5d4c3b2a1f, e5d4c3b2-a1f6-4a9b-8c7d-6b5c4d3e2a1f, b1a0c9d8-e7f6-4a5b-9c3d-2e1f0a9b8c7d, a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d]
- **description**: Merge every job-\* branch. Lint & auto-fix entire codebase. Run full test suite → 100% pass. Commit 'chore: final audit & lint'.
````

## File: repomix.config.json
````json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 52428800
  },
  "output": {
    "filePath": "repo/repomix.md",
    "style": "markdown",
    "parsableStyle": true,
    "fileSummary": false,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "compress": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": true,
    "includeFullDirectoryStructure": false,
    "tokenCountTree": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false,
      "includeLogs": false,
      "includeLogsCount": 50
    }
  },
  "include": [],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": [
      ".relay/",
      "agent-spawner.claude.md",
      "agent-spawner.droid.md",
      "AGENTS.md",
      "repo",
      "prompt"
      //   "tests"
    ]
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}
````

## File: src/core/mem-api/file-ops.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';
import { resolveSecurePath, validatePathBounds } from './secure-path.js';
import platform from '../../lib/platform.js';

// Note: Each function here is a HOF that takes dependencies (like graphRoot)
// and returns the actual function to be exposed on the mem API.

/**
 * Cross-platform file operation utilities with enhanced error handling
 */

/**
 * Atomic file write with temporary file and proper cleanup
 */
const atomicWriteFile = async (filePath: string, content: string): Promise<void> => {
  const tempPath = filePath + '.tmp.' + Math.random().toString(36).substr(2, 9);

  try {
    // Write to temporary file first
    await fs.writeFile(tempPath, content, 'utf-8');

    // On Windows, we need to handle file locking differently
    if (platform.isWindows) {
      // Try to rename, if it fails due to locking, wait and retry
      let retries = 3;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          await fs.rename(tempPath, filePath);
          return; // Success
        } catch (error: unknown) {
          lastError = error as Error;
          if (hasErrorCode(error) && (error.code === 'EBUSY' || error.code === 'EPERM')) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
            continue;
          }
          throw error; // Re-throw non-locking errors
        }
      }
      throw lastError;
    } else {
      // Unix-like systems can usually rename directly
      await fs.rename(tempPath, filePath);
    }
  } catch (error) {
    // Clean up temp file if something went wrong
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
};

/**
 * Type guard to check if error has a code property
 */
const hasErrorCode = (error: unknown): error is Error & { code?: string } => {
  return error instanceof Error && 'code' in error;
};

/**
 * Enhanced error handler for file operations
 */
const handleFileError = (error: unknown, operation: string, filePath: string): Error => {
  const nodeError = error as NodeJS.ErrnoException;

  // Handle platform-specific errors
  if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
    if (platform.isWindows) {
      return new Error(`Permission denied for ${operation} on ${filePath}. The file may be in use or you may need administrator privileges.`);
    }
    if (platform.isTermux) {
      return new Error(`Permission denied for ${operation} on ${filePath}. Check Termux storage permissions.`);
    }
    return new Error(`Permission denied for ${operation} on ${filePath}. Check file permissions.`);
  }

  if (nodeError.code === 'EMFILE' || nodeError.code === 'ENFILE') {
    return new Error(`Too many files open for ${operation} on ${filePath}. Close some files and try again.`);
  }

  if (nodeError.code === 'ENOSPC') {
    return new Error(`No space left on device for ${operation} on ${filePath}.`);
  }

  if (nodeError.code === 'EROFS') {
    return new Error(`Read-only file system: Cannot perform ${operation} on ${filePath}.`);
  }

  if (nodeError.code === 'EBUSY') {
    return new Error(`Resource busy: Cannot perform ${operation} on ${filePath} as it is in use.`);
  }

  return new Error(`Failed to ${operation.toLowerCase()} ${filePath}: ${nodeError.message}`);
};

/**
 * Ensure parent directories exist with proper error handling
 */
const ensureParentDirectories = async (filePath: string): Promise<void> => {
  const dir = path.dirname(filePath);

  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error: unknown) {
    if (hasErrorCode(error) && error.code !== 'EEXIST') {
      throw handleFileError(error, 'create parent directories', dir);
    }
  }
};

export const readFile =
  (graphRoot: string) =>
  async (filePath: string): Promise<string> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation for symlink safety
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: true })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw handleFileError(error, 'read file', filePath);
    }
  };

export const writeFile =
  (graphRoot: string) =>
  async (filePath: string, content: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation - allow non-existent files for write operations
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false, requireExistence: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      // Ensure parent directories exist
      await ensureParentDirectories(fullPath);

      // Use atomic write for data safety
      await atomicWriteFile(fullPath, content);
      return true;
    } catch (error) {
      throw handleFileError(error, 'write file', filePath);
    }
  };

export const updateFile =
  (graphRoot: string) =>
  async (
    filePath: string,
    oldContent: string,
    newContent: string
  ): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      // Atomically read and compare the file content.
      const currentContent = await fs.readFile(fullPath, 'utf-8');

      // This is a Compare-and-Swap (CAS) operation.
      // If the content on disk is not what the agent *thinks* it is,
      // another process (or agent turn) has modified it. We must abort.
      if (currentContent !== oldContent) {
        throw new Error(
          `File content has changed since it was last read for ${filePath}. Update aborted to prevent data loss.`
        );
      }

      // Write the new content back using atomic write.
      await atomicWriteFile(fullPath, newContent);
      return true;
    } catch (error) {
      throw handleFileError(error, 'update file', filePath);
    }
  };

export const deletePath =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${filePath}`);
      }

      await fs.rm(fullPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      throw handleFileError(error, 'delete path', filePath);
    }
  };

export const rename =
  (graphRoot: string) =>
  async (oldPath: string, newPath: string): Promise<boolean> => {
    const fullOldPath = resolveSecurePath(graphRoot, oldPath);
    const fullNewPath = resolveSecurePath(graphRoot, newPath);

    try {
      // Additional validation for both paths
      if (!validatePathBounds(graphRoot, fullOldPath, { followSymlinks: false }) ||
          !validatePathBounds(graphRoot, fullNewPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for rename operation`);
      }

      // Ensure parent directory of new path exists
      await ensureParentDirectories(fullNewPath);

      await fs.rename(fullOldPath, fullNewPath);
      return true;
    } catch (error) {
      throw handleFileError(error, `rename ${oldPath} to ${newPath}`, oldPath);
    }
  };

export const fileExists =
  (graphRoot: string) =>
  async (filePath: string): Promise<boolean> => {
    try {
      // resolveSecurePath will throw a SecurityError on traversal attempts.
      // fs.access will throw an error if the file doesn't exist.
      // Both should result in `false`.
      const fullPath = resolveSecurePath(graphRoot, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      // Any error (security, not found, permissions) results in false.
      return false;
    }
  };

export const createDir =
  (graphRoot: string) =>
  async (directoryPath: string): Promise<boolean> => {
    const fullPath = resolveSecurePath(graphRoot, directoryPath);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: false })) {
        throw new Error(`Security violation: Path validation failed for ${directoryPath}`);
      }

      await fs.mkdir(fullPath, { recursive: true });
      return true;
    } catch (error) {
      throw handleFileError(error, 'create directory', directoryPath);
    }
  };

export const listFiles =
  (graphRoot: string) =>
  async (directoryPath?: string): Promise<string[]> => {
    const targetDir = directoryPath ? directoryPath : '.';
    const fullPath = resolveSecurePath(graphRoot, targetDir);

    try {
      // Additional validation
      if (!validatePathBounds(graphRoot, fullPath, { followSymlinks: true })) {
        throw new Error(`Security violation: Path validation failed for directory ${directoryPath || 'root'}`);
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((entry) => entry.name).sort(); // Sort for consistent ordering
    } catch (error) {
      throw handleFileError(error, `list files in directory`, directoryPath || 'root');
    }
  };
````

## File: tests/e2e/agent-workflow.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  beforeEach,
} from '@jest/globals';
import { handleUserQuery } from '../../src/core/loop';
import type { AppConfig } from '../../src/config';
import {
  createTestHarness,
  cleanupTestHarness,
  createMockQueryLLM,
  type TestHarnessState,
} from '../lib/test-harness';

describe('Agent End-to-End Workflow', () => {
  let appConfig: AppConfig;
  let harness: TestHarnessState;

  beforeAll(() => {
    // Create a mock config for E2E tests to avoid environment variable dependencies
    appConfig = {
      openRouterApiKey: 'test-api-key',
      knowledgeGraphPath: '/tmp/test-knowledge-graph',
      llmModel: 'test-model',
      llmTemperature: 0.7,
      llmMaxTokens: 4000,
      sandboxTimeout: 10000,
      sandboxMemoryLimit: 100,
      gitUserName: 'Test User',
      gitUserEmail: 'test@example.com',
    };
  });

  beforeEach(async () => {
    // Create a test harness that inherits from real config but uses temp directory
    harness = await createTestHarness({
      apiKey: appConfig.openRouterApiKey,
      model: appConfig.llmModel,
      gitUserName: appConfig.gitUserName,
      gitEmail: appConfig.gitUserEmail,
    });
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should correctly handle the Dr. Aris Thorne example from the docs', async () => {
    // 1. SETUP
    // Define the multi-turn LLM responses as XML strings based on the example.
    const turn1Response = `<think>Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.</think>
<typescript>
const orgPath = 'AI Research Institute.md';
const orgExists = await mem.fileExists(orgPath);
if (!orgExists) {
  await mem.writeFile(orgPath, '# AI Research Institute\\ntype:: organization\\n');
}
await mem.writeFile('Dr. Aris Thorne.md', '# Dr. Aris Thorne\\ntype:: person\\naffiliation:: [[AI Research Institute]]\\nfield:: [[Symbolic Reasoning]]');
</typescript>`;
    const turn2Response = `<think>Okay, I'm saving those changes to your permanent knowledge base.</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>
Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.
</reply>`;

    // Create a mock LLM function for this specific test case.
    const mockQueryLLM = createMockQueryLLM([turn1Response, turn2Response]);

    // 2. EXECUTE
    // Call the main loop with the user query and the mocked LLM function.
    const query =
      'I just had a call with a Dr. Aris Thorne from the AI Research Institute. He works on symbolic reasoning. Create a new entry for him and link it to his affiliation.';
    const finalReply = await handleUserQuery(
      query,
      harness.mockConfig,
      undefined,
      mockQueryLLM
    );

    // 3. ASSERT
    // Assert the final user-facing reply is correct.
    expect(finalReply).toBe(
      "Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them."
    );

    // Verify file creation. Check that 'Dr. Aris Thorne.md' and 'AI Research Institute.md' exist.
    const thorneExists = await harness.mem.fileExists('Dr. Aris Thorne.md');
    const orgExists = await harness.mem.fileExists('AI Research Institute.md');

    expect(thorneExists).toBe(true);
    expect(orgExists).toBe(true);

    // Verify file content. Read 'Dr. Aris Thorne.md' and check for `affiliation:: [[AI Research Institute]]`.
    const thorneContent = await harness.mem.readFile('Dr. Aris Thorne.md');
    expect(thorneContent).toContain('affiliation:: [[AI Research Institute]]');
    expect(thorneContent).toContain('field:: [[Symbolic Reasoning]]');

    // Verify the git commit. Use `simple-git` to check the log of the test repo.
    const log = await harness.git.log({ maxCount: 1 });
    expect(log.latest?.message).toBe(
      'feat: Add Dr. Aris Thorne and AI Research Institute entities'
    );
  });
});
````

## File: package.json
````json
{
  "name": "recursa-server",
  "version": "0.1.0",
  "description": "Git-Native AI agent with MCP protocol support",
  "type": "module",
  "scripts": {
    "start": "node dist/server.js",
    "start:termux": "npm run start",
    "start:standard": "npm run start",
    "build": "tsc",
    "build:auto": "node scripts/build.js",
    "build:termux": "node scripts/build.js termux",
    "build:standard": "node scripts/build.js standard",
    "dev": "tsx watch src/server.ts",
    "dev:termux": "npm run dev",
    "dev:standard": "npm run dev",
    "test": "jest",
    "lint": "eslint 'src/**/*.ts' 'scripts/**/*.js' 'tests/**/*.ts'",
    "install:auto": "node scripts/install.js",
    "install:termux": "node scripts/install.js termux",
    "install:standard": "node scripts/install.js standard",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "fastmcp": "^1.21.0",
    "dotenv": "^16.4.5",
    "simple-git": "^3.20.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@types/expect": "^1.20.4",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^8.46.4",
    "@typescript-eslint/parser": "^8.46.4",
    "eslint": "^9.39.1",
    "jest": "^29.7.0",
    "jest-extended": "^4.0.2",
    "ts-jest": "^29.1.2",
    "tsx": "^4.7.2",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
````

## File: src/core/loop.ts
````typescript
import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage } from '../types';
import { logger } from '../lib/logger.js';
import { queryLLMWithRetries as defaultQueryLLM } from './llm.js';
import { parseLLMResponse } from './parser.js';
import { runInSandbox } from './sandbox.js';
import { createMemAPI } from './mem-api/index.js';
import { promises as fs } from 'fs';
import path from 'path';

// Helper functions for session management
const getSessionPath = async (
  sessionId: string,
  graphRoot: string,
): Promise<string> => {
  const sessionDir = path.join(graphRoot, '.sessions');
  // Ensure the session directory exists
  await fs.mkdir(sessionDir, { recursive: true });
  return path.join(sessionDir, `${sessionId}.json`);
};

const loadSessionHistory = async (
  sessionId: string,
  graphRoot: string,
): Promise<ChatMessage[] | null> => {
  const sessionFile = await getSessionPath(sessionId, graphRoot);
  try {
    const data = await fs.readFile(sessionFile, 'utf-8');
    return JSON.parse(data) as ChatMessage[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist, new session
    }
    throw error; // Other errors should be thrown
  }
};

const saveSessionHistory = async (
  sessionId: string,
  graphRoot: string,
  history: ChatMessage[],
): Promise<void> => {
  const sessionFile = await getSessionPath(sessionId, graphRoot);
  await fs.writeFile(sessionFile, JSON.stringify(history, null, 2), 'utf-8');
};

let systemPromptMessage: ChatMessage | null = null;

const getSystemPrompt = async (): Promise<ChatMessage> => {
  // This function reads the system prompt from disk on its first call and caches it.
  // This is a form of lazy-loading and ensures the file is read only once.
  if (systemPromptMessage) {
    return systemPromptMessage;
  }

  try {
    // Resolve the path to 'docs/system-prompt.md' from the project root.
    const promptPath = path.resolve(process.cwd(), 'docs/system-prompt.md');

    // Read the file content asynchronously.
    const systemPromptContent = await fs.readFile(promptPath, 'utf-8');

    // Create the ChatMessage object and store it in `systemPromptMessage`.
    systemPromptMessage = {
      role: 'system',
      content: systemPromptContent.trim(),
    };

    logger.info('System prompt loaded successfully', { path: promptPath });
    return systemPromptMessage;
  } catch (error) {
    // If file read fails, log a critical error and exit, as the agent cannot run without it.
    const errorMessage = 'Failed to load system prompt file';
    logger.error(errorMessage, error as Error, {
      path: path.resolve(process.cwd(), 'docs/system-prompt.md'),
    });

    // Throw an error to be caught by the server's main function
    throw new Error(errorMessage, { cause: error });
  }
};

export const handleUserQuery = async (
  query: string,
  config: AppConfig,
  sessionId: string,
  runId: string,
  // Allow overriding the LLM query function (with its retry logic) for testing purposes
  queryLLM: ((
    history: ChatMessage[],
    config: AppConfig
  ) => Promise<string | unknown>) = defaultQueryLLM,
  streamContent: (content: { type: 'text'; text: string }) => Promise<void>
): Promise<string> => {
  // 1. **Initialization**
  logger.info('Starting user query handling', {
    runId,
    sessionId: sessionId,
  });

  const memAPI = createMemAPI(config);

  // Initialize or retrieve session history
  const loadedHistory = await loadSessionHistory(sessionId, config.knowledgeGraphPath);
  const history = loadedHistory || [await getSystemPrompt()];
  history.push({ role: 'user', content: query });

  const context: ExecutionContext = {
    history,
    memAPI,
    config,
    runId,
    streamContent,
  };

  // 2. **Execution Loop**
  const MAX_TURNS = 10;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    logger.info(`Starting turn ${turn + 1}`, { runId, turn: turn + 1 });

    // **Call LLM**
    const llmResponseStr = (await queryLLM(context.history, config)) as string;
    context.history.push({ role: 'assistant', content: llmResponseStr });

    // **Parse**
    const parsedResponse = parseLLMResponse(llmResponseStr);

    // Debug logging to see what was parsed
    logger.info('Parsed LLM response', {
      runId,
      parsed: {
        think: !!parsedResponse.think,
        typescript: !!parsedResponse.typescript,
        reply: !!parsedResponse.reply,
      },
    });

    if (
      !parsedResponse.think &&
      !parsedResponse.typescript &&
      !parsedResponse.reply
    ) {
      logger.error('Failed to parse LLM response', undefined, {
        runId,
        llmResponseStr: llmResponseStr as string,
      });
      return 'Error: Could not understand the response from the AI.';
    }

    // **Think**
    if (parsedResponse.think) {
      logger.info('Agent is thinking', {
        runId,
        thought: parsedResponse.think,
      });

      // Stream the "thought" back to the client.
      await streamContent({ type: 'text', text: `> ${parsedResponse.think}\n\n` });
    }

    // **Act**
    if (parsedResponse.typescript) {
      logger.info('Executing TypeScript code', { runId });

      try {
        logger.info('Running code in sandbox', { runId });
        const executionResult = await runInSandbox(
          parsedResponse.typescript,
          context.memAPI,
          config.sandboxTimeout
        );
        logger.info('Code executed successfully', {
          runId,
          // Safely serialize result for logging
          result: JSON.stringify(executionResult, null, 2),
        });
        const feedback = `[Execution Result]: Code executed successfully. Result: ${JSON.stringify(executionResult)}`;
        context.history.push({ role: 'user', content: feedback });
      } catch (e) {
        logger.error('Code execution failed', e as Error, { runId });
        const feedback = `[Execution Error]: Your code failed to execute. Error: ${
          (e as Error).message
        }. You must analyze this error and correct your code in the next turn.`;
        context.history.push({ role: 'user', content: feedback });
      }
    }

    // Persist history at the end of the turn
    await saveSessionHistory(sessionId, config.knowledgeGraphPath, context.history);

    // **Reply**
    if (parsedResponse.reply) {
      logger.info('Agent replied', { runId, reply: parsedResponse.reply });
      return parsedResponse.reply;
    }
  }

  // 3. **Termination**
  logger.warn('Loop finished without a reply', { runId, turns: MAX_TURNS });
  return 'The agent finished its work without providing a final response.';
};
````

## File: src/core/mem-api/graph-ops.ts
````typescript
import { promises as fs } from 'fs';
import path from 'path';
import type { GraphQueryResult } from '../../types';
import { resolveSecurePath } from './secure-path.js';
import { walk } from './fs-walker.js';
import { createIgnoreFilter } from '../../lib/gitignore-parser.js';

type PropertyCondition = {
  type: 'property';
  key: string;
  value: string;
};

type OutgoingLinkCondition = {
  type: 'outgoing-link';
  target: string;
};

type Condition = PropertyCondition | OutgoingLinkCondition;

const parseCondition = (conditionStr: string): Condition | null => {
  const propertyRegex = /^\(property\s+([^:]+?)::\s*(.+?)\)$/;
  let match = conditionStr.trim().match(propertyRegex);
  if (match?.[1] && match[2]) {
    return {
      type: 'property',
      key: match[1].trim(),
      value: match[2].trim(),
    };
  }

  const linkRegex = /^\(outgoing-link\s+\[\[(.+?)\]\]\)$/;
  match = conditionStr.trim().match(linkRegex);
  if (match?.[1]) {
    return {
      type: 'outgoing-link',
      target: match[1].trim(),
    };
  }

  return null;
};

const checkCondition = (content: string, condition: Condition): string[] => {
  const matches: string[] = [];
  if (condition.type === 'property') {
    const lines = content.split('\n');
    for (const line of lines) {
      // Handle indented properties by removing the leading list marker
      const trimmedLine = line.trim().replace(/^- /, '');
      if (trimmedLine === `${condition.key}:: ${condition.value}`) {
        matches.push(line);
      }
    }
  } else if (condition.type === 'outgoing-link') {
    const linkRegex = /\[\[(.*?)\]\]/g;
    const outgoingLinks = new Set(
      Array.from(content.matchAll(linkRegex), (m) => m[1])
    );
    if (outgoingLinks.has(condition.target)) {
      // Return a generic match since we don't have a specific line
      matches.push(`[[${condition.target}]]`);
    }
  }
  return matches;
};

export const queryGraph =
  (graphRoot: string) =>
  async (query: string): Promise<GraphQueryResult[]> => {
    const conditionStrings = query.split(/ AND /i);
    const conditions = conditionStrings
      .map(parseCondition)
      .filter((c): c is Condition => c !== null);

    if (conditions.length === 0) {
      return [];
    }

    const results: GraphQueryResult[] = [];
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const filePath of walk(graphRoot, isIgnored)) {
      if (!filePath.endsWith('.md')) continue;

      const content = await fs.readFile(filePath, 'utf-8');
      const allMatchingLines: string[] = [];
      let allConditionsMet = true;

      for (const condition of conditions) {
        const matchingLines = checkCondition(content, condition);
        if (matchingLines.length > 0) {
          allMatchingLines.push(...matchingLines);
        } else {
          allConditionsMet = false;
          break;
        }
      }

      if (allConditionsMet) {
        results.push({
          filePath: path.relative(graphRoot, filePath),
          matches: allMatchingLines,
        });
      }
    }
    return results;
  };

export const getBacklinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    const targetBaseName = path.basename(filePath, path.extname(filePath));
    const targetWithoutExt = path.basename(filePath, path.extname(filePath));
    const targetWithExt = path.basename(filePath);

    const backlinks: string[] = [];
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const currentFilePath of walk(graphRoot, isIgnored)) {
      // Don't link to self
      if (path.resolve(currentFilePath) === resolveSecurePath(graphRoot, filePath)) {
        continue;
      }

      if (currentFilePath.endsWith('.md')) {
        try {
          const content = await fs.readFile(currentFilePath, 'utf-8');
          // Extract all outgoing links from the current file
          const linkRegex = /\[\[(.*?)\]\]/g;
          const matches = content.matchAll(linkRegex);

          for (const match of matches) {
            if (match[1]) {
              const linkTarget = match[1].trim();
              // Check if this link points to our target file
              // Try matching against various possible formats:
              // - Exact basename without extension (e.g., "PageC")
              // - Exact basename with extension (e.g., "PageC.md")
              // - With spaces (e.g., "Page C" for "PageC")
              if (linkTarget === targetWithoutExt ||
                  linkTarget === targetWithExt ||
                  linkTarget.replace(/\s+/g, '') === targetWithoutExt ||
                  linkTarget.replace(/\s+/g, '') === targetWithExt) {
                backlinks.push(path.relative(graphRoot, currentFilePath));
                break; // Found a match, no need to check more links in this file
              }
            }
          }
        } catch {
          // Ignore files that can't be read
        }
      }
    }
    return backlinks;
  };

export const getOutgoingLinks =
  (graphRoot: string) =>
  async (filePath: string): Promise<string[]> => {
    const fullPath = resolveSecurePath(graphRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const linkRegex = /\[\[(.*?)\]\]/g;
    const matches = content.matchAll(linkRegex);
    const uniqueLinks = new Set<string>();

    for (const match of matches) {
      if (match[1]) {
        uniqueLinks.add(match[1]);
      }
    }
    return Array.from(uniqueLinks);
  };

export const searchGlobal =
  (graphRoot: string) =>
  async (query: string): Promise<string[]> => {
    const matchingFiles: string[] = [];
    const lowerCaseQuery = query.toLowerCase();
    const isIgnored = await createIgnoreFilter(graphRoot);

    for await (const filePath of walk(graphRoot, isIgnored)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.toLowerCase().includes(lowerCaseQuery)) {
          matchingFiles.push(path.relative(graphRoot, filePath));
        }
      } catch {
        // Ignore binary files or files that can't be read
      }
    }
    return matchingFiles;
  };
````

## File: src/core/sandbox.ts
````typescript
import { createContext, runInContext } from 'node:vm';
import type { MemAPI } from '../types/mem';
import { logger } from '../lib/logger.js';

/**
 * Executes LLM-generated TypeScript code in a secure, isolated sandbox.
 * @param code The TypeScript code snippet to execute.
 * @param memApi The MemAPI instance to expose to the sandboxed code.
 * @returns The result of the code execution.
 */
export const runInSandbox = async (
  code: string,
  memApi: MemAPI,
  timeout = 10000
): Promise<unknown> => {
  // Create a sandboxed context with the mem API and only essential globals
  const context = createContext({
    mem: memApi,
    // Essential JavaScript globals
    console: {
      log: (...args: unknown[]) =>
        logger.info('Sandbox console.log', { arguments: args }),
      error: (...args: unknown[]) =>
        logger.error('Sandbox console.error', undefined, {
          arguments: args,
        }),
      warn: (...args: unknown[]) =>
        logger.warn('Sandbox console.warn', { arguments: args }),
    },
    // Promise and async support
    Promise,
    setTimeout: (fn: () => void, delay: number) => {
      if (delay > 1000) {
        throw new Error('Timeout too long');
      }
      return setTimeout(fn, Math.min(delay, 10000));
    },
    clearTimeout,
    // Basic types and constructors
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON,
    RegExp,
    Error,
  });

  // Wrap the user code in an async IIFE to allow top-level await.
  // Ensure the code is properly formatted and doesn't have syntax errors
  const wrappedCode = `(async () => {
${code}
  })();`;

  try {
    logger.debug('Executing code in sandbox', { code, timeout });
    const result = await runInContext(wrappedCode, context, {
      timeout, // Use provided timeout
      displayErrors: true,
    });
    logger.debug('Sandbox execution successful', {
      result,
      type: typeof result,
    });
    return result;
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('Error executing sandboxed code', error as Error, { 
      code,
      wrappedCode: wrappedCode.substring(0, 800) + '...' // Log first 800 chars for debugging
    });
    
    // Provide more specific error messages for common issues
    if (errorMessage.includes('Invalid or unexpected token')) {
      throw new Error(`Sandbox execution failed: Syntax error in code. This usually indicates unescaped quotes or malformed JavaScript. Original error: ${errorMessage}`);
    } else if (errorMessage.includes('timeout')) {
      throw new Error(`Sandbox execution failed: Code execution timed out after ${timeout}ms`);
    } else {
      throw new Error(`Sandbox execution failed: ${errorMessage}`);
    }
  }
};
````

## File: src/server.ts
````typescript
import { handleUserQuery } from './core/loop.js';
import { logger } from './lib/logger.js';
import { loadAndValidateConfig } from './config.js';
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Create FastMCP server
    const server = new FastMCP({
      name: 'recursa-server',
      version: '0.1.0',
      authenticate: async (request) => {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;

        if (!token || token !== config.recursaApiKey) {
          logger.warn('Authentication failed', {
            remoteAddress: (request as any).socket?.remoteAddress, // Best effort IP logging
          });
          throw new Response(null, {
            status: 401,
            statusText: 'Unauthorized',
          });
        }

        // Return an empty object for success, as we don't need to store user data in the session context itself
        return {};
      },
    });

    // 3. Add resources
    server.addResource({
      uri: `file://${config.knowledgeGraphPath}`,
      name: 'Knowledge Graph Root',
      mimeType: 'text/directory',
      description: 'Root directory of the knowledge graph',
      async load() {
        return {
          text: `This resource represents the root of the knowledge graph at ${config.knowledgeGraphPath}. It cannot be loaded directly.`,
        };
      },
    });

    // 4. Add tools
    server.addTool({
      name: 'process_query',
      description:
        'Processes a high-level user query by running the agent loop.',
      parameters: z.object({
        query: z.string().describe('The user query to process.'),
      }),
      annotations: {
        streamingHint: true,
      },
      execute: async (args, { log, sessionId, requestId, streamContent }) => {
        if (!sessionId) {
          throw new UserError(
            'Session ID is missing. This tool requires a session.'
          );
        }
        if (!requestId) {
          throw new UserError(
            'Request ID is missing. This tool requires a request ID.'
          );
        }

        try {
          const finalReply = await handleUserQuery(
            args.query,
            config,
            sessionId,
            requestId,
            streamContent
          );

          return finalReply;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log.error(`Error in process_query: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
          throw new UserError(errorMessage);
        }
      },
    });

    // 5. Start the server
    await server.start({
      transportType: 'httpStream',
      httpStream: { port: config.httpPort },
    });

    logger.info(
      `Recursa MCP Server is running and listening on http://localhost:${config.httpPort}`
    );
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

main();
````
