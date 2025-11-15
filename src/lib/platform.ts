/**
 * Platform detection and utilities for cross-platform compatibility
 */

import path from 'path';
import { existsSync, readFileSync } from 'fs';

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
      existsSync('/proc/version') &&
      readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft')
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
    const normalized = path.normalize(p);
    if (this.isWindows) {
      return normalized.replace(/\//g, '\\');
    }
    return normalized.replace(/\\/g, '/');
  },

  /** Check if path is absolute */
  isAbsolute(p: string): boolean {
    if (this.isWindows) {
      return /^[A-Za-z]:\\|\\\\/.test(p) || path.isAbsolute(p);
    }
    return path.isAbsolute(p);
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