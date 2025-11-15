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