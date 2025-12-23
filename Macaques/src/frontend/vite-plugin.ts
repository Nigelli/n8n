/**
 * Macaques Vite Plugin
 *
 * Intercepts module resolution to enable file-level overrides
 * of n8n frontend components.
 */

import type { Plugin, ResolvedConfig } from 'vite';
import { resolve } from 'path';
import type { FrontendOptions, PatchManifest } from '../shared/types.js';
import { findFileWithExtensions, loadManifest, logger } from '../shared/utils.js';

/**
 * Statistics tracked during the build
 */
interface PluginStats {
  overrides: Map<string, string>;
  checked: number;
}

/**
 * Create the Macaques Vite plugin for frontend patching
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { macaquesFrontend } from '@n8n-soar/macaques/frontend';
 *
 * export default defineConfig({
 *   plugins: [
 *     macaquesFrontend({
 *       extensionsDir: './extensions',
 *       n8nDir: './n8n',
 *     }),
 *   ],
 * });
 * ```
 */
export function macaquesFrontend(options: FrontendOptions): Plugin {
  const { extensionsDir, n8nDir, aliasPrefix = '@', verbose = false } = options;

  const frontendExtensionsDir = resolve(extensionsDir, 'frontend');
  const n8nEditorUiSrc = resolve(n8nDir, 'packages', 'frontend', 'editor-ui', 'src');

  let config: ResolvedConfig;
  let manifest: PatchManifest | null = null;
  const stats: PluginStats = {
    overrides: new Map(),
    checked: 0,
  };

  return {
    name: 'macaques-frontend',

    // Run before other plugins to intercept resolution first
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig;

      // Load manifest if exists
      const manifestPath =
        options.manifestPath || resolve(frontendExtensionsDir, 'patches.manifest.json');

      manifest = loadManifest(manifestPath);

      if (manifest) {
        logger.info(`Loaded manifest with ${manifest.patches.length} patches`);
      }

      if (verbose) {
        logger.info(`Extensions dir: ${frontendExtensionsDir}`);
        logger.info(`n8n editor-ui src: ${n8nEditorUiSrc}`);
      }
    },

    /**
     * Intercept module resolution
     *
     * When code imports from '@/...', we check if an override exists
     * in the extensions directory. If so, we redirect to it.
     */
    resolveId(source, importer, resolveOptions) {
      stats.checked++;

      // Handle the main @ alias - check for overrides
      if (source.startsWith(aliasPrefix + '/')) {
        const relativePath = source.slice(aliasPrefix.length + 1);
        const extensionPath = resolve(frontendExtensionsDir, aliasPrefix, relativePath);

        // Check if an override exists
        const overridePath = findFileWithExtensions(extensionPath);

        if (overridePath) {
          // Track this override
          if (!stats.overrides.has(source)) {
            stats.overrides.set(source, overridePath);
            if (verbose) {
              logger.override(source, overridePath);
            }
          }

          return overridePath;
        }
      }

      // Handle @n8n-base alias - always resolve to original n8n code
      if (source.startsWith('@n8n-base/')) {
        const relativePath = source.slice('@n8n-base/'.length);
        const basePath = resolve(n8nEditorUiSrc, relativePath);
        const resolvedPath = findFileWithExtensions(basePath);

        if (resolvedPath) {
          return resolvedPath;
        }

        // If not found, let Vite handle the error
        return null;
      }

      // Let Vite handle other imports normally
      return null;
    },

    /**
     * Validate patches at build start
     */
    buildStart() {
      if (!manifest) return;

      const frontendPatches = manifest.patches.filter(
        (p) => p.type === 'replace' || p.type === 'extend'
      );

      let issues = 0;

      for (const patch of frontendPatches) {
        // Check that the base file exists in n8n
        const basePath = resolve(n8nEditorUiSrc, patch.path.replace(aliasPrefix + '/', ''));
        const baseFile = findFileWithExtensions(basePath);

        if (!baseFile) {
          logger.warn(`Base file not found for patch: ${patch.path}`);
          issues++;
        }

        // Check that the override file exists
        const overridePath = resolve(frontendExtensionsDir, patch.path);
        const overrideFile = findFileWithExtensions(overridePath);

        if (!overrideFile) {
          logger.warn(`Override file not found: ${patch.path}`);
          issues++;
        }
      }

      if (issues > 0) {
        logger.warn(`Found ${issues} potential issues with patches`);
      }
    },

    /**
     * Log summary at build end
     */
    buildEnd() {
      if (stats.overrides.size > 0) {
        logger.success(`Applied ${stats.overrides.size} frontend overrides`);

        if (verbose) {
          for (const [source, target] of stats.overrides) {
            console.log(`  ${source}`);
          }
        }
      }
    },

    /**
     * Handle hot module replacement for extension files
     */
    handleHotUpdate({ file, server }) {
      // If an extension file changed, trigger a reload
      if (file.startsWith(frontendExtensionsDir)) {
        logger.info(`Extension file changed: ${file}`);

        // For Vue files, let Vite handle the HMR normally
        // For other files, we might want to do a full reload
        if (!file.endsWith('.vue')) {
          server.ws.send({
            type: 'full-reload',
            path: '*',
          });
          return [];
        }
      }
    },
  };
}

/**
 * Create Vite aliases for the Macaques system
 *
 * Use this alongside the plugin to set up path aliases:
 *
 * @example
 * ```typescript
 * import { macaquesFrontend, createMacaquesAliases } from '@n8n-soar/macaques/frontend';
 *
 * export default defineConfig({
 *   plugins: [macaquesFrontend(options)],
 *   resolve: {
 *     alias: createMacaquesAliases(options),
 *   },
 * });
 * ```
 */
export function createMacaquesAliases(options: FrontendOptions): Array<{ find: string | RegExp; replacement: string }> {
  const { n8nDir } = options;
  const n8nEditorUiSrc = resolve(n8nDir, 'packages', 'frontend', 'editor-ui', 'src');

  return [
    // @n8n-base always points to original n8n code
    {
      find: '@n8n-base',
      replacement: n8nEditorUiSrc,
    },
  ];
}
