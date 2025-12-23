/**
 * Macaques Backend Bootstrap
 *
 * Initializes the Macaques backend extension system.
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import glob from 'fast-glob';
import type { BackendOptions, PatchManifest } from '../shared/types.js';
import { loadManifest, logger } from '../shared/utils.js';
import { applyPatches, serviceRegistry } from './service-registry.js';

/**
 * Options for bootstrapping Macaques backend
 */
interface BootstrapOptions extends BackendOptions {
  /**
   * Patterns to find extension files
   * @default ['services/*.ext.ts', 'services/*.ext.js']
   */
  servicePatterns?: string[];

  /**
   * Patterns to find module files
   * @default ['modules/* /index.ts', 'modules/* /*.module.ts']
   */
  modulePatterns?: string[];

  /**
   * Patterns to find controller files
   * @default ['controllers/*.controller.ts']
   */
  controllerPatterns?: string[];
}

/**
 * Result of the bootstrap process
 */
interface BootstrapResult {
  /** Number of service extensions loaded */
  serviceExtensions: number;

  /** Number of modules loaded */
  modules: number;

  /** Number of controllers loaded */
  controllers: number;

  /** The loaded manifest, if any */
  manifest: PatchManifest | null;
}

/**
 * Bootstrap the Macaques backend extensions
 *
 * This function:
 * 1. Loads the manifest (if present)
 * 2. Discovers and imports extension files
 * 3. Does NOT apply patches (that happens later via applyPatches)
 *
 * @example
 * ```typescript
 * import { bootstrap } from '@n8n-soar/macaques/backend';
 *
 * // In your custom start command
 * async init() {
 *   await bootstrap({
 *     extensionsDir: './extensions',
 *     n8nDir: './n8n',
 *   });
 *
 *   // Now apply the patches
 *   applyPatches(Container);
 *
 *   // Continue with normal n8n startup
 *   await super.init();
 * }
 * ```
 */
export async function bootstrap(options: BootstrapOptions): Promise<BootstrapResult> {
  const {
    extensionsDir,
    n8nDir,
    verbose = false,
    servicePatterns = ['services/**/*.ext.ts', 'services/**/*.ext.js'],
    modulePatterns = ['modules/*/index.ts', 'modules/*/*.module.ts'],
    controllerPatterns = ['controllers/**/*.controller.ts', 'controllers/**/*.controller.js'],
  } = options;

  const backendExtensionsDir = resolve(extensionsDir, 'backend');

  // Check if extensions directory exists
  if (!existsSync(backendExtensionsDir)) {
    logger.warn(`Backend extensions directory not found: ${backendExtensionsDir}`);
    return {
      serviceExtensions: 0,
      modules: 0,
      controllers: 0,
      manifest: null,
    };
  }

  logger.info('Bootstrapping backend extensions...');

  // Load manifest
  const manifestPath = options.manifestPath || resolve(backendExtensionsDir, 'patches.manifest.json');
  const manifest = loadManifest(manifestPath);

  if (manifest && verbose) {
    logger.info(`Loaded manifest: ${manifest.patches.length} patches declared`);
  }

  // Discover and import service extensions
  const serviceFiles = await glob(servicePatterns, {
    cwd: backendExtensionsDir,
    absolute: true,
  });

  for (const file of serviceFiles) {
    if (verbose) {
      logger.info(`Loading service extension: ${file}`);
    }
    await import(file);
  }

  // Discover and import modules
  const moduleFiles = await glob(modulePatterns, {
    cwd: backendExtensionsDir,
    absolute: true,
  });

  for (const file of moduleFiles) {
    if (verbose) {
      logger.info(`Loading module: ${file}`);
    }
    await import(file);
  }

  // Discover and import controllers
  const controllerFiles = await glob(controllerPatterns, {
    cwd: backendExtensionsDir,
    absolute: true,
  });

  for (const file of controllerFiles) {
    if (verbose) {
      logger.info(`Loading controller: ${file}`);
    }
    await import(file);
  }

  const result: BootstrapResult = {
    serviceExtensions: serviceFiles.length,
    modules: moduleFiles.length,
    controllers: controllerFiles.length,
    manifest,
  };

  logger.success(
    `Loaded ${result.serviceExtensions} service extensions, ` +
      `${result.modules} modules, ${result.controllers} controllers`
  );

  return result;
}

/**
 * Convenience function that bootstraps and applies patches
 *
 * @example
 * ```typescript
 * import { Container } from '@n8n/di';
 * import { initializeExtensions } from '@n8n-soar/macaques/backend';
 *
 * async init() {
 *   await initializeExtensions({
 *     extensionsDir: './extensions',
 *     n8nDir: './n8n',
 *   }, Container);
 *
 *   await super.init();
 * }
 * ```
 */
export async function initializeExtensions(
  options: BootstrapOptions,
  container: { get: <T>(type: new (...args: unknown[]) => T) => T; set: <T>(type: new (...args: unknown[]) => T, instance: T) => void }
): Promise<BootstrapResult> {
  const result = await bootstrap(options);

  // Apply the patches that were registered during import
  applyPatches(container);

  return result;
}

// Re-export from service-registry for convenience
export { applyPatches, registerPatch, serviceRegistry } from './service-registry.js';
