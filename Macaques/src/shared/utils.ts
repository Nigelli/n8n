/**
 * Macaques Shared Utilities
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import pc from 'picocolors';
import type { PatchManifest } from './types.js';

/**
 * Logger with Macaques branding
 */
export const logger = {
  prefix: pc.magenta('[Macaques]'),

  info(message: string): void {
    console.log(`${this.prefix} ${message}`);
  },

  success(message: string): void {
    console.log(`${this.prefix} ${pc.green('✓')} ${message}`);
  },

  warn(message: string): void {
    console.warn(`${this.prefix} ${pc.yellow('⚠')} ${message}`);
  },

  error(message: string): void {
    console.error(`${this.prefix} ${pc.red('✗')} ${message}`);
  },

  override(source: string, target?: string): void {
    if (target) {
      console.log(`${this.prefix} ${pc.cyan('Override:')} ${source} ${pc.dim('→')} ${target}`);
    } else {
      console.log(`${this.prefix} ${pc.cyan('Override:')} ${source}`);
    }
  },

  patch(service: string, methods?: string[]): void {
    if (methods && methods.length > 0) {
      console.log(
        `${this.prefix} ${pc.cyan('Patched:')} ${service} ${pc.dim(`[${methods.join(', ')}]`)}`
      );
    } else {
      console.log(`${this.prefix} ${pc.cyan('Patched:')} ${service}`);
    }
  },
};

/**
 * Load and parse a manifest file
 */
export function loadManifest(manifestPath: string): PatchManifest | null {
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content) as PatchManifest;
  } catch (error) {
    logger.error(`Failed to parse manifest: ${manifestPath}`);
    return null;
  }
}

/**
 * Find a file with any of the given extensions
 */
export function findFileWithExtensions(
  basePath: string,
  extensions: string[] = ['', '.ts', '.tsx', '.js', '.jsx', '.vue']
): string | null {
  for (const ext of extensions) {
    const fullPath = basePath + ext;
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Resolve an aliased import path to a file system path
 */
export function resolveAliasedPath(
  source: string,
  aliasPrefix: string,
  targetDir: string
): string | null {
  if (!source.startsWith(aliasPrefix + '/')) {
    return null;
  }

  const relativePath = source.slice(aliasPrefix.length + 1);
  return resolve(targetDir, relativePath);
}

/**
 * Check if a path is within a directory
 */
export function isPathWithin(filePath: string, directory: string): boolean {
  const resolvedFile = resolve(filePath);
  const resolvedDir = resolve(directory);
  return resolvedFile.startsWith(resolvedDir);
}
