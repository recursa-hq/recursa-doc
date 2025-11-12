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