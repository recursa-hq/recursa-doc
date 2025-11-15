# Recursa MCP Server

A Git-Native AI agent with MCP (Model Context Protocol) support that works across multiple platforms.

## 🌟 Cross-Platform Support

✅ **Linux, macOS, Windows (WSL2), Termux/Android**
📱 **Mobile-optimized** with conservative resource limits
🔒 **Enhanced security** with cross-platform path protection
⚡ **Auto-detecting** platform detection and optimization

## 🚀 Getting Started

### Automatic Installation (Recommended)
```bash
# Clone and install with automatic platform detection
git clone https://github.com/your-repo/recursa-doc.git
cd recursa-doc
npm run install:auto
npm run build:auto
npm run dev
```

Your server is now running on `http://localhost:8080` (or the port specified in your `.env` file).

### Interacting with the Server

Recursa is a `fastmcp` server. You can interact with it using any MCP-compatible client, including the command-line tools that come with `fastmcp`.

#### Authentication

All requests to the server must be authenticated. You need to provide the `RECURSA_API_KEY` from your `.env` file as a bearer token.

When using `fastmcp` tools, you can set the key via an environment variable:

```bash
export RECURSA_API_KEY="a-very-secret-key"
```

#### Testing with the Interactive CLI

The `fastmcp dev` command is the quickest way to test your server. It starts your server and connects an interactive client in your terminal.

```bash
# Make sure your RECURSA_API_KEY is exported
npx fastmcp dev src/server.ts
```

#### Inspecting with the Web UI

For a more visual way to explore your server's tools and capabilities, use the `fastmcp inspect` command.

```bash
# Make sure your RECURSA_API_KEY is exported
npx fastmcp inspect src/server.ts

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

# Required: API key for securing the Recursa server endpoint
RECURSA_API_KEY=a-very-secret-key

# Optional: Port for the HTTP server
HTTP_PORT=8080

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