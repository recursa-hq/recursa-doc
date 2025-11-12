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